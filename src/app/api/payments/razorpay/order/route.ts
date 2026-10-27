import { z } from "zod";
import { donation } from "@/content/donation";
import { site } from "@/content/site";
import { connectDb, isDatabaseConfigured } from "@/lib/db/connect";
import { GatewayOrder } from "@/lib/db/models/finance";
import { Member, MembershipPayment } from "@/lib/db/models/membership";
import { formatPaise } from "@/lib/money";
import { createOrder, isRazorpayEnabled, razorpayKeyId, RazorpayError } from "@/lib/payments/razorpay";
import { createReference, json, rateLimit, readJson, unavailable } from "@/lib/server/submissions";
import { loadSettings } from "@/lib/settings";
import { indianMobile } from "@/lib/validation";

const { minInr, maxInr } = donation.gateway;

const schema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("donation"),
    name: z.string().trim().min(2, "Enter your name.").max(120),
    email: z.email("Enter a valid email address so we can confirm your donation.").max(254),
    phone: z.union([z.literal(""), indianMobile]).default(""),
    amount: z.coerce
      .number({ message: "Enter an amount." })
      .int("Enter a whole number of rupees.")
      .min(minInr, `The minimum online donation is ₹${minInr}.`)
      .max(maxInr, `For donations above ₹${maxInr.toLocaleString("en-IN")}, please contact the foundation.`),
    purpose: z.string().trim().max(120).default(""),
    address: z.string().trim().max(300).default(""),
    pan: z.union([z.literal(""), z.string().trim().toUpperCase().regex(/^[A-Z]{5}\d{4}[A-Z]$/, "Enter a valid PAN, e.g. ABCDE1234F, or leave it blank.")]).default(""),
    consent: z.literal(true, { message: "Please confirm to continue." }),
  }),
  z.object({
    kind: z.literal("membership"),
    applicationRef: z.string().trim().toUpperCase().min(8, "Enter your application reference.").max(40),
    mobile: indianMobile,
  }),
]);

/** Creates a Razorpay order for a donation or a membership fee. The amount is always decided here, never by the browser. */
export async function POST(request: Request) {
  if (!isDatabaseConfigured() || !isRazorpayEnabled()) return unavailable();
  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const i of parsed.error.issues) errors[String(i.path[0])] ??= i.message;
    return json({ ok: false, message: "Please check the highlighted fields.", errors }, 422);
  }
  const d = parsed.data;
  try {
    if (!(await rateLimit(request, "razorpay-order", 10, 600))) return json({ ok: false, message: "Too many attempts. Please wait a few minutes and try again." }, 429);
    await connectDb();

    if (d.kind === "donation") {
      const amountPaise = d.amount * 100;
      const receipt = createReference("HRF-DO");
      const order = await createOrder({ amountPaise, receipt, notes: { kind: "donation", name: d.name.slice(0, 60), purpose: d.purpose.slice(0, 60) } });
      await GatewayOrder.create({ orderId: order.id, kind: "donation", amountPaise, donor: { name: d.name, email: d.email, phone: d.phone || null, purpose: d.purpose || null, address: d.address || null, pan: d.pan || null } });
      return json({
        ok: true,
        keyId: razorpayKeyId(),
        orderId: order.id,
        amount: amountPaise,
        currency: "INR",
        name: site.name,
        description: `Donation of ${formatPaise(amountPaise)}`,
        prefill: { name: d.name, email: d.email, contact: d.phone },
      });
    }

    // Membership fee: the application and mobile number must match, and no verified payment may exist yet.
    const rules = await loadSettings("membershipRules");
    if (!rules.feePaise) return json({ ok: false, message: "The membership fee has not been set yet. Please contact the foundation." }, 409);
    const member = await Member.findOne({ applicationRef: d.applicationRef }).lean();
    if (!member || member.mobile !== d.mobile) {
      return json({ ok: false, message: "We could not find an application with this reference and mobile number." }, 422);
    }
    if (!["pending_payment", "payment_verification"].includes(member.status) || (await MembershipPayment.exists({ memberId: member._id, status: "verified" }))) {
      return json({ ok: false, message: "The membership fee for this application has already been received or is not due." }, 409);
    }
    const order = await createOrder({ amountPaise: rules.feePaise, receipt: member.applicationRef, notes: { kind: "membership", applicationRef: member.applicationRef } });
    await GatewayOrder.create({ orderId: order.id, kind: "membership", amountPaise: rules.feePaise, memberId: member._id });
    return json({
      ok: true,
      keyId: razorpayKeyId(),
      orderId: order.id,
      amount: rules.feePaise,
      currency: "INR",
      name: site.name,
      description: `Membership fee (${member.applicationRef})`,
      prefill: { name: member.fullName, email: member.email ?? "", contact: member.mobile },
    });
  } catch (error) {
    console.error("[razorpay order]", error instanceof Error ? error.message : error);
    if (error instanceof RazorpayError) return json({ ok: false, message: "Online payment could not be started. Please try again shortly, or pay by UPI." }, 502);
    return unavailable();
  }
}
