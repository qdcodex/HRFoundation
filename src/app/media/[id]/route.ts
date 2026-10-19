import { Types } from "mongoose";
import { connectDb, isDatabaseConfigured } from "@/lib/db/connect";
import { Media } from "@/lib/db/models/content";
import { getFile } from "@/lib/storage";

/** Serves an approved media-library image. Only files registered in the media library are reachable. */
export async function GET(_: Request, { params }: RouteContext<"/media/[id]">) {
  const { id } = await params;
  if (!Types.ObjectId.isValid(id) || !isDatabaseConfigured()) return new Response("Not found", { status: 404 });
  await connectDb();
  const media = await Media.findById(id).lean();
  if (!media) return new Response("Not found", { status: 404 });
  const file = await getFile("public_files", media.fileId);
  if (!file) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(file.bytes), {
    headers: {
      "Content-Type": media.mime,
      "Content-Length": String(file.bytes.length),
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
    },
  });
}
