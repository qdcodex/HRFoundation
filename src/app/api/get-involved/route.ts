import { connectDb, isDatabaseConfigured } from "@/lib/db/connect";
import { Enquiry } from "@/lib/db/models/system";
import { adminInbox, notify } from "@/lib/notifications";
import { createReference, json, rateLimit, readJson, unavailable } from "@/lib/server/submissions";
import { fieldErrors, involvementSchema } from "@/lib/validation";

const types: Record<string, string> = { volunteer: "Volunteering", partnership: "Partnership", other: "Other support" };

export async function POST(request: Request) {
  const body = await readJson(request);
  const parsed = involvementSchema.safeParse(body);
  if (!parsed.success) return json({ ok: false, message: "Please check the highlighted fields.", errors: fieldErrors(parsed.error) }, 422);

  const d = parsed.data;
  if (d.website) return json({ ok: true, reference: "RECEIVED" }); // honeypot: silently accept
  if (!isDatabaseConfigured()) return unavailable();

  try {
    if (!(await rateLimit(request, "get-involved"))) return json({ ok: false, message: "Too many submissions. Please try again later." }, 429);
    await connectDb();
    const enquiry = await Enquiry.create({
      reference: createReference("HRF-V"),
      kind: d.type,
      name: d.name,
      phone: d.phone,
      email: d.email || undefined,
      subject: `${types[d.type]} enquiry`,
      message: d.message,
      organisation: d.organisation || undefined,
      city: d.city,
      interests: d.interests,
    });
    const inbox = await adminInbox();
    await notify("enquiry_received", inbox, { reference: enquiry.reference, kind: types[d.type], name: d.name, subject: enquiry.subject }, { entity: "Enquiry", id: enquiry.id });
    return json({ ok: true, reference: enquiry.reference, delivered: true });
  } catch (error) {
    console.error("[api/get-involved]", error instanceof Error ? error.message : error);
    return unavailable();
  }
}
