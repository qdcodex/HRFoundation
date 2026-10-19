import { Types } from "mongoose";
import { audit } from "@/lib/audit";
import { authorize, AuthError } from "@/lib/auth/dal";
import { connectDb } from "@/lib/db/connect";
import { DonationReceipt } from "@/lib/db/models/finance";
import { renderReceiptPdf } from "@/lib/receipt-pdf";

/** Generates the PDF for a donation receipt from its stored snapshot. */
export async function GET(_: Request, { params }: RouteContext<"/admin/api/receipts/[id]">) {
  try {
    const admin = await authorize("receipts:manage", "donations:read");
    const { id } = await params;
    if (!Types.ObjectId.isValid(id)) return new Response("Not found", { status: 404 });
    await connectDb();
    const receipt = await DonationReceipt.findById(id).lean();
    if (!receipt) return new Response("Not found", { status: 404 });
    const bytes = await renderReceiptPdf(receipt);
    await audit(admin, { action: "receipts.downloaded", entityType: "DonationReceipt", entityId: id, summary: `Downloaded receipt ${receipt.receiptNumber}.` });
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${receipt.receiptNumber.replace(/\//g, "-")}.pdf"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof AuthError) return new Response(error.message, { status: error.status });
    console.error("[receipt pdf]", error);
    return new Response("Error", { status: 500 });
  }
}
