"use client";

/** Thin client for Razorpay Checkout: create an order on our server, open Checkout, verify on our server. */

type OrderResponse = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string>;
  keyId?: string;
  orderId?: string;
  amount?: number;
  currency?: string;
  name?: string;
  description?: string;
  prefill?: { name?: string; email?: string; contact?: string };
};

type RazorpayHandlerResponse = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
type RazorpayInstance = { open: () => void; on: (event: string, cb: (r: { error?: { description?: string } }) => void) => void };
declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

export type CheckoutResult =
  | { status: "paid"; reference: string | null; paymentId: string }
  | { status: "invalid"; message: string; errors: Record<string, string> }
  | { status: "dismissed" }
  | { status: "error"; message: string };

let scriptPromise: Promise<boolean> | null = null;
function loadScript() {
  if (window.Razorpay) return Promise.resolve(true);
  scriptPromise ??= new Promise<boolean>((resolve) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    s.onload = () => resolve(true);
    s.onerror = () => {
      scriptPromise = null;
      resolve(false);
    };
    document.body.appendChild(s);
  });
  return scriptPromise;
}

export async function payWithRazorpay(orderRequest: Record<string, unknown>): Promise<CheckoutResult> {
  const [loaded, res] = await Promise.all([
    loadScript(),
    fetch("/api/payments/razorpay/order", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(orderRequest) }).catch(() => null),
  ]);
  if (!res) return { status: "error", message: "We could not reach the server. Please check your connection and try again." };
  const order = (await res.json().catch(() => ({ ok: false }))) as OrderResponse;
  if (!res.ok || !order.ok || !order.orderId) {
    if (order.errors) return { status: "invalid", message: order.message ?? "Please check the highlighted fields.", errors: order.errors };
    return { status: "error", message: order.message ?? "Online payment could not be started. Please try again." };
  }
  if (!loaded || !window.Razorpay) return { status: "error", message: "The payment window could not be loaded. Please check your connection or pay by UPI." };

  return new Promise<CheckoutResult>((resolve) => {
    // Checkout lets the payer retry after a failure, so a failure is reported only if they then close it.
    let lastError: string | null = null;
    const rzp = new window.Razorpay!({
      key: order.keyId,
      order_id: order.orderId,
      amount: order.amount,
      currency: order.currency,
      name: order.name,
      description: order.description,
      image: `${window.location.origin}/brand/hr-foundation-emblem.png`,
      prefill: order.prefill,
      theme: { color: "#153d32" },
      handler: async (r: RazorpayHandlerResponse) => {
        try {
          const v = await fetch("/api/payments/razorpay/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(r) });
          const body = (await v.json().catch(() => ({}))) as { ok?: boolean; message?: string; reference?: string | null };
          resolve(
            v.ok && body.ok
              ? { status: "paid", reference: body.reference ?? null, paymentId: r.razorpay_payment_id }
              : { status: "error", message: body.message ?? "We could not confirm the payment yet. If money was debited, it will be confirmed automatically shortly." },
          );
        } catch {
          resolve({ status: "error", message: "We could not confirm the payment yet. If money was debited, it will be confirmed automatically shortly." });
        }
      },
      modal: { ondismiss: () => resolve(lastError ? { status: "error", message: lastError } : { status: "dismissed" }), confirm_close: true },
    });
    rzp.on("payment.failed", (r) => {
      lastError = r.error?.description ?? "The payment failed. If money was debited, it will be refunded by your bank.";
    });
    rzp.open();
  });
}
