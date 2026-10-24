import "server-only";
import { Types } from "mongoose";
import { audit } from "@/lib/audit";
import { connectDb } from "@/lib/db/connect";
import { Donation, GatewayOrder, type IGatewayOrder } from "@/lib/db/models/finance";
import { Member, MembershipPayment } from "@/lib/db/models/membership";
import { reserveTxnRef } from "@/lib/domain/txn";
import { formatPaise } from "@/lib/money";
import { notify } from "@/lib/notifications";
import { createReference } from "@/lib/server/submissions";
import { toIso, todayInIndia } from "@/lib/waiting-period";
import { capturePayment, fetchPayment, RazorpayError } from "./razorpay";

const RAZORPAY = { id: null, name: "Razorpay (online payment)" } as const;

export type SettleResult = { ok: true; kind: IGatewayOrder["kind"]; reference: string | null } | { ok: false; message: string };

/**
 * Confirms a Razorpay payment for one of our orders and records it — exactly once, whether called from
 * the checkout handler, the webhook, or both at the same time.
 *
 * The payment is always re-read from Razorpay's API (never trusted from the browser): it must belong
 * to the order, be for the full amount, and be captured (an authorised payment is captured here).
 */
export async function settleRazorpayPayment(orderId: string, paymentId: string): Promise<SettleResult> {
  await connectDb();
  const order = await GatewayOrder.findOne({ orderId }).lean();
  if (!order) return { ok: false, message: "Unknown order." };
  if (order.status === "paid") return { ok: true, kind: order.kind, reference: order.resultReference ?? null };

  let payment;
  try {
    payment = await fetchPayment(paymentId);
    if (payment.order_id !== orderId || payment.amount !== order.amountPaise || payment.currency !== "INR") {
      return { ok: false, message: "The payment does not match this order." };
    }
    if (payment.status === "authorized") payment = await capturePayment(paymentId, order.amountPaise);
    if (payment.status !== "captured") return { ok: false, message: "The payment has not been completed." };
  } catch (error) {
    const message = error instanceof RazorpayError ? error.message : "Could not confirm the payment with Razorpay.";
    console.error("[razorpay settle]", orderId, message);
    return { ok: false, message: "We could not confirm the payment yet. If money was debited, it will be confirmed automatically shortly." };
  }

  // Claim the order atomically; only one caller records the payment.
  const claimed = await GatewayOrder.findOneAndUpdate(
    { _id: order._id, status: "created" },
    { $set: { status: "paid", paymentId, paidAt: new Date() } },
    { returnDocument: "after" },
  ).lean();
  if (!claimed) {
    const now = await GatewayOrder.findById(order._id).lean();
    return { ok: true, kind: order.kind, reference: now?.resultReference ?? null };
  }

  try {
    const result = order.kind === "donation" ? await recordDonation(claimed, paymentId, payment.method) : await recordMembershipPayment(claimed, paymentId);
    await GatewayOrder.updateOne({ _id: order._id }, { $set: { resultId: result.id, resultReference: result.reference } });
    return { ok: true, kind: order.kind, reference: result.reference };
  } catch (error) {
    // The money is received; flag the order so staff can record it by hand.
    const message = error instanceof Error ? error.message : String(error);
    console.error("[razorpay record]", orderId, message);
    await GatewayOrder.updateOne({ _id: order._id }, { $set: { error: `Paid, but recording failed: ${message}`.slice(0, 500) } });
    await audit(RAZORPAY, { action: "payments.record_failed", entityType: "GatewayOrder", entityId: order._id.toString(), summary: `Payment ${paymentId} for order ${orderId} was captured but could not be recorded automatically: ${message}` });
    return { ok: true, kind: order.kind, reference: null };
  }
}

async function recordDonation(order: IGatewayOrder, paymentId: string, method?: string) {
  const id = new Types.ObjectId();
  await reserveTxnRef("gateway", paymentId, "donation", id);
  const donor = order.donor ?? { name: "" };
  const donation = await new Donation({
    _id: id,
    reference: createReference("HRF-D"),
    donorName: donor.name || undefined,
    donorEmail: donor.email || undefined,
    donorPhone: donor.phone || undefined,
    purpose: donor.purpose || undefined,
    amountPaise: order.amountPaise,
    donatedOn: toIso(todayInIndia()),
    method: "gateway",
    transactionRef: paymentId,
    status: "verified",
    source: "gateway",
    recordedBy: null,
    verifiedAt: new Date(),
    reconciliationNote: `Captured by Razorpay${method ? ` (${method})` : ""}: payment ${paymentId}, order ${order.orderId}. Settlement to the bank appears in the Razorpay Dashboard.`,
  }).save();
  await audit(RAZORPAY, {
    action: "donations.received_online",
    entityType: "Donation",
    entityId: donation.id,
    summary: `Online donation ${donation.reference} of ${formatPaise(order.amountPaise)} received via Razorpay (${paymentId}).`,
  });
  await notify(
    "donation_received",
    donor.email,
    { name: donor.name || "Friend", amount: formatPaise(order.amountPaise), reference: donation.reference, paymentId },
    { entity: "Donation", id: donation.id },
  );
  return { id, reference: donation.reference };
}

async function recordMembershipPayment(order: IGatewayOrder, paymentId: string) {
  const member = await Member.findById(order.memberId).lean();
  if (!member) throw new Error("Member not found");
  const id = new Types.ObjectId();
  await reserveTxnRef("gateway", paymentId, "membership_payment", id);
  await MembershipPayment.create({
    _id: id,
    memberId: member._id,
    amountPaise: order.amountPaise,
    method: "gateway",
    transactionRef: paymentId,
    paidOn: toIso(todayInIndia()),
    status: "verified",
    recordedBy: null,
    verifiedAt: new Date(),
    note: `Paid online via Razorpay (order ${order.orderId}).`,
  });
  const moved = await Member.findOneAndUpdate(
    { _id: member._id, status: { $in: ["pending_payment", "payment_verification"] } },
    { $set: { status: "pending_approval", statusChangedAt: new Date() } },
  ).lean();
  await audit(RAZORPAY, {
    action: "membership.payment_received_online",
    entityType: "Member",
    entityId: member._id.toString(),
    summary: `Membership fee ${formatPaise(order.amountPaise)} paid online for ${member.applicationRef} via Razorpay (${paymentId})${moved ? "; application is now pending approval" : ""}.`,
  });
  await notify(
    "payment_verified",
    member.email,
    { name: member.fullName, reference: member.applicationRef, amount: formatPaise(order.amountPaise) },
    { entity: "Member", id: member._id.toString() },
  );
  return { id, reference: member.applicationRef };
}
