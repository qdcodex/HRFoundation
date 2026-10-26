import { connection } from "next/server";
import { connectDb } from "@/lib/db/connect";
import { certificateResponse } from "@/lib/member-auth/certificate";
import { verifyCertificateToken } from "@/lib/payments/razorpay";
import { membershipForOrder } from "@/lib/payments/settle";

/** Membership certificate shown right after a successful online membership payment. */
export async function GET(request: Request) {
  await connection();
  const url = new URL(request.url);
  const orderId = url.searchParams.get("order") ?? "";
  const token = url.searchParams.get("t") ?? "";
  if (!/^order_\w{6,40}$/.test(orderId) || !verifyCertificateToken(orderId, token)) return new Response("Invalid or expired link.", { status: 404 });
  try {
    await connectDb();
    const m = await membershipForOrder(orderId);
    if (!m) return new Response("The certificate is not available yet. Please sign in to the member portal or contact the foundation.", { status: 404 });
    const cert = await certificateResponse(m.memberId, request.url);
    return cert ? cert.response : new Response("The certificate is not available.", { status: 404 });
  } catch (error) {
    console.error("[payment certificate]", error instanceof Error ? error.message : error);
    return new Response("The certificate is temporarily unavailable. Please try again shortly.", { status: 500 });
  }
}
