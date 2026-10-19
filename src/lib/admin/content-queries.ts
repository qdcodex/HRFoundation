import "server-only";
import { connectDb } from "@/lib/db/connect";
import { Media } from "@/lib/db/models/content";

export async function mediaOptions() {
  await connectDb();
  return (await Media.find().sort({ createdAt: -1 }).select("filename alt").lean()).map((m) => ({ id: m._id.toString(), filename: m.filename, alt: m.alt }));
}
