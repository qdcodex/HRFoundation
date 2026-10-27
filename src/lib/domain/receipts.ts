import "server-only";
import { Types } from "mongoose";
import { Donation, DonationReceipt, nextSequence, type IDonation, type IDonationReceipt } from "@/lib/db/models/finance";
import { ActionError, isDuplicateKey } from "@/lib/errors";
import { formatPaise } from "@/lib/money";
import { notify } from "@/lib/notifications";
import { renderReceiptPdf } from "@/lib/receipt-pdf";
import type { EmailAttachment } from "@/lib/server/email";
import { signLink } from "@/lib/server/signed-links";
import { isRegistrationActive, loadSettings } from "@/lib/settings";
import { getFile } from "@/lib/storage";
import { todayInIndia } from "@/lib/waiting-period";

function financialYear() {
  const t = todayInIndia();
  const start = t.month >= 4 ? t.year : t.year - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
}

/** 12A/80G details to record on a receipt — only when 80G is fully set up (number + approval certificate). */
async function taxSnapshot(): Promise<IDonationReceipt["tax"]> {
  const t = await loadSettings("taxExemption");
  if (!isRegistrationActive(t.reg80G)) return null;
  const pick = (r: typeof t.reg80G) => ({ number: r.number, validFrom: r.validFrom, validTo: r.validTo });
  return { trustPan: t.trustPan, reg12A: isRegistrationActive(t.reg12A) ? pick(t.reg12A) : null, reg80G: pick(t.reg80G) };
}

/** Issues the receipt for one verified donation (staff action, or automatically after an online payment). */
export async function issueDonationReceipt(donationId: string | Types.ObjectId, actor: { id: string | null; name: string }, replaces?: Types.ObjectId) {
  const donation = await Donation.findById(donationId).lean<IDonation>();
  if (!donation) throw new ActionError("Donation not found.");
  if (donation.status !== "verified") throw new ActionError("Receipts can only be issued for verified donations.");
  if (!donation.donorName) throw new ActionError("Add the donor's name before issuing a receipt (anonymous donations cannot be receipted).");
  const fy = financialYear();
  const seq = await nextSequence(`receipt:${fy}`);
  try {
    return await new DonationReceipt({
      receiptNumber: `HRF/${fy}/${String(seq).padStart(5, "0")}`,
      donationId: donation._id,
      status: "issued",
      donorName: donation.donorName,
      donorAddress: donation.donorAddress,
      donorEmail: donation.donorEmail,
      donorPan: donation.donorPan,
      amountPaise: donation.amountPaise,
      donatedOn: donation.donatedOn,
      method: donation.method,
      transactionRef: donation.transactionRef,
      donationReference: donation.reference,
      issuedAt: new Date(),
      issuedBy: actor.id ? new Types.ObjectId(actor.id) : null,
      issuedByName: actor.name,
      replacesReceiptId: replaces ?? null,
      tax: await taxSnapshot(),
    }).save();
  } catch (error) {
    if (isDuplicateKey(error)) throw new ActionError("A receipt has already been issued for this donation.");
    throw error;
  }
}

export type DonorDocument = "receipt" | "12a" | "80g";

/** The documents a donor gets with a receipt: the receipt, plus the 12A/80G certificates when 80G was active on it. */
export async function receiptDocuments(receipt: IDonationReceipt): Promise<{ kind: DonorDocument; filename: string; bytes: Uint8Array }[]> {
  const docs: { kind: DonorDocument; filename: string; bytes: Uint8Array }[] = [
    { kind: "receipt", filename: `${receipt.receiptNumber.replace(/\//g, "-")}.pdf`, bytes: await renderReceiptPdf(receipt) },
  ];
  if (receipt.status === "issued" && receipt.tax) {
    const t = await loadSettings("taxExemption");
    for (const [kind, reg, label] of [["80g", t.reg80G, "80G"], ["12a", t.reg12A, "12A"]] as const) {
      if (!isRegistrationActive(reg)) continue;
      const file = await getFile("private_files", reg.fileId!).catch(() => null);
      if (file) docs.push({ kind, filename: `HR-Foundation-${label}-certificate.pdf`, bytes: new Uint8Array(file.bytes) });
    }
  }
  return docs;
}

/** Signed download links (no sign-in needed) for the thank-you screen. */
export async function receiptDownloadLinks(receipt: IDonationReceipt) {
  const id = receipt._id.toString();
  const kinds: DonorDocument[] = ["receipt"];
  if (receipt.tax) {
    const t = await loadSettings("taxExemption");
    if (isRegistrationActive(t.reg80G)) kinds.push("80g");
    if (isRegistrationActive(t.reg12A)) kinds.push("12a");
  }
  return kinds.map((doc) => ({ doc, url: `/api/donations/documents?r=${id}&doc=${doc}&t=${signLink(`donor-doc:${doc}`, id)}` }));
}

/** Emails the receipt (and certificates) to the donor; the admin copy includes them too. */
export async function emailDonationReceipt(receiptId: string) {
  const r = await DonationReceipt.findById(receiptId).lean<IDonationReceipt>();
  if (!r) return;
  const docs = await receiptDocuments(r);
  const attachments: EmailAttachment[] = docs.map((d) => ({ filename: d.filename, content: d.bytes, contentType: "application/pdf" }));
  const result = await notify(
    "receipt_issued",
    r.donorEmail,
    { name: r.donorName, receiptNumber: r.receiptNumber, amount: formatPaise(r.amountPaise) },
    { entity: "DonationReceipt", id: receiptId },
    { attachments },
  );
  const status = result === "sent" ? "sent" : result === "failed" ? "failed" : r.donorEmail ? "not_configured" : "not_sent";
  await DonationReceipt.updateOne({ _id: receiptId }, { $set: { emailStatus: status } });
  return status;
}
