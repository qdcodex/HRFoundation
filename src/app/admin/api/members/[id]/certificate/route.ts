import { Types } from "mongoose";
import { audit } from "@/lib/audit";
import { authorize, AuthError } from "@/lib/auth/dal";
import { certificateResponse } from "@/lib/member-auth/certificate";

/** Membership certificate for staff (e.g. to print for a member without internet access). */
export async function GET(request: Request, { params }: RouteContext<"/admin/api/members/[id]/certificate">) {
  try {
    const admin = await authorize("membership:read");
    const { id } = await params;
    if (!Types.ObjectId.isValid(id)) return new Response("Not found", { status: 404 });
    const cert = await certificateResponse(id, request.url);
    if (!cert) return new Response("A certificate is available only for an active or suspended membership.", { status: 404 });
    await audit(admin, { action: "membership.certificate_downloaded", entityType: "Member", entityId: id, summary: `Downloaded certificate for ${cert.membershipId}.` });
    return cert.response;
  } catch (error) {
    if (error instanceof AuthError) return new Response(error.message, { status: error.status });
    console.error("[certificate]", error);
    return new Response("Error", { status: 500 });
  }
}
