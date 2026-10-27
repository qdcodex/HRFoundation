import { Types } from "mongoose";
import { connection } from "next/server";
import { connectDb } from "@/lib/db/connect";
import { DonationReceipt, type IDonationReceipt } from "@/lib/db/models/finance";
import { receiptDocuments, type DonorDocument } from "@/lib/domain/receipts";
import { verifyLink } from "@/lib/server/signed-links";

/** A donor's receipt or the foundation's 12A/80G certificate, via the signed link from the thank-you screen. */
export async function GET(request: Request) {
  await connection();
  const url = new URL(request.url);
  const id = url.searchParams.get("r") ?? "";
  const doc = (url.searchParams.get("doc") ?? "") as DonorDocument;
  const token = url.searchParams.get("t") ?? "";
  if (!Types.ObjectId.isValid(id) || !["receipt", "12a", "80g"].includes(doc) || !verifyLink(`donor-doc:${doc}`, id, token)) {
    return new Response("Invalid or expired link.", { status: 404 });
  }
  try {
    await connectDb();
    const receipt = await DonationReceipt.findById(id).lean<IDonationReceipt>();
    if (!receipt) return new Response("Not found.", { status: 404 });
    const file = (await receiptDocuments(receipt)).find((d) => d.kind === doc);
    if (!file) return new Response("This document is not available.", { status: 404 });
    return new Response(new Uint8Array(file.bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${file.filename}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("[donor documents]", error instanceof Error ? error.message : error);
    return new Response("The document is temporarily unavailable. Please try again shortly.", { status: 500 });
  }
}
