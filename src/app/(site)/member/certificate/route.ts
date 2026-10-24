import { connection } from "next/server";
import { certificateResponse } from "@/lib/member-auth/certificate";
import { getMember } from "@/lib/member-auth/session";

/** The signed-in member's own certificate. */
export async function GET(request: Request) {
  await connection(); // personal document: always rendered at request time
  try {
    const member = await getMember();
    if (!member) return Response.redirect(new URL("/member/login", request.url), 303);
    if (member.portal?.mustChangePassword) return Response.redirect(new URL("/member/password?required=1", request.url), 303);
    const cert = await certificateResponse(member._id, request.url);
    if (!cert) return new Response("A certificate is not available for this membership.", { status: 404 });
    return cert.response;
  } catch (error) {
    console.error("[member certificate]", error instanceof Error ? error.message : error);
    return new Response("The certificate is temporarily unavailable. Please try again shortly.", { status: 500 });
  }
}
