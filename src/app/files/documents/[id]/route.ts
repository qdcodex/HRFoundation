import { Types } from "mongoose";
import { connectDb, isDatabaseConfigured } from "@/lib/db/connect";
import { PublicDocument } from "@/lib/db/models/content";
import { getFile } from "@/lib/storage";

/**
 * Downloads a public document — only when it is published AND its visibility is "public".
 * Private member and claim documents live in a different bucket and are never reachable here.
 */
export async function GET(_: Request, { params }: RouteContext<"/files/documents/[id]">) {
  const { id } = await params;
  if (!Types.ObjectId.isValid(id) || !isDatabaseConfigured()) return new Response("Not found", { status: 404 });
  await connectDb();
  const doc = await PublicDocument.findOne({ _id: id, status: "published", visibility: "public" }).lean();
  if (!doc?.file) return new Response("Not found", { status: 404 });
  const file = await getFile("public_files", doc.file.fileId);
  if (!file) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(file.bytes), {
    headers: {
      "Content-Type": doc.file.mime,
      "Content-Length": String(file.bytes.length),
      "Content-Disposition": `attachment; filename="${doc.file.name.replace(/"/g, "")}"`,
      "Cache-Control": "public, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
