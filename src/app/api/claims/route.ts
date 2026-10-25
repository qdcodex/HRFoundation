import { z } from "zod";
import { connectDb, isDatabaseConfigured } from "@/lib/db/connect";
import { Member, Nominee } from "@/lib/db/models/membership";
import { CLAIM_UPLOAD, fileOnlineClaim } from "@/lib/domain/online-claim";
import { json, rateLimit, unavailable } from "@/lib/server/submissions";
import { loadSettings } from "@/lib/settings";
import { UploadError, validateUpload } from "@/lib/storage";
import { indianMobile } from "@/lib/validation";
import { compareDates, parseIsoDate, todayInIndia } from "@/lib/waiting-period";

/**
 * Online death-benefit claim submitted by the nominee, with the death certificate.
 *
 * Safeguards:
 * - The membership ID and the nominee's mobile number must both match the records; any mismatch
 *   returns the same generic message (no way to discover which memberships exist).
 * - The certificate is checked by file content (PDF/JPG/PNG, max 10 MB) and stored in the PRIVATE bucket.
 * - One open claim per member; per-IP rate limit; honeypot.
 * - Submitting a claim never approves or pays anything: staff verify and record a decision
 *   (and approval is blocked while the scheme is still marked "proposed").
 */
const schema = z.object({
  membershipId: z.string().trim().toUpperCase().min(5, "Enter the membership ID.").max(30),
  nomineeMobile: indianMobile,
  claimantName: z.string().trim().min(3, "Enter your full name.").max(120),
  claimantEmail: z.union([z.literal(""), z.email("Enter a valid email address, or leave this blank.")]).default(""),
  dateOfDeath: z.string().refine((v) => parseIsoDate(v) !== null, "Enter a valid date."),
  consent: z.literal("on", { message: "Please confirm the declaration." }),
  website: z.string().max(500).optional(),
});

const NO_MATCH = "We could not match these details to a membership and its nominee. Please check the membership ID and the nominee's mobile number, or contact the foundation.";

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) return unavailable();
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ ok: false, message: "The form could not be read. Please try again." }, 400);
  }

  const parsed = schema.safeParse({
    membershipId: form.get("membershipId") ?? "",
    nomineeMobile: form.get("nomineeMobile") ?? "",
    claimantName: form.get("claimantName") ?? "",
    claimantEmail: form.get("claimantEmail") ?? "",
    dateOfDeath: form.get("dateOfDeath") ?? "",
    consent: form.get("consent") ?? "",
    website: (form.get("website") as string | null) ?? "",
  });
  const errors: Record<string, string> = {};
  if (!parsed.success) for (const i of parsed.error.issues) errors[String(i.path[0])] ??= i.message;
  if (parsed.success && parsed.data.website) return json({ ok: true, reference: "RECEIVED" }); // honeypot: silently accept
  if (parsed.success && compareDates(parseIsoDate(parsed.data.dateOfDeath)!, todayInIndia()) > 0) errors.dateOfDeath = "The date cannot be in the future.";

  let file: Awaited<ReturnType<typeof validateUpload>> | null = null;
  try {
    file = await validateUpload(form.get("certificate") as File, CLAIM_UPLOAD);
  } catch (error) {
    errors.certificate = error instanceof UploadError ? error.message : "Please attach the death certificate.";
  }
  if (!parsed.success || !file || Object.keys(errors).length) {
    return json({ ok: false, message: "Please check the highlighted fields.", errors }, 422);
  }
  const d = parsed.data;
  const dod = parseIsoDate(d.dateOfDeath)!;

  try {
    if (!(await rateLimit(request, "claims", 3, 3600))) return json({ ok: false, message: "Too many submissions. Please try again later or contact the foundation." }, 429);
    await connectDb();
    // Claims are accepted while the scheme is still "proposed"; approval stays blocked in the admin until it is approved.
    const rules = await loadSettings("membershipRules");

    const member = await Member.findOne({ membershipId: d.membershipId }).lean();
    const nominee = member ? await Nominee.findOne({ memberId: member._id }).lean() : null;
    if (!member || !nominee || nominee.mobile !== d.nomineeMobile) return json({ ok: false, message: NO_MATCH }, 422);
    if (compareDates(dod, parseIsoDate(member.dateOfBirth)!) < 0) {
      return json({ ok: false, message: "Please check the highlighted fields.", errors: { dateOfDeath: "Please check this date." } }, 422);
    }

    const result = await fileOnlineClaim({
      member,
      nominee,
      claimantName: d.claimantName,
      claimantEmail: d.claimantEmail,
      dateOfDeath: d.dateOfDeath,
      file,
      channel: "public form",
    });
    if (!result.ok) {
      return json({ ok: false, message: "A claim for this membership is already being processed. Please contact the foundation for an update." }, 409);
    }
    return json({ ok: true, reference: result.reference, targetDays: rules.claimTargetDays });
  } catch (error) {
    console.error("[api/claims]", error instanceof Error ? error.message : error);
    return unavailable();
  }
}
