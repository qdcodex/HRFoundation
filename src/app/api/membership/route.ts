import { audit } from "@/lib/audit";
import { connectDb, isDatabaseConfigured } from "@/lib/db/connect";
import { Member, Nominee } from "@/lib/db/models/membership";
import { notify } from "@/lib/notifications";
import { createReference, json, rateLimit, readJson, unavailable } from "@/lib/server/submissions";
import { loadSettings } from "@/lib/settings";
import { fieldErrors, membershipSchema } from "@/lib/validation";
import { ageOn, parseIsoDate, todayInIndia } from "@/lib/waiting-period";

/**
 * Receives a membership application from the public website.
 * It is stored as "Pending Payment". No payment is taken here and nothing is activated:
 * activation needs a verified payment and an approval recorded by authorised staff.
 */
export async function POST(request: Request) {
  const body = await readJson(request);
  const parsed = membershipSchema.safeParse(body);
  if (!parsed.success) return json({ ok: false, message: "Please check the highlighted fields.", errors: fieldErrors(parsed.error) }, 422);

  const d = parsed.data;
  if (d.website) return json({ ok: true, reference: "RECEIVED" }); // honeypot: silently accept
  if (!isDatabaseConfigured()) return unavailable();

  try {
    const rules = await loadSettings("membershipRules");
    if (!rules.registrationOpen) return json({ ok: false, message: "Membership applications are not open at the moment." }, 403);

    const age = ageOn(parseIsoDate(d.dateOfBirth)!, todayInIndia());
    if (age < rules.minApplicantAge) {
      return json({ ok: false, message: "Please check the highlighted fields.", errors: { dateOfBirth: `Applicants must be at least ${rules.minApplicantAge} years old.` } }, 422);
    }
    if (!(await rateLimit(request, "membership", 3))) return json({ ok: false, message: "Too many submissions. Please try again later." }, 429);

    await connectDb();
    const existing = await Member.exists({ mobile: d.mobile, status: { $nin: ["rejected"] } });
    if (existing) {
      return json(
        {
          ok: false,
          message: "An application or membership already exists for this mobile number. Please contact the foundation if you need help.",
          errors: { mobile: "This mobile number is already registered." },
        },
        409,
      );
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
      source: "website",
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
      });
    } catch (error) {
      // Compensate so we never keep an application without its nominee.
      await Member.deleteOne({ _id: member._id });
      throw error;
    }

    await audit(
      { id: null, name: "Public website" },
      { action: "membership.application_received", entityType: "Member", entityId: member.id, summary: `Application ${member.applicationRef} received from the website.` },
    );
    await notify("application_received", d.email, { name: d.fullName, reference: member.applicationRef }, { entity: "Member", id: member.id });
    return json({ ok: true, reference: member.applicationRef, delivered: true });
  } catch (error) {
    console.error("[api/membership]", error instanceof Error ? error.message : error);
    return unavailable();
  }
}
