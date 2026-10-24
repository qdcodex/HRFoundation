import { Types } from "mongoose";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { Claim, ClaimDocument } from "@/lib/db/models/claims";
import { CLAIM_DOCUMENT_KINDS, CLAIM_OPEN_FOR_UPLOAD, CLAIM_UPLOAD } from "@/lib/domain/online-claim";
import { getMember } from "@/lib/member-auth/session";
import { notify } from "@/lib/notifications";
import { json, rateLimit, unavailable } from "@/lib/server/submissions";
import { loadSettings } from "@/lib/settings";
import { putFile, UploadError, validateUpload } from "@/lib/storage";

const schema = z.object({
  claimId: z.string().refine((v) => Types.ObjectId.isValid(v), "Invalid claim."),
  kind: z.enum(CLAIM_DOCUMENT_KINDS, { message: "Choose the document type." }),
});

/** Additional claim documents uploaded by the family through the member portal. */
export async function POST(request: Request) {
  try {
    const member = await getMember();
    if (!member || member.portal?.mustChangePassword) return json({ ok: false, message: "Your session has ended. Please sign in again." }, 401);
    const form = await request.formData().catch(() => null);
    if (!form) return json({ ok: false, message: "The form could not be read. Please try again." }, 400);

    const parsed = schema.safeParse({ claimId: form.get("claimId") ?? "", kind: form.get("kind") ?? "" });
    const errors: Record<string, string> = {};
    if (!parsed.success) for (const i of parsed.error.issues) errors[String(i.path[0])] ??= i.message;
    let file: Awaited<ReturnType<typeof validateUpload>> | null = null;
    try {
      file = await validateUpload(form.get("document") as File, CLAIM_UPLOAD);
    } catch (error) {
      errors.document = error instanceof UploadError ? error.message : "Please choose a file.";
    }
    if (!parsed.success || !file || Object.keys(errors).length) return json({ ok: false, message: "Please check the highlighted fields.", errors }, 422);

    if (!(await rateLimit(request, "member-documents", 20, 3600))) return json({ ok: false, message: "Too many uploads. Please try again later." }, 429);
    // The claim must belong to the signed-in member and still be open.
    const claim = await Claim.findOne({ _id: parsed.data.claimId, memberId: member._id, status: { $in: CLAIM_OPEN_FOR_UPLOAD } }).lean();
    if (!claim) return json({ ok: false, message: "Documents can no longer be added to this claim. Please contact the foundation." }, 409);
    if ((await ClaimDocument.countDocuments({ claimId: claim._id })) >= 20) {
      return json({ ok: false, message: "This claim already has many documents. Please contact the foundation." }, 409);
    }

    const fileId = await putFile("private_files", { bytes: file.bytes, filename: file.filename, mime: file.mime, metadata: { kind: parsed.data.kind, source: "member portal" } });
    await ClaimDocument.create({
      claimId: claim._id,
      fileId,
      kind: parsed.data.kind,
      originalName: file.filename,
      mime: file.mime,
      size: file.size,
      sha256: file.sha256,
      uploadedBy: null,
      uploadedByName: `${claim.claimant.name} (family, member portal)`,
    });
    await audit(
      { id: null, name: `Member portal (${member.membershipId})` },
      { action: "claims.document_uploaded_online", entityType: "Claim", entityId: claim._id.toString(), summary: `Family uploaded "${parsed.data.kind}" for claim ${claim.reference}.` },
    );
    const inbox = (await loadSettings("website")).enquiryInbox || process.env.FORM_TO_EMAIL;
    await notify("claim_document_uploaded", inbox, { reference: claim.reference, membershipId: claim.membershipId, kind: parsed.data.kind }, { entity: "Claim", id: claim._id.toString() });
    return json({ ok: true, reference: claim.reference });
  } catch (error) {
    console.error("[api/member/documents]", error instanceof Error ? error.message : error);
    return unavailable();
  }
}
