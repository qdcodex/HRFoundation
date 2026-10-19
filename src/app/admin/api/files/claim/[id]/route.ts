import { Types } from "mongoose";
import { audit } from "@/lib/audit";
import { authorize, AuthError } from "@/lib/auth/dal";
import { connectDb } from "@/lib/db/connect";
import { Claim, ClaimDocument } from "@/lib/db/models/claims";
import { getFile } from "@/lib/storage";

/**
 * Serves a private claim document to an authorised user. Every access is written to the audit log.
 * Files are sent with no-store caching and a sandboxing CSP so they cannot run scripts.
 */
export async function GET(request: Request, { params }: RouteContext<"/admin/api/files/claim/[id]">) {
  try {
    const admin = await authorize("claims:documents");
    const { id } = await params;
    if (!Types.ObjectId.isValid(id)) return new Response("Not found", { status: 404 });
    await connectDb();
    const doc = await ClaimDocument.findById(id).lean();
    if (!doc) return new Response("Not found", { status: 404 });
    const file = await getFile("private_files", doc.fileId);
    if (!file) return new Response("Not found", { status: 404 });
    const claim = await Claim.findById(doc.claimId).select("reference").lean();
    await audit(admin, {
      action: "claims.document_viewed",
      entityType: "Claim",
      entityId: doc.claimId.toString(),
      summary: `Opened “${doc.kind}” on ${claim?.reference ?? "claim"}.`,
    });
    const download = new URL(request.url).searchParams.get("download") === "1";
    return new Response(new Uint8Array(file.bytes), {
      headers: {
        "Content-Type": doc.mime,
        "Content-Length": String(file.bytes.length),
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${doc.originalName.replace(/"/g, "")}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "sandbox; default-src 'none'; img-src 'self'; style-src 'unsafe-inline'",
      },
    });
  } catch (error) {
    if (error instanceof AuthError) return new Response(error.message, { status: error.status });
    console.error("[claim file]", error);
    return new Response("Error", { status: 500 });
  }
}
