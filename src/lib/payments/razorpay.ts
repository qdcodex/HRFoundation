import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { donation } from "@/content/donation";

/**
 * Razorpay (https://razorpay.com/docs/api/) — called over HTTPS with Basic auth; no SDK needed.
 *
 * Environment:
 *   RAZORPAY_KEY_ID          rzp_test_… or rzp_live_… (the key ID is public; it is sent to the browser for Checkout)
 *   RAZORPAY_KEY_SECRET      server only
 *   RAZORPAY_WEBHOOK_SECRET  server only — the secret entered for the webhook in the Razorpay Dashboard
 */
const API = "https://api.razorpay.com/v1";

export function isRazorpayEnabled() {
  return donation.gateway.enabled && Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

export function razorpayKeyId() {
  return process.env.RAZORPAY_KEY_ID ?? "";
}

export function isTestMode() {
  return razorpayKeyId().startsWith("rzp_test_");
}

export class RazorpayError extends Error {}

async function call<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64");
  const res = await fetch(`${API}${path}`, {
    method: init.method ?? "GET",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: init.body ? JSON.stringify(init.body) : undefined,
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: { description?: string } };
  if (!res.ok) throw new RazorpayError(data.error?.description ?? `Razorpay responded ${res.status}`);
  return data;
}

export type RazorpayOrder = { id: string; amount: number; currency: string; receipt: string; status: string };
export type RazorpayPayment = { id: string; order_id: string; amount: number; currency: string; status: "created" | "authorized" | "captured" | "refunded" | "failed"; method?: string; email?: string; contact?: string };

export function createOrder(input: { amountPaise: number; receipt: string; notes: Record<string, string> }) {
  return call<RazorpayOrder>("/orders", { method: "POST", body: { amount: input.amountPaise, currency: "INR", receipt: input.receipt.slice(0, 40), notes: input.notes } });
}

export function fetchPayment(paymentId: string) {
  return call<RazorpayPayment>(`/payments/${encodeURIComponent(paymentId)}`);
}

export function capturePayment(paymentId: string, amountPaise: number) {
  return call<RazorpayPayment>(`/payments/${encodeURIComponent(paymentId)}/capture`, { method: "POST", body: { amount: amountPaise, currency: "INR" } });
}

function safeEqualHex(a: string, b: string) {
  const x = Buffer.from(a, "utf8");
  const y = Buffer.from(b, "utf8");
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Checkout success handler signature: HMAC-SHA256(order_id + "|" + payment_id, key secret). */
export function verifyCheckoutSignature(orderId: string, paymentId: string, signature: string) {
  const expected = createHmac("sha256", process.env.RAZORPAY_KEY_SECRET ?? "").update(`${orderId}|${paymentId}`).digest("hex");
  return safeEqualHex(expected, signature);
}

/** Webhook signature: HMAC-SHA256(raw request body, webhook secret). */
export function verifyWebhookSignature(rawBody: string, signature: string) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeEqualHex(expected, signature);
}

/**
 * Token for downloading the membership certificate straight after an online payment, without signing in.
 * Bound to one paid order and signed with the server secret, so it cannot be guessed or reused for another member.
 */
export function certificateToken(orderId: string) {
  return createHmac("sha256", process.env.RAZORPAY_KEY_SECRET ?? "").update(`certificate:${orderId}`).digest("hex").slice(0, 40);
}

export function verifyCertificateToken(orderId: string, token: string) {
  return /^[a-f0-9]{40}$/.test(token) && safeEqualHex(certificateToken(orderId), token);
}
