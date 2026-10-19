import { connectDb, isDatabaseConfigured } from "@/lib/db/connect";
import { Enquiry } from "@/lib/db/models/system";
import { notify } from "@/lib/notifications";
import { createReference, json, rateLimit, readJson, unavailable } from "@/lib/server/submissions";
import { loadSettings } from "@/lib/settings";
import { contactSchema, fieldErrors } from "@/lib/validation";

const subjects: Record<string, string> = {
  general: "General enquiry",
  education: "Education support",
  medical: "Medical relief",
  membership: "Membership",
  donation: "Donation",
  documents: "Documents",
  other: "Other",
};

export async function POST(request: Request) {
  const body = await readJson(request);
  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) return json({ ok: false, message: "Please check the highlighted fields.", errors: fieldErrors(parsed.error) }, 422);

  const d = parsed.data;
  if (d.website) return json({ ok: true, reference: "RECEIVED" }); // honeypot: silently accept
  if (!isDatabaseConfigured()) return unavailable();

  try {
    if (!(await rateLimit(request, "contact"))) return json({ ok: false, message: "Too many submissions. Please try again later." }, 429);
    await connectDb();
    const enquiry = await Enquiry.create({
      reference: createReference("HRF-C"),
      kind: "contact",
      name: d.name,
      phone: d.phone || undefined,
      email: d.email || undefined,
      subject: subjects[d.subject],
      message: d.message,
    });
    const inbox = (await loadSettings("website")).enquiryInbox || process.env.FORM_TO_EMAIL;
    await notify("enquiry_received", inbox, { reference: enquiry.reference, kind: "Contact", name: d.name, subject: subjects[d.subject] }, { entity: "Enquiry", id: enquiry.id });
    return json({ ok: true, reference: enquiry.reference, delivered: true });
  } catch (error) {
    console.error("[api/contact]", error instanceof Error ? error.message : error);
    return unavailable();
  }
}
