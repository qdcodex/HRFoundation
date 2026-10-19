import "server-only";
import mongoose, { Types } from "mongoose";
import { Readable } from "node:stream";
import { connectDb } from "@/lib/db/connect";
import { sha256Hex } from "@/lib/server/request";

/**
 * File storage in MongoDB GridFS.
 * - "public_files": approved media and published documents (served only after a DB check).
 * - "private_files": claim documents. Never served without an authorised, audited request.
 * Files are validated by magic bytes, not by the browser-supplied type or extension.
 */
export type Bucket = "public_files" | "private_files";

const SIGNATURES: { mime: string; ext: string; test: (b: Uint8Array) => boolean }[] = [
  { mime: "application/pdf", ext: "pdf", test: (b) => b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46 },
  { mime: "image/png", ext: "png", test: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  { mime: "image/jpeg", ext: "jpg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    mime: "image/webp",
    ext: "webp",
    test: (b) => b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50,
  },
];

export function sniffType(bytes: Uint8Array) {
  return SIGNATURES.find((s) => s.test(bytes)) ?? null;
}

export class UploadError extends Error {}

export async function validateUpload(file: File, opts: { allowed: string[]; maxBytes: number }) {
  if (!(file instanceof File) || file.size === 0) throw new UploadError("Please choose a file.");
  if (file.size > opts.maxBytes) throw new UploadError(`File is too large (max ${Math.round(opts.maxBytes / 1024 / 1024)} MB).`);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniffType(bytes);
  if (!type || !opts.allowed.includes(type.mime)) {
    throw new UploadError(`Unsupported file type. Allowed: ${opts.allowed.map((m) => m.split("/")[1].toUpperCase()).join(", ")}.`);
  }
  const safeName =
    file.name
      .replace(/\.[^.]+$/, "")
      .replace(/[^\w\- ]+/g, "")
      .trim()
      .slice(0, 80) || "file";
  return { bytes, mime: type.mime, filename: `${safeName}.${type.ext}`, size: file.size, sha256: await sha256Hex(bytes) };
}

async function bucket(name: Bucket) {
  const conn = await connectDb();
  return new mongoose.mongo.GridFSBucket(conn.connection.db!, { bucketName: name });
}

export async function putFile(name: Bucket, data: { bytes: Uint8Array; filename: string; mime: string; metadata?: Record<string, unknown> }) {
  const b = await bucket(name);
  const id = new Types.ObjectId();
  await new Promise<void>((resolve, reject) => {
    const upload = b.openUploadStreamWithId(id, data.filename, { metadata: { mime: data.mime, ...data.metadata } });
    Readable.from(Buffer.from(data.bytes)).pipe(upload).on("error", reject).on("finish", () => resolve());
  });
  return id;
}

export async function getFile(name: Bucket, id: Types.ObjectId | string) {
  const b = await bucket(name);
  const _id = typeof id === "string" ? new Types.ObjectId(id) : id;
  const [info] = await b.find({ _id }).limit(1).toArray();
  if (!info) return null;
  const chunks: Buffer[] = [];
  for await (const chunk of b.openDownloadStream(_id)) chunks.push(chunk as Buffer);
  return { bytes: Buffer.concat(chunks), filename: info.filename, mime: (info.metadata?.mime as string) ?? "application/octet-stream", length: info.length };
}

export async function deleteFile(name: Bucket, id: Types.ObjectId | string) {
  const b = await bucket(name);
  try {
    await b.delete(typeof id === "string" ? new Types.ObjectId(id) : id);
  } catch {
    /* already gone */
  }
}
