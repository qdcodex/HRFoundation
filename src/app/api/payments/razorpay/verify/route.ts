import { z } from "zod";
import { certificateToken, isRazorpayEnabled, verifyCheckoutSignature } from "@/lib/payments/razorpay";
import { membershipForOrder, settleRazorpayPayment } from "@/lib/payments/settle";
import { json, rateLimit, readJson, unavailable } from "@/lib/server/submissions";

const schema = z.object({
  razorpay_order_id: z.string().regex(/^order_\w{6,40}$/),
  razorpay_payment_id: z.string().regex(/^pay_\w{6,40}$/),
  razorpay_signature: z.string().regex(/^[a-f0-9]{64}$/),
});

/** Called by the browser after Razorpay Checkout succeeds. The signature and the payment are both checked on the server. */
export async function POST(request: Request) {
  if (!isRazorpayEnabled()) return unavailable();
  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success) return json({ ok: false, message: "Invalid payment confirmation." }, 400);
  const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = parsed.data;
  if (!verifyCheckoutSignature(orderId, paymentId, signature)) return json({ ok: false, message: "The payment could not be verified." }, 400);
  try {
    if (!(await rateLimit(request, "razorpay-verify", 20, 600))) return json({ ok: false, message: "Too many attempts. Please try again later." }, 429);
    const result = await settleRazorpayPayment(orderId, paymentId);
    if (!result.ok) return json({ ok: false, message: result.message }, 409);
    if (result.kind === "membership") {
      const m = await membershipForOrder(orderId);
      if (m) {
        const certificateUrl = `/api/payments/razorpay/certificate?order=${encodeURIComponent(orderId)}&t=${certificateToken(orderId)}`;
        return json({ ok: true, kind: result.kind, reference: result.reference, paymentId, membershipId: m.membershipId, certificateUrl });
      }
    }
    return json({ ok: true, kind: result.kind, reference: result.reference, paymentId });
  } catch (error) {
    console.error("[razorpay verify]", error instanceof Error ? error.message : error);
    return json({ ok: false, message: "We could not confirm the payment yet. If money was debited, it will be confirmed automatically shortly." }, 503);
  }
}
