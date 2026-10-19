"use server";

import { Types } from "mongoose";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ActionError, runAction } from "@/lib/actions";
import { audit } from "@/lib/audit";
import { connectDb } from "@/lib/db/connect";
import { nextSequence } from "@/lib/db/models/finance";
import { Member, MembershipPayment, Nominee, NOMINEE_RELATIONSHIPS, PAYMENT_METHODS } from "@/lib/db/models/membership";
import { reserveTxnRef, releaseTxnRef } from "@/lib/domain/txn";
import { formatPaise, parseRupeesToPaise } from "@/lib/money";
import { notify } from "@/lib/notifications";
import { createReference } from "@/lib/server/submissions";
import { loadSettings } from "@/lib/settings";
import { indianMobile } from "@/lib/validation";
import { addMonthsClamped, ageOn, compareDates, formatLong, parseIsoDate, toIso, todayInIndia } from "@/lib/waiting-period";

const objectId = z.string().refine((v) => Types.ObjectId.isValid(v), "Invalid record.");
const isoDate = z.string().refine((v) => parseIsoDate(v) !== null, "Enter a valid date.");
const amount = z.string().transform((v, ctx) => {
  const p = parseRupeesToPaise(v);
  if (p === null || p <= 0) {
    ctx.addIssue({ code: "custom", message: "Enter a valid amount in rupees." });
    return z.NEVER;
  }
  return p;
});
const reason = (min = 5) => z.string().trim().min(min, `Please give a reason (at least ${min} characters).`).max(1000);

function refresh(memberId?: string) {
  revalidatePath("/admin/membership", "layout");
  if (memberId) revalidatePath(`/admin/membership/members/${memberId}`);
  revalidatePath("/admin");
}

function notFuture(iso: string) {
  return compareDates(parseIsoDate(iso)!, todayInIndia()) <= 0;
}

/* ---------------- Payments ---------------- */

const recordPaymentSchema = z.object({
  memberId: objectId,
  amount,
  method: z.enum(PAYMENT_METHODS),
  transactionRef: z.string().trim().max(64).optional().default(""),
  paidOn: isoDate.refine(notFuture, "Payment date cannot be in the future."),
  note: z.string().trim().max(500).optional().default(""),
}).refine((d) => d.method === "cash" || d.transactionRef.length >= 4, {
  message: "A transaction / cheque reference is required for non-cash payments.",
  path: ["transactionRef"],
});

export async function recordMembershipPayment(input: unknown) {
  return runAction("membership:payments", recordPaymentSchema, input, async (d, admin) => {
    await connectDb();
    const member = await Member.findById(d.memberId).lean();
    if (!member) throw new ActionError("Member not found.");
    if (["rejected", "draft"].includes(member.status)) throw new ActionError("Payments cannot be recorded for a rejected or draft application.");

    const paymentId = new Types.ObjectId();
    const key = await reserveTxnRef(d.method, d.transactionRef || null, "membership_payment", paymentId);
    try {
      await MembershipPayment.create({
        _id: paymentId,
        memberId: member._id,
        amountPaise: d.amount,
        method: d.method,
        transactionRef: d.transactionRef || null,
        paidOn: d.paidOn,
        status: "verification_pending",
        recordedBy: new Types.ObjectId(admin.id),
        note: d.note || undefined,
      });
    } catch (error) {
      if (key) await releaseTxnRef(d.method, d.transactionRef);
      throw error;
    }
    await Member.updateOne(
      { _id: member._id, status: "pending_payment" },
      { $set: { status: "payment_verification", statusChangedAt: new Date() } },
    );
    await audit(admin, {
      action: "membership.payment_recorded",
      entityType: "Member",
      entityId: d.memberId,
      summary: `Recorded ${formatPaise(d.amount)} ${d.method} payment for ${member.applicationRef} (verification pending).`,
      details: { paymentId: paymentId.toString(), method: d.method, paidOn: d.paidOn },
    });
    refresh(d.memberId);
    return { ok: true, message: "Payment recorded. It must now be verified." };
  });
}

const verifySchema = z.object({
  paymentId: objectId,
  confirmed: z.literal(true, { message: "Confirm that you checked the credit in the bank/UPI statement." }),
});

export async function verifyMembershipPayment(input: unknown) {
  return runAction("membership:payments", verifySchema, input, async (d, admin) => {
    await connectDb();
    const payment = await MembershipPayment.findOneAndUpdate(
      { _id: d.paymentId, status: "verification_pending" },
      { $set: { status: "verified", verifiedBy: new Types.ObjectId(admin.id), verifiedAt: new Date() } },
      { returnDocument: "after" },
    ).lean();
    if (!payment) throw new ActionError("This payment is no longer awaiting verification (it may already have been processed).");

    const member = await Member.findOneAndUpdate(
      { _id: payment.memberId, status: { $in: ["pending_payment", "payment_verification"] } },
      { $set: { status: "pending_approval", statusChangedAt: new Date() } },
      { returnDocument: "after" },
    ).lean();
    const target = member ?? (await Member.findById(payment.memberId).lean());
    await audit(admin, {
      action: "membership.payment_verified",
      entityType: "Member",
      entityId: payment.memberId.toString(),
      summary: `Verified ${formatPaise(payment.amountPaise)} payment${payment.transactionRef ? ` (${payment.transactionRef})` : ""}.`,
      details: { paymentId: d.paymentId },
    });
    if (target) {
      await notify(
        "payment_verified",
        target.email,
        { name: target.fullName, reference: target.applicationRef, amount: formatPaise(payment.amountPaise) },
        { entity: "Member", id: target._id.toString() },
      );
    }
    refresh(payment.memberId.toString());
    return { ok: true, message: member ? "Payment verified. The application is now pending approval." : "Payment verified." };
  });
}

const rejectPaymentSchema = z.object({ paymentId: objectId, reason: reason() });

export async function rejectMembershipPayment(input: unknown) {
  return runAction("membership:payments", rejectPaymentSchema, input, async (d, admin) => {
    await connectDb();
    const payment = await MembershipPayment.findOneAndUpdate(
      { _id: d.paymentId, status: "verification_pending" },
      { $set: { status: "rejected", rejectionReason: d.reason, verifiedBy: new Types.ObjectId(admin.id), verifiedAt: new Date() } },
      { returnDocument: "after" },
    ).lean();
    if (!payment) throw new ActionError("This payment is no longer awaiting verification.");
    await releaseTxnRef(payment.method, payment.transactionRef);
    const stillPending = await MembershipPayment.exists({ memberId: payment.memberId, status: { $in: ["verification_pending", "verified"] } });
    if (!stillPending) {
      await Member.updateOne({ _id: payment.memberId, status: "payment_verification" }, { $set: { status: "pending_payment", statusChangedAt: new Date() } });
    }
    await audit(admin, {
      action: "membership.payment_rejected",
      entityType: "Member",
      entityId: payment.memberId.toString(),
      summary: `Rejected payment record of ${formatPaise(payment.amountPaise)}: ${d.reason}`,
      details: { paymentId: d.paymentId },
    });
    refresh(payment.memberId.toString());
    return { ok: true, message: "Payment record rejected." };
  });
}

/* ---------------- Application decisions ---------------- */

const decisionSchema = z.discriminatedUnion("decision", [
  z.object({ memberId: objectId, decision: z.literal("approve"), effectiveDate: isoDate, reason: z.string().trim().max(1000).optional().default("") }),
  z.object({ memberId: objectId, decision: z.literal("reject"), reason: reason(10) }),
]);

export async function decideApplication(input: unknown) {
  return runAction("membership:manage", decisionSchema, input, async (d, admin) => {
    await connectDb();
    const rules = await loadSettings("membershipRules");
    const member = await Member.findById(d.memberId).lean();
    if (!member) throw new ActionError("Application not found.");

    if (d.decision === "reject") {
      const updated = await Member.findOneAndUpdate(
        { _id: d.memberId, status: { $in: ["draft", "pending_payment", "payment_verification", "pending_approval"] } },
        { $set: { status: "rejected", statusReason: d.reason, statusChangedAt: new Date() } },
      );
      if (!updated) throw new ActionError("Only applications that are not yet active can be rejected.");
      await audit(admin, { action: "membership.application_rejected", entityType: "Member", entityId: d.memberId, summary: `Rejected application ${member.applicationRef}: ${d.reason}` });
      refresh(d.memberId);
      return { ok: true, message: "Application rejected." };
    }

    // Approve → activate
    if (member.status !== "pending_approval") throw new ActionError("Only applications that are Pending Approval can be activated.");
    const lastVerified = await MembershipPayment.findOne({ memberId: member._id, status: "verified" }).sort({ paidOn: -1 }).lean();
    if (!lastVerified) throw new ActionError("A verified membership payment is required before activation.");
    const today = todayInIndia();
    const eff = parseIsoDate(d.effectiveDate)!;
    if (compareDates(eff, today) > 0) throw new ActionError("The effective date cannot be in the future.", { effectiveDate: "Cannot be in the future." });
    if (compareDates(eff, parseIsoDate(lastVerified.paidOn)!) < 0) {
      throw new ActionError("The effective date cannot be earlier than the verified payment date.", { effectiveDate: `Must be on or after ${lastVerified.paidOn}.` });
    }
    const dob = parseIsoDate(member.dateOfBirth)!;
    if (ageOn(dob, eff) < rules.minApplicantAge) throw new ActionError(`The applicant was under ${rules.minApplicantAge} on the effective date.`);

    const seq = await nextSequence(`membershipId:${eff.year}`);
    const membershipId = `HRF-M-${eff.year}-${String(seq).padStart(5, "0")}`;
    const activated = await Member.findOneAndUpdate(
      { _id: d.memberId, status: "pending_approval", membershipId: null },
      {
        $set: {
          status: "active",
          membershipId,
          effectiveDate: d.effectiveDate,
          activatedAt: new Date(),
          activatedBy: new Types.ObjectId(admin.id),
          statusReason: d.reason || null,
          statusChangedAt: new Date(),
        },
      },
      { returnDocument: "after" },
    ).lean();
    if (!activated) throw new ActionError("This application was already processed by someone else.");

    const waitingEnds = addMonthsClamped(eff, rules.waitingPeriodMonths);
    await audit(admin, {
      action: "membership.activated",
      entityType: "Member",
      entityId: d.memberId,
      summary: `Activated ${member.applicationRef} as ${membershipId}, effective ${d.effectiveDate}.`,
      details: { membershipId, effectiveDate: d.effectiveDate, waitingEnds: toIso(waitingEnds) },
    });
    await notify(
      "membership_activated",
      activated.email,
      { name: activated.fullName, membershipId, effectiveDate: formatLong(eff), waitingEnds: formatLong(waitingEnds) },
      { entity: "Member", id: d.memberId },
    );
    refresh(d.memberId);
    return { ok: true, message: `Membership activated: ${membershipId}.` };
  });
}

const statusSchema = z.object({ memberId: objectId, action: z.enum(["suspend", "reinstate"]), reason: reason(10) });

export async function changeMemberStatus(input: unknown) {
  return runAction("membership:manage", statusSchema, input, async (d, admin) => {
    await connectDb();
    const from = d.action === "suspend" ? "active" : "suspended";
    const to = d.action === "suspend" ? "suspended" : "active";
    const updated = await Member.findOneAndUpdate(
      { _id: d.memberId, status: from },
      { $set: { status: to, statusReason: d.reason, statusChangedAt: new Date() } },
    ).lean();
    if (!updated) throw new ActionError(`Only ${from} memberships can be ${d.action === "suspend" ? "suspended" : "reinstated"}.`);
    await audit(admin, {
      action: `membership.${d.action === "suspend" ? "suspended" : "reinstated"}`,
      entityType: "Member",
      entityId: d.memberId,
      summary: `${d.action === "suspend" ? "Suspended" : "Reinstated"} ${updated.membershipId ?? updated.applicationRef}: ${d.reason}`,
    });
    refresh(d.memberId);
    return { ok: true, message: d.action === "suspend" ? "Membership suspended." : "Membership reinstated." };
  });
}

const reviewSchema = z.object({ memberId: objectId, flag: z.boolean(), reason: z.string().trim().max(500).optional().default("") }).refine(
  (d) => !d.flag || d.reason.length >= 5,
  { message: "Explain why this member needs review.", path: ["reason"] },
);

export async function setReviewFlag(input: unknown) {
  return runAction("membership:manage", reviewSchema, input, async (d, admin) => {
    await connectDb();
    const updated = await Member.findByIdAndUpdate(d.memberId, { $set: { requiresReview: d.flag, reviewReason: d.flag ? d.reason : null } }).lean();
    if (!updated) throw new ActionError("Member not found.");
    await audit(admin, {
      action: d.flag ? "membership.review_flagged" : "membership.review_cleared",
      entityType: "Member",
      entityId: d.memberId,
      summary: d.flag ? `Flagged for review: ${d.reason}` : "Review flag cleared.",
    });
    refresh(d.memberId);
    return { ok: true, message: d.flag ? "Member flagged for review." : "Review flag cleared." };
  });
}

const noteSchema = z.object({ memberId: objectId, text: z.string().trim().min(2, "Write a note.").max(2000) });

export async function addMemberNote(input: unknown) {
  return runAction("membership:manage", noteSchema, input, async (d, admin) => {
    await connectDb();
    const res = await Member.updateOne(
      { _id: d.memberId },
      { $push: { notes: { text: d.text, by: new Types.ObjectId(admin.id), byName: admin.name, at: new Date() } } },
    );
    if (!res.matchedCount) throw new ActionError("Member not found.");
    await audit(admin, { action: "membership.note_added", entityType: "Member", entityId: d.memberId, summary: "Added an internal note." });
    refresh(d.memberId);
    return { ok: true, message: "Note added." };
  });
}

const nomineeSchema = z
  .object({
    memberId: objectId,
    name: z.string().trim().min(3).max(120),
    relationship: z.enum(NOMINEE_RELATIONSHIPS),
    relationshipOther: z.string().trim().max(60).optional().default(""),
    mobile: indianMobile,
    reason: reason(5),
  })
  .refine((d) => d.relationship !== "other" || d.relationshipOther.length >= 2, { message: "Describe the relationship.", path: ["relationshipOther"] });

export async function updateNominee(input: unknown) {
  return runAction("nominees:manage", nomineeSchema, input, async (d, admin) => {
    await connectDb();
    const member = await Member.findById(d.memberId).lean();
    if (!member) throw new ActionError("Member not found.");
    if (d.mobile === member.mobile) throw new ActionError("The nominee's number should differ from the member's.", { mobile: "Same as the member's number." });
    const before = await Nominee.findOne({ memberId: d.memberId }).lean();
    await Nominee.findOneAndUpdate(
      { memberId: d.memberId },
      {
        $set: {
          name: d.name,
          relationship: d.relationship,
          relationshipOther: d.relationship === "other" ? d.relationshipOther : undefined,
          mobile: d.mobile,
          updatedBy: new Types.ObjectId(admin.id),
        },
      },
      { upsert: true },
    );
    await audit(admin, {
      action: "membership.nominee_updated",
      entityType: "Member",
      entityId: d.memberId,
      summary: `Nominee details ${before ? "updated" : "added"}: ${d.reason}`,
      details: { fieldsChanged: ["name", "relationship", "mobile"].filter((f) => !before || JSON.stringify((before as unknown as Record<string, unknown>)[f]) !== JSON.stringify((d as Record<string, unknown>)[f])) },
    });
    refresh(d.memberId);
    return { ok: true, message: "Nominee details saved." };
  });
}

/* ---------------- Paper applications entered by staff ---------------- */

const createSchema = z
  .object({
    fullName: z.string().trim().min(3).max(120),
    dateOfBirth: isoDate,
    mobile: indianMobile,
    email: z.union([z.literal(""), z.email()]).default(""),
    address: z.string().trim().min(10).max(400),
    district: z.string().trim().min(2).max(80),
    pinCode: z.string().trim().regex(/^[1-9]\d{5}$/, "Enter a valid 6-digit PIN code."),
    nomineeName: z.string().trim().min(3).max(120),
    nomineeRelationship: z.enum(NOMINEE_RELATIONSHIPS),
    nomineeRelationshipOther: z.string().trim().max(60).optional().default(""),
    nomineeMobile: indianMobile,
    consentsConfirmed: z.literal(true, { message: "Confirm the signed paper form includes all declarations and consents." }),
  })
  .refine((d) => d.nomineeMobile !== d.mobile, { message: "Nominee's number should differ from the applicant's.", path: ["nomineeMobile"] });

export async function createApplication(input: unknown) {
  return runAction("membership:manage", createSchema, input, async (d, admin) => {
    await connectDb();
    const rules = await loadSettings("membershipRules");
    const age = ageOn(parseIsoDate(d.dateOfBirth)!, todayInIndia());
    if (age < rules.minApplicantAge) throw new ActionError(`Applicants must be at least ${rules.minApplicantAge}.`, { dateOfBirth: "Too young." });
    if (await Member.exists({ mobile: d.mobile, status: { $ne: "rejected" } })) {
      throw new ActionError("An application or membership already exists for this mobile number.", { mobile: "Already registered." });
    }
    const now = new Date();
    const member = await Member.create({
      applicationRef: createReference("HRF-MA"),
      status: "pending_payment",
      fullName: d.fullName,
      dateOfBirth: d.dateOfBirth,
      mobile: d.mobile,
      email: d.email || undefined,
      address: d.address,
      district: d.district,
      pinCode: d.pinCode,
      termsVersion: rules.termsVersion,
      consents: { terms: true, proposedScheme: true, data: true, nominee: true, at: now },
      source: "admin",
      submittedAt: now,
      statusChangedAt: now,
    });
    try {
      await Nominee.create({
        memberId: member._id,
        name: d.nomineeName,
        relationship: d.nomineeRelationship,
        relationshipOther: d.nomineeRelationship === "other" ? d.nomineeRelationshipOther : undefined,
        mobile: d.nomineeMobile,
        updatedBy: new Types.ObjectId(admin.id),
      });
    } catch (error) {
      await Member.deleteOne({ _id: member._id });
      throw error;
    }
    await audit(admin, { action: "membership.application_created", entityType: "Member", entityId: member.id, summary: `Entered paper application ${member.applicationRef}.` });
    refresh();
    return { ok: true, message: `Application ${member.applicationRef} created.`, data: { id: member.id } };
  });
}
