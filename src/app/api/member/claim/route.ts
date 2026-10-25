import { z } from "zod";
import { Nominee } from "@/lib/db/models/membership";
import { CLAIM_UPLOAD, fileOnlineClaim } from "@/lib/domain/online-claim";
import { getMember } from "@/lib/member-auth/session";
import { json, rateLimit, unavailable } from "@/lib/server/submissions";
import { loadSettings } from "@/lib/settings";
import { UploadError, validateUpload } from "@/lib/storage";
import { compareDates, parseIsoDate, todayInIndia } from "@/lib/waiting-period";

/** Claim submitted by the family while signed in to the member portal with the member's login. */
const schema = z.object({
  claimantName: z.string().trim().min(3, "Enter your full name.").max(120),
  claimantEmail: z.union([z.literal(""), z.email("Enter a valid email address, or leave this blank.")]).default(""),
  dateOfDeath: z.string().refine((v) => parseIsoDate(v) !== null, "Enter a valid date."),
  consent: z.literal("on", { message: "Please confirm the declaration." }),
});

export async function POST(request: Request) {
  try {
    const member = await getMember();
    if (!member || member.portal?.mustChangePassword) return json({ ok: false, message: "Your session has ended. Please sign in again." }, 401);
    const form = await request.formData().catch(() => null);
    if (!form) return json({ ok: false, message: "The form could not be read. Please try again." }, 400);

    const parsed = schema.safeParse({
      claimantName: form.get("claimantName") ?? "",
      claimantEmail: form.get("claimantEmail") ?? "",
      dateOfDeath: form.get("dateOfDeath") ?? "",
      consent: form.get("consent") ?? "",
    });
    const errors: Record<string, string> = {};
    if (!parsed.success) for (const i of parsed.error.issues) errors[String(i.path[0])] ??= i.message;
    if (parsed.success) {
      const dod = parseIsoDate(parsed.data.dateOfDeath)!;
      if (compareDates(dod, todayInIndia()) > 0) errors.dateOfDeath = "The date cannot be in the future.";
      else if (compareDates(dod, parseIsoDate(member.dateOfBirth)!) < 0) errors.dateOfDeath = "Please check this date.";
    }
    let file: Awaited<ReturnType<typeof validateUpload>> | null = null;
    try {
      file = await validateUpload(form.get("certificate") as File, CLAIM_UPLOAD);
    } catch (error) {
      errors.certificate = error instanceof UploadError ? error.message : "Please attach the death certificate.";
    }
    if (!parsed.success || !file || Object.keys(errors).length) return json({ ok: false, message: "Please check the highlighted fields.", errors }, 422);

    if (!(await rateLimit(request, "member-claims", 5, 3600))) return json({ ok: false, message: "Too many submissions. Please try again later or contact the foundation." }, 429);
    // Accepted while the scheme is "proposed"; approval stays blocked in the admin until it is approved.
    const rules = await loadSettings("membershipRules");
    const nominee = await Nominee.findOne({ memberId: member._id }).lean();
    if (!nominee) return json({ ok: false, message: "No nominee is recorded for this membership. Please contact the foundation." }, 422);

    const d = parsed.data;
    const result = await fileOnlineClaim({ member, nominee, claimantName: d.claimantName, claimantEmail: d.claimantEmail, dateOfDeath: d.dateOfDeath, file, channel: "member portal" });
    if (!result.ok) return json({ ok: false, message: "A claim for this membership is already being processed. You can follow it on this page." }, 409);
    return json({ ok: true, reference: result.reference, targetDays: rules.claimTargetDays });
  } catch (error) {
    console.error("[api/member/claim]", error instanceof Error ? error.message : error);
    return unavailable();
  }
}
