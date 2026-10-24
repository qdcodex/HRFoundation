import "server-only";
import { audit } from "@/lib/audit";
import { isDuplicateKey } from "@/lib/actions";
import { Claim, ClaimDocument, type ClaimStatus } from "@/lib/db/models/claims";
import type { IMember, INominee } from "@/lib/db/models/membership";
import { adminInbox, notify } from "@/lib/notifications";
import { createReference } from "@/lib/server/submissions";
import { deleteFile, putFile, type validateUpload } from "@/lib/storage";

export type CheckedUpload = Awaited<ReturnType<typeof validateUpload>>;

export const CLAIM_UPLOAD = { allowed: ["application/pdf", "image/jpeg", "image/png"], maxBytes: 10 * 1024 * 1024 };

/** Statuses in which the family can still add documents to a claim. */
export const CLAIM_OPEN_FOR_UPLOAD: ClaimStatus[] = ["submitted", "under_review", "info_required"];

export const CLAIM_DOCUMENT_KINDS = ["Death certificate", "Document requested by the foundation"] as const;

/**
 * Files a nominee's claim with the death certificate (public form or member portal).
 * Never approves or pays anything: it only records the claim for staff to verify.
 */
export async function fileOnlineClaim(opts: {
  member: Pick<IMember, "_id" | "membershipId" | "fullName">;
  nominee: Pick<INominee, "relationship" | "relationshipOther" | "mobile">;
  claimantName: string;
  claimantEmail: string;
  dateOfDeath: string;
  file: CheckedUpload;
  channel: "public form" | "member portal";
}): Promise<{ ok: true; reference: string; id: string } | { ok: false; conflict: true }> {
  const { member, nominee, file } = opts;
  const fileId = await putFile("private_files", { bytes: file.bytes, filename: file.filename, mime: file.mime, metadata: { kind: "Death certificate", source: opts.channel } });
  let claim;
  try {
    claim = await new Claim({
      reference: createReference("HRF-CL"),
      memberId: member._id,
      membershipId: member.membershipId,
      memberName: member.fullName,
      claimant: {
        name: opts.claimantName,
        relationship: nominee.relationship === "other" ? (nominee.relationshipOther ?? "Other") : nominee.relationship,
        mobile: nominee.mobile,
        email: opts.claimantEmail || null,
        isNominee: true,
      },
      dateOfDeath: opts.dateOfDeath,
      receivedVia: "online",
      submittedAt: new Date(),
      status: "submitted",
      createdBy: null,
    }).save();
  } catch (error) {
    await deleteFile("private_files", fileId);
    if (isDuplicateKey(error)) return { ok: false, conflict: true };
    throw error;
  }
  await ClaimDocument.create({
    claimId: claim._id,
    fileId,
    kind: "Death certificate",
    originalName: file.filename,
    mime: file.mime,
    size: file.size,
    sha256: file.sha256,
    uploadedBy: null,
    uploadedByName: `${opts.claimantName} (nominee, ${opts.channel})`,
  });

  await audit(
    { id: null, name: opts.channel === "member portal" ? `Member portal (${member.membershipId})` : "Public website (nominee)" },
    { action: "claims.submitted_online", entityType: "Claim", entityId: claim.id, summary: `Nominee submitted claim ${claim.reference} for ${member.membershipId} via the ${opts.channel}, with a death certificate.` },
  );
  const inbox = await adminInbox();
  await notify("claim_submitted", inbox, { reference: claim.reference, membershipId: member.membershipId ?? "", name: member.fullName }, { entity: "Claim", id: claim.id });
  return { ok: true, reference: claim.reference, id: claim.id };
}
