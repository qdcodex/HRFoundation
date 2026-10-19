"use server";

import { Types } from "mongoose";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ActionError, isDuplicateKey, runAction, type ActionResult } from "@/lib/actions";
import { audit } from "@/lib/audit";
import { authorize, AuthError } from "@/lib/auth/dal";
import { permissionsFor } from "@/lib/auth/permissions";
import { connectDb } from "@/lib/db/connect";
import { AdminUser } from "@/lib/db/models/auth";
import { Claim, ClaimDocument, CLAIM_STATUS_LABELS, type IClaim } from "@/lib/db/models/claims";
import { Member, MembershipPayment, Nominee } from "@/lib/db/models/membership";
import { evaluateClaimEligibility } from "@/lib/domain/eligibility";
import { formatPaise, parseRupeesToPaise } from "@/lib/money";
import { notify } from "@/lib/notifications";
import { createReference } from "@/lib/server/submissions";
import { loadSettings } from "@/lib/settings";
import { putFile, UploadError, validateUpload } from "@/lib/storage";
import { indianMobile } from "@/lib/validation";
import { compareDates, parseIsoDate, todayInIndia } from "@/lib/waiting-period";

const objectId = z.string().refine((v) => Types.ObjectId.isValid(v), "Invalid record.");
const isoDate = z.string().refine((v) => parseIsoDate(v) !== null, "Enter a valid date.");
const optionalAmount = z
  .string()
  .optional()
  .default("")
  .transform((v, ctx) => {
    if (!v.trim()) return null;
    const p = parseRupeesToPaise(v);
    if (p === null || p <= 0) {
      ctx.addIssue({ code: "custom", message: "Enter a valid amount in rupees." });
      return z.NEVER;
    }
    return p;
  });

function refresh(id?: string) {
  revalidatePath("/admin/claims", "layout");
  if (id) revalidatePath(`/admin/claims/${id}`);
  revalidatePath("/admin");
}

async function transition(id: string, from: string[], set: Record<string, unknown>, push?: Record<string, unknown>) {
  const filter: Record<string, unknown> = { _id: id, status: { $in: from } };
  const update: Record<string, unknown> = { $set: set, ...(push ? { $push: push } : {}) };
  const updated = await Claim.findOneAndUpdate(filter, update, { returnDocument: "after" }).lean<IClaim>();
  if (!updated) throw new ActionError(`This claim is not in a state that allows this action (expected: ${from.map((s) => CLAIM_STATUS_LABELS[s as keyof typeof CLAIM_STATUS_LABELS]).join(" / ")}).`);
  return updated;
}

/* ---------- Create ---------- */

const createSchema = z.object({
  membershipId: z.string().trim().min(5, "Enter the membership ID.").max(30),
  dateOfDeath: isoDate,
  receivedVia: z.enum(["in_person", "post", "email", "phone"]),
  useNominee: z.boolean(),
  claimantName: z.string().trim().max(120).optional().default(""),
  claimantRelationship: z.string().trim().max(60).optional().default(""),
  claimantMobile: z.union([z.literal(""), indianMobile]).optional().default(""),
  claimantEmail: z.union([z.literal(""), z.email()]).optional().default(""),
  requestedAmount: optionalAmount,
});

export async function createClaim(input: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction("claims:review", createSchema, input, async (d, admin) => {
    await connectDb();
    const member = await Member.findOne({ membershipId: d.membershipId.toUpperCase() }).lean();
    if (!member) throw new ActionError("No activated membership has this ID.", { membershipId: "Not found." });
    const dod = parseIsoDate(d.dateOfDeath)!;
    if (compareDates(dod, todayInIndia()) > 0) throw new ActionError("Date of death cannot be in the future.", { dateOfDeath: "In the future." });
    if (compareDates(dod, parseIsoDate(member.dateOfBirth)!) < 0) throw new ActionError("Date of death is before the date of birth.", { dateOfDeath: "Invalid." });

    let claimant: { name: string; relationship: string; mobile: string; email: string | null; isNominee: boolean };
    if (d.useNominee) {
      const nominee = await Nominee.findOne({ memberId: member._id }).lean();
      if (!nominee) throw new ActionError("This member has no nominee on record. Enter the claimant's details instead.");
      claimant = {
        name: nominee.name,
        relationship: nominee.relationship === "other" ? (nominee.relationshipOther ?? "Other") : nominee.relationship,
        mobile: nominee.mobile,
        email: d.claimantEmail || null,
        isNominee: true,
      };
    } else {
      const fe: Record<string, string> = {};
      if (d.claimantName.length < 3) fe.claimantName = "Enter the claimant's name.";
      if (d.claimantRelationship.length < 2) fe.claimantRelationship = "Enter the relationship.";
      if (!d.claimantMobile) fe.claimantMobile = "Enter a valid mobile number.";
      if (Object.keys(fe).length) throw new ActionError("Please complete the claimant's details.", fe);
      claimant = { name: d.claimantName, relationship: d.claimantRelationship, mobile: d.claimantMobile, email: d.claimantEmail || null, isNominee: false };
    }

    try {
      const claim = await new Claim({
        reference: createReference("HRF-CL"),
        memberId: member._id,
        membershipId: member.membershipId,
        memberName: member.fullName,
        claimant,
        dateOfDeath: d.dateOfDeath,
        receivedVia: d.receivedVia,
        submittedAt: new Date(),
        requestedAmountPaise: d.requestedAmount,
        status: "submitted",
        createdBy: new Types.ObjectId(admin.id),
      }).save();
      await audit(admin, {
        action: "claims.created",
        entityType: "Claim",
        entityId: claim.id,
        summary: `Recorded claim ${claim.reference} for ${member.membershipId}${claimant.isNominee ? " (by nominee)" : " (claimant is not the nominee)"}.`,
      });
      refresh();
      return { ok: true, message: `Claim ${claim.reference} recorded.`, data: { id: claim.id } };
    } catch (error) {
      if (isDuplicateKey(error)) throw new ActionError("This member already has an open claim.");
      throw error;
    }
  });
}

/* ---------- Review workflow ---------- */

const idOnly = z.object({ claimId: objectId });

export async function startReview(input: unknown) {
  return runAction("claims:review", idOnly, input, async (d, admin) => {
    await connectDb();
    const c = await transition(d.claimId, ["submitted"], { status: "under_review", assignedTo: new Types.ObjectId(admin.id), assignedToName: admin.name });
    await audit(admin, { action: "claims.review_started", entityType: "Claim", entityId: d.claimId, summary: `Started review of ${c.reference}.` });
    refresh(d.claimId);
    return { ok: true, message: "Review started and assigned to you." };
  });
}

const assignSchema = z.object({ claimId: objectId, userId: objectId });

export async function assignClaim(input: unknown) {
  return runAction("claims:review", assignSchema, input, async (d, admin) => {
    await connectDb();
    const user = await AdminUser.findOne({ _id: d.userId, active: true }).lean();
    if (!user || !permissionsFor(user.roles, user.extraPermissions).has("claims:review")) throw new ActionError("That user cannot review claims.");
    const c = await Claim.findOneAndUpdate(
      { _id: d.claimId, status: { $nin: ["closed", "paid"] } },
      { $set: { assignedTo: user._id, assignedToName: user.name } },
    ).lean();
    if (!c) throw new ActionError("This claim can no longer be reassigned.");
    await audit(admin, { action: "claims.assigned", entityType: "Claim", entityId: d.claimId, summary: `Assigned ${c.reference} to ${user.name}.` });
    refresh(d.claimId);
    return { ok: true, message: `Assigned to ${user.name}.` };
  });
}

const noteSchema = z.object({ claimId: objectId, text: z.string().trim().min(3, "Write a note.").max(2000) });

export async function addVerificationNote(input: unknown) {
  return runAction("claims:review", noteSchema, input, async (d, admin) => {
    await connectDb();
    const res = await Claim.updateOne(
      { _id: d.claimId, status: { $nin: ["closed"] } },
      { $push: { verificationNotes: { text: d.text, by: new Types.ObjectId(admin.id), byName: admin.name, at: new Date() } } },
    );
    if (!res.matchedCount) throw new ActionError("Notes cannot be added to a closed claim.");
    await audit(admin, { action: "claims.note_added", entityType: "Claim", entityId: d.claimId, summary: "Added a verification note." });
    refresh(d.claimId);
    return { ok: true, message: "Verification note added." };
  });
}

const infoSchema = z.object({ claimId: objectId, message: z.string().trim().min(10, "Describe what is needed (at least 10 characters).").max(1000) });

export async function requestInformation(input: unknown) {
  return runAction("claims:review", infoSchema, input, async (d, admin) => {
    await connectDb();
    const c = await transition(d.claimId, ["submitted", "under_review"], { status: "info_required" }, {
      infoRequests: { message: d.message, requestedBy: new Types.ObjectId(admin.id), requestedByName: admin.name, at: new Date() },
    });
    await audit(admin, { action: "claims.info_requested", entityType: "Claim", entityId: d.claimId, summary: `Requested additional information for ${c.reference}.` });
    await notify("claim_info_requested", c.claimant.email, { name: c.claimant.name, reference: c.reference, message: d.message }, { entity: "Claim", id: d.claimId });
    refresh(d.claimId);
    return { ok: true, message: c.claimant.email ? "Information requested; the claimant has been notified." : "Information requested. No claimant email is on record — contact them by phone." };
  });
}

const resolveSchema = z.object({ claimId: objectId, note: z.string().trim().min(5, "Describe what was received.").max(1000) });

export async function resolveInformation(input: unknown) {
  return runAction("claims:review", resolveSchema, input, async (d, admin) => {
    await connectDb();
    const claim = await Claim.findById(d.claimId).lean();
    if (!claim || claim.status !== "info_required") throw new ActionError("This claim is not waiting for information.");
    const open = claim.infoRequests.filter((r) => !r.resolvedAt);
    const res = await Claim.updateOne(
      { _id: d.claimId, status: "info_required" },
      {
        $set: {
          status: "under_review",
          ...Object.fromEntries(claim.infoRequests.map((r, i) => (!r.resolvedAt ? [[`infoRequests.${i}.resolvedAt`, new Date()], [`infoRequests.${i}.resolutionNote`, d.note]] : [])).flat()),
        },
      },
    );
    if (!res.modifiedCount) throw new ActionError("This claim was updated by someone else. Reload and try again.");
    await audit(admin, { action: "claims.info_received", entityType: "Claim", entityId: d.claimId, summary: `Recorded receipt of requested information (${open.length} request(s)); back under review.` });
    refresh(d.claimId);
    return { ok: true, message: "Information recorded. The claim is back under review." };
  });
}

const recommendSchema = z.object({ claimId: objectId, outcome: z.enum(["approve", "reject"]), note: z.string().trim().min(10, "Explain the recommendation (at least 10 characters).").max(2000) });

export async function recordRecommendation(input: unknown) {
  return runAction("claims:review", recommendSchema, input, async (d, admin) => {
    await connectDb();
    const c = await transition(d.claimId, ["under_review"], {
      recommendation: { outcome: d.outcome, note: d.note, by: new Types.ObjectId(admin.id), byName: admin.name, at: new Date() },
    });
    await audit(admin, { action: "claims.recommended", entityType: "Claim", entityId: d.claimId, summary: `Recommended ${d.outcome === "approve" ? "approval" : "rejection"} of ${c.reference}.` });
    refresh(d.claimId);
    return { ok: true, message: "Recommendation recorded. An authorised decision is still required." };
  });
}

const decisionSchema = z.discriminatedUnion("outcome", [
  z.object({ claimId: objectId, outcome: z.literal("approved"), reason: z.string().trim().min(10, "Record the basis for approval (at least 10 characters).").max(2000), approvedAmount: z.string() }),
  z.object({ claimId: objectId, outcome: z.literal("rejected"), reason: z.string().trim().min(10, "A reason is required for rejection (at least 10 characters).").max(2000) }),
]);

/**
 * Records the authorised decision. Eligibility is recomputed on the server at decision time and stored
 * with the decision; approval is refused unless every check passes. Nothing is approved automatically.
 */
export async function decideClaim(input: unknown) {
  return runAction("claims:decide", decisionSchema, input, async (d, admin) => {
    await connectDb();
    const rules = await loadSettings("membershipRules");
    const claim = await Claim.findById(d.claimId).lean();
    if (!claim) throw new ActionError("Claim not found.");
    if (claim.status !== "under_review") throw new ActionError("A decision can only be recorded while the claim is Under Review.");
    const member = await Member.findById(claim.memberId).lean();
    if (!member) throw new ActionError("The member record is missing.");
    const verifiedPaymentCount = await MembershipPayment.countDocuments({ memberId: member._id, status: "verified" });
    const eligibility = evaluateClaimEligibility({ ...member, verifiedPaymentCount }, claim.dateOfDeath, rules);

    let approvedAmountPaise: number | null = null;
    if (d.outcome === "approved") {
      const failed = eligibility.filter((c) => !c.passed);
      if (failed.length) throw new ActionError(`Approval blocked — these conditions are not met: ${failed.map((f) => f.label).join("; ")}.`);
      const amount = parseRupeesToPaise(d.approvedAmount);
      if (amount === null || amount <= 0) throw new ActionError("Enter the approved amount.", { approvedAmount: "Enter a valid amount." });
      if (amount > rules.maxBenefitPaise) {
        throw new ActionError(`The approved amount cannot exceed the approved limit of ${formatPaise(rules.maxBenefitPaise)}.`, { approvedAmount: `Maximum ${formatPaise(rules.maxBenefitPaise)}.` });
      }
      approvedAmountPaise = amount;
    }

    const c = await transition(d.claimId, ["under_review"], {
      status: d.outcome,
      decision: {
        outcome: d.outcome,
        reason: d.reason,
        approvedAmountPaise,
        maxAllowedPaise: rules.maxBenefitPaise,
        eligibility,
        by: new Types.ObjectId(admin.id),
        byName: admin.name,
        at: new Date(),
      },
    });
    await audit(admin, {
      action: d.outcome === "approved" ? "claims.approved" : "claims.rejected",
      entityType: "Claim",
      entityId: d.claimId,
      summary: d.outcome === "approved" ? `Approved ${c.reference} for ${formatPaise(approvedAmountPaise)}.` : `Rejected ${c.reference}: ${d.reason}`,
      details: { eligibility: eligibility.map((e) => `${e.passed ? "PASS" : "FAIL"} ${e.label}`) },
    });
    await notify("claim_decision", c.claimant.email, { name: c.claimant.name, reference: c.reference, outcome: d.outcome === "approved" ? "approved" : "not approved" }, { entity: "Claim", id: d.claimId });
    refresh(d.claimId);
    return { ok: true, message: d.outcome === "approved" ? "Approval recorded. Payment must be recorded separately by Finance." : "Rejection recorded." };
  });
}

export async function markPaymentPending(input: unknown) {
  return runAction("claims:payments", idOnly, input, async (d, admin) => {
    await connectDb();
    const c = await transition(d.claimId, ["approved"], { status: "payment_pending" });
    await audit(admin, { action: "claims.payment_pending", entityType: "Claim", entityId: d.claimId, summary: `Payment initiated for ${c.reference}.` });
    refresh(d.claimId);
    return { ok: true, message: "Marked as payment pending." };
  });
}

const paymentSchema = z.object({
  claimId: objectId,
  reference: z.string().trim().min(4, "Enter the bank / UTR reference.").max(64),
  paidOn: isoDate,
  method: z.enum(["bank_transfer", "cheque", "upi"]),
  amount: z.string(),
});

/** Records a payment made OUTSIDE this system (bank transfer/cheque). No money is moved by the dashboard. */
export async function recordClaimPayment(input: unknown) {
  return runAction("claims:payments", paymentSchema, input, async (d, admin) => {
    await connectDb();
    const claim = await Claim.findById(d.claimId).lean();
    if (!claim?.decision || claim.decision.outcome !== "approved") throw new ActionError("Only approved claims can be paid.");
    const amount = parseRupeesToPaise(d.amount);
    if (amount !== claim.decision.approvedAmountPaise) {
      throw new ActionError(`The paid amount must equal the approved amount (${formatPaise(claim.decision.approvedAmountPaise)}).`, { amount: "Must match the approved amount." });
    }
    if (compareDates(parseIsoDate(d.paidOn)!, todayInIndia()) > 0) throw new ActionError("Payment date cannot be in the future.", { paidOn: "In the future." });
    const c = await transition(d.claimId, ["approved", "payment_pending"], {
      status: "paid",
      payment: { reference: d.reference, paidOn: d.paidOn, method: d.method, amountPaise: amount, recordedBy: new Types.ObjectId(admin.id), recordedByName: admin.name, at: new Date() },
    });
    await audit(admin, { action: "claims.paid", entityType: "Claim", entityId: d.claimId, summary: `Recorded payment of ${formatPaise(amount)} for ${c.reference} (ref ${d.reference}).` });
    refresh(d.claimId);
    return { ok: true, message: "Payment recorded." };
  });
}

const closeSchema = z.object({ claimId: objectId, reason: z.string().trim().min(5, "Give a closing note.").max(1000) });

export async function closeClaim(input: unknown) {
  return runAction("claims:review", closeSchema, input, async (d, admin) => {
    await connectDb();
    const c = await transition(d.claimId, ["rejected", "paid"], { status: "closed", closedReason: d.reason });
    await audit(admin, { action: "claims.closed", entityType: "Claim", entityId: d.claimId, summary: `Closed ${c.reference}: ${d.reason}` });
    refresh(d.claimId);
    return { ok: true, message: "Claim closed." };
  });
}

/* ---------- Documents ---------- */

const DOC_KINDS = ["Death certificate", "Claimant identity proof", "Relationship proof", "Bank details", "Other"] as const;

export async function uploadClaimDocument(form: FormData): Promise<ActionResult> {
  try {
    const admin = await authorize("claims:review");
    if (!admin.permissions.includes("claims:documents")) throw new AuthError("You do not have permission to handle claim documents.", 403);
    const claimId = String(form.get("claimId") ?? "");
    const kind = String(form.get("kind") ?? "");
    if (!Types.ObjectId.isValid(claimId)) return { ok: false, error: "Invalid claim." };
    if (!DOC_KINDS.includes(kind as (typeof DOC_KINDS)[number])) return { ok: false, error: "Choose a document type.", fieldErrors: { kind: "Required." } };
    await connectDb();
    const claim = await Claim.findById(claimId).select("reference status").lean();
    if (!claim || claim.status === "closed") return { ok: false, error: "Documents cannot be added to this claim." };
    const file = await validateUpload(form.get("file") as File, { allowed: ["application/pdf", "image/jpeg", "image/png"], maxBytes: 10 * 1024 * 1024 });
    const fileId = await putFile("private_files", { bytes: file.bytes, filename: file.filename, mime: file.mime, metadata: { claimId, kind } });
    await ClaimDocument.create({
      claimId,
      fileId,
      kind,
      originalName: file.filename,
      mime: file.mime,
      size: file.size,
      sha256: file.sha256,
      uploadedBy: new Types.ObjectId(admin.id),
      uploadedByName: admin.name,
    });
    await audit(admin, { action: "claims.document_uploaded", entityType: "Claim", entityId: claimId, summary: `Uploaded “${kind}” to ${claim.reference}.`, details: { sha256: file.sha256, size: file.size } });
    refresh(claimId);
    return { ok: true, message: "Document uploaded securely." };
  } catch (error) {
    if (error instanceof UploadError) return { ok: false, error: error.message, fieldErrors: { file: error.message } };
    if (error instanceof AuthError) return { ok: false, error: error.message };
    console.error("[claim upload]", error);
    return { ok: false, error: "The document could not be uploaded." };
  }
}
