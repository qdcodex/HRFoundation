"use server";

import { Types } from "mongoose";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ActionError, runAction, type ActionResult } from "@/lib/actions";
import { audit } from "@/lib/audit";
import { connectDb } from "@/lib/db/connect";
import { Donation, DonationReceipt, DONATION_METHODS, type DonationStatus, type IDonation } from "@/lib/db/models/finance";
import { PAYMENT_METHOD_LABELS } from "@/lib/db/models/membership";
import { emailDonationReceipt, issueDonationReceipt } from "@/lib/domain/receipts";
import { reserveTxnRef, releaseTxnRef } from "@/lib/domain/txn";
import { formatPaise, parseRupeesToPaise } from "@/lib/money";
import { createReference } from "@/lib/server/submissions";
import { compareDates, parseIsoDate, todayInIndia } from "@/lib/waiting-period";

const objectId = z.string().refine((v) => Types.ObjectId.isValid(v), "Invalid record.");
const isoDate = z.string().refine((v) => parseIsoDate(v) !== null, "Enter a valid date.");
const reason = z.string().trim().min(5, "Please give a reason (at least 5 characters).").max(500);

function refresh(id?: string) {
  revalidatePath("/admin/donations", "layout");
  if (id) revalidatePath(`/admin/donations/${id}`);
  revalidatePath("/admin");
}

/* ---------- Donations ---------- */

const manualMethods = DONATION_METHODS.filter((m) => m !== "gateway") as ["upi", "bank_transfer", "cash", "cheque"];

const donorFields = {
  donorName: z.string().trim().max(120).optional().default(""),
  donorEmail: z.union([z.literal(""), z.email()]).optional().default(""),
  donorPhone: z
    .string()
    .trim()
    .optional()
    .default("")
    .refine((v) => v === "" || /^[6-9]\d{9}$/.test(v.replace(/\D/g, "").slice(-10)), "Enter a valid mobile number."),
  donorAddress: z.string().trim().max(300).optional().default(""),
  purpose: z.string().trim().max(120).optional().default(""),
};

const recordSchema = z
  .object({
    amount: z.string(),
    donatedOn: isoDate,
    method: z.enum(manualMethods),
    transactionRef: z.string().trim().max(64).optional().default(""),
    ...donorFields,
  })
  .refine((d) => d.method === "cash" || d.transactionRef.length >= 4, { message: "A transaction / cheque reference is required for non-cash donations.", path: ["transactionRef"] });

export async function recordDonation(input: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction("donations:manage", recordSchema, input, async (d, admin) => {
    const amountPaise = parseRupeesToPaise(d.amount);
    if (!amountPaise || amountPaise <= 0) throw new ActionError("Enter a valid amount.", { amount: "Enter a valid amount in rupees." });
    if (compareDates(parseIsoDate(d.donatedOn)!, todayInIndia()) > 0) throw new ActionError("Donation date cannot be in the future.", { donatedOn: "In the future." });
    await connectDb();
    const id = new Types.ObjectId();
    await reserveTxnRef(d.method, d.transactionRef || null, "donation", id);
    try {
      const donation = await new Donation({
        _id: id,
        reference: createReference("HRF-D"),
        donorName: d.donorName || undefined,
        donorEmail: d.donorEmail || undefined,
        donorPhone: d.donorPhone ? d.donorPhone.replace(/\D/g, "").slice(-10) : undefined,
        donorAddress: d.donorAddress || undefined,
        purpose: d.purpose || undefined,
        amountPaise,
        donatedOn: d.donatedOn,
        method: d.method,
        transactionRef: d.transactionRef || null,
        status: "verification_pending",
        source: "manual",
        recordedBy: new Types.ObjectId(admin.id),
      }).save();
      const similar = await Donation.countDocuments({ _id: { $ne: id }, amountPaise, donatedOn: d.donatedOn, status: { $nin: ["failed", "cancelled"] } });
      await audit(admin, {
        action: "donations.recorded",
        entityType: "Donation",
        entityId: donation.id,
        summary: `Recorded ${formatPaise(amountPaise)} ${PAYMENT_METHOD_LABELS[d.method]} donation ${donation.reference} (verification pending).`,
      });
      refresh();
      return {
        ok: true,
        message: similar ? `Donation recorded. Note: ${similar} other donation(s) have the same amount and date — check for duplicates during reconciliation.` : "Donation recorded. It must be verified before it counts.",
        data: { id: donation.id },
      };
    } catch (error) {
      await releaseTxnRef(d.method, d.transactionRef || null);
      throw error;
    }
  });
}

const verifySchema = z.object({
  donationId: objectId,
  confirmed: z.literal(true, { message: "Confirm that you found this credit in the bank/UPI statement." }),
  note: z.string().trim().max(500).optional().default(""),
});

export async function verifyDonation(input: unknown) {
  return runAction("donations:manage", verifySchema, input, async (d, admin) => {
    await connectDb();
    const updated = await Donation.findOneAndUpdate(
      { _id: d.donationId, status: { $in: ["pending", "verification_pending"] } },
      { $set: { status: "verified", verifiedBy: new Types.ObjectId(admin.id), verifiedAt: new Date(), reconciliationNote: d.note || "Confirmed against statement." } },
      { returnDocument: "after" },
    ).lean();
    if (!updated) throw new ActionError("This donation is no longer awaiting verification.");
    await audit(admin, { action: "donations.verified", entityType: "Donation", entityId: d.donationId, summary: `Verified ${updated.reference} (${formatPaise(updated.amountPaise)}) against the statement.` });
    refresh(d.donationId);
    return { ok: true, message: "Donation verified." };
  });
}

const statusSchema = z.object({ donationId: objectId, to: z.enum(["failed", "cancelled", "refunded"]), reason });

export async function changeDonationStatus(input: unknown) {
  return runAction("donations:manage", statusSchema, input, async (d, admin) => {
    await connectDb();
    const from: DonationStatus[] = d.to === "refunded" ? ["verified"] : ["pending", "verification_pending"];
    if (d.to === "refunded" && (await DonationReceipt.exists({ donationId: d.donationId, status: "issued" }))) {
      throw new ActionError("Cancel the issued receipt before recording a refund.");
    }
    const updated = await Donation.findOneAndUpdate(
      { _id: d.donationId, status: { $in: from } },
      { $set: { status: d.to, statusReason: d.reason } },
      { returnDocument: "after" },
    ).lean();
    if (!updated) throw new ActionError(d.to === "refunded" ? "Only verified donations can be refunded." : "Only unverified donations can be marked failed or cancelled.");
    if (d.to !== "refunded") await releaseTxnRef(updated.method, updated.transactionRef);
    await audit(admin, { action: `donations.${d.to}`, entityType: "Donation", entityId: d.donationId, summary: `Marked ${updated.reference} as ${d.to}: ${d.reason}` });
    refresh(d.donationId);
    return { ok: true, message: `Donation marked as ${d.to}.` };
  });
}

const donorSchema = z.object({ donationId: objectId, ...donorFields, reason });

export async function updateDonorDetails(input: unknown) {
  return runAction("donations:manage", donorSchema, input, async (d, admin) => {
    await connectDb();
    const before = await Donation.findById(d.donationId).lean<IDonation>();
    if (!before) throw new ActionError("Donation not found.");
    await Donation.updateOne(
      { _id: d.donationId },
      {
        $set: {
          donorName: d.donorName || undefined,
          donorEmail: d.donorEmail || undefined,
          donorPhone: d.donorPhone ? d.donorPhone.replace(/\D/g, "").slice(-10) : undefined,
          donorAddress: d.donorAddress || undefined,
          purpose: d.purpose || undefined,
        },
      },
    );
    const issued = await DonationReceipt.exists({ donationId: d.donationId, status: "issued" });
    await audit(admin, { action: "donations.donor_updated", entityType: "Donation", entityId: d.donationId, summary: `Updated donor details on ${before.reference}: ${d.reason}` });
    refresh(d.donationId);
    return { ok: true, message: issued ? "Donor details updated. The issued receipt is unchanged — cancel and re-issue it if it needs the correction." : "Donor details updated." };
  });
}

/* ---------- Receipts ---------- */

const issueSchema = z.object({ donationId: objectId, sendEmail: z.boolean().default(false) });

export async function issueReceipt(input: unknown) {
  return runAction("receipts:manage", issueSchema, input, async (d, admin) => {
    await connectDb();
    const receipt = await issueDonationReceipt(d.donationId, admin);
    await audit(admin, { action: "receipts.issued", entityType: "DonationReceipt", entityId: receipt.id, summary: `Issued receipt ${receipt.receiptNumber} for ${formatPaise(receipt.amountPaise)}.` });
    const emailed = d.sendEmail ? await emailDonationReceipt(receipt.id) : null;
    refresh(d.donationId);
    return { ok: true, message: `Receipt ${receipt.receiptNumber} issued.${emailed === "sent" ? " Emailed to the donor." : emailed ? " Email not sent (see receipt status)." : ""}` };
  });
}

const cancelSchema = z.object({ receiptId: objectId, reason, reissue: z.boolean().default(false) });

export async function cancelReceipt(input: unknown) {
  return runAction("receipts:manage", cancelSchema, input, async (d, admin) => {
    await connectDb();
    const cancelled = await DonationReceipt.findOneAndUpdate(
      { _id: d.receiptId, status: "issued" },
      { $set: { status: "cancelled", cancelledAt: new Date(), cancelledBy: new Types.ObjectId(admin.id), cancelReason: d.reason } },
      { returnDocument: "after" },
    ).lean();
    if (!cancelled) throw new ActionError("This receipt is not currently issued.");
    await audit(admin, { action: "receipts.cancelled", entityType: "DonationReceipt", entityId: d.receiptId, summary: `Cancelled receipt ${cancelled.receiptNumber}: ${d.reason}` });
    let message = `Receipt ${cancelled.receiptNumber} cancelled.`;
    if (d.reissue) {
      const replacement = await issueDonationReceipt(cancelled.donationId.toString(), admin, cancelled._id);
      await audit(admin, {
        action: "receipts.reissued",
        entityType: "DonationReceipt",
        entityId: replacement.id,
        summary: `Issued corrected receipt ${replacement.receiptNumber} replacing ${cancelled.receiptNumber}.`,
      });
      message = `Receipt ${cancelled.receiptNumber} cancelled and replaced by ${replacement.receiptNumber}.`;
    }
    refresh(cancelled.donationId.toString());
    return { ok: true, message };
  });
}

export async function resendReceiptEmail(input: unknown) {
  return runAction("receipts:manage", z.object({ receiptId: objectId }), input, async (d, admin) => {
    await connectDb();
    const r = await DonationReceipt.findOne({ _id: d.receiptId, status: "issued" }).lean();
    if (!r) throw new ActionError("Only issued receipts can be emailed.");
    if (!r.donorEmail) throw new ActionError("There is no donor email on this receipt.");
    const status = await emailDonationReceipt(d.receiptId);
    await audit(admin, { action: "receipts.emailed", entityType: "DonationReceipt", entityId: d.receiptId, summary: `Receipt ${r.receiptNumber} email: ${status}.` });
    refresh(r.donationId.toString());
    if (status !== "sent") return { ok: false, error: status === "not_configured" ? "Email delivery is not configured." : "The email could not be sent." };
    return { ok: true, message: "Receipt emailed." };
  });
}
