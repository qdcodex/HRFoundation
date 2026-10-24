import { verifyWebhookSignature } from "@/lib/payments/razorpay";
import { settleRazorpayPayment } from "@/lib/payments/settle";

/**
 * Razorpay webhook (Dashboard → Settings → Webhooks):
 *   URL     https://<your-domain>/api/payments/razorpay/webhook
 *   Secret  the value of RAZORPAY_WEBHOOK_SECRET
 *   Events  payment.captured, order.paid
 * Records payments even when the visitor closed the browser before returning to the site. Safe to repeat.
 */
type WebhookBody = {
  event?: string;
  payload?: { payment?: { entity?: { id?: string; order_id?: string } }; order?: { entity?: { id?: string } } };
};

export async function POST(request: Request) {
  const signature = request.headers.get("x-razorpay-signature") ?? "";
  const raw = await request.text();
  if (raw.length > 100_000 || !verifyWebhookSignature(raw, signature)) return new Response("Invalid signature", { status: 400 });

  let body: WebhookBody;
  try {
    body = JSON.parse(raw) as WebhookBody;
  } catch {
    return new Response("Bad request", { status: 400 });
  }
  if (body.event !== "payment.captured" && body.event !== "order.paid") return new Response("Ignored", { status: 200 });

  const paymentId = body.payload?.payment?.entity?.id;
  const orderId = body.payload?.payment?.entity?.order_id ?? body.payload?.order?.entity?.id;
  if (!paymentId || !orderId) return new Response("Ignored", { status: 200 });

  try {
    const result = await settleRazorpayPayment(orderId, paymentId);
    // Unknown orders (e.g. payments made outside this website) are acknowledged so Razorpay stops retrying.
    return new Response(result.ok ? "OK" : "Not settled", { status: result.ok || result.message === "Unknown order." ? 200 : 500 });
  } catch (error) {
    console.error("[razorpay webhook]", error instanceof Error ? error.message : error);
    return new Response("Error", { status: 500 }); // Razorpay retries
  }
}
