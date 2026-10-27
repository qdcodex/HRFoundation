import "server-only";
import { PDFDocument, rgb, StandardFonts, degrees } from "pdf-lib";
import { registration, site } from "@/content/site";
import type { IDonationReceipt } from "@/lib/db/models/finance";
import { fmtDate } from "@/lib/format";

const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function twoDigits(n: number) {
  return n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? ` ${ONES[n % 10]}` : ""}`;
}
function threeDigits(n: number) {
  const h = Math.floor(n / 100);
  const r = n % 100;
  return [h ? `${ONES[h]} Hundred` : "", r ? twoDigits(r) : ""].filter(Boolean).join(" ");
}

/** Indian numbering: crore, lakh, thousand. */
export function rupeesInWords(paise: number) {
  let n = Math.floor(paise / 100);
  const p = paise % 100;
  if (n === 0 && p === 0) return "Zero Rupees Only";
  const parts: string[] = [];
  const crore = Math.floor(n / 10_000_000);
  n %= 10_000_000;
  const lakh = Math.floor(n / 100_000);
  n %= 100_000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  if (crore) parts.push(`${threeDigits(crore)} Crore`);
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
  if (n) parts.push(threeDigits(n));
  const rupeeWord = Math.floor(paise / 100) === 1 ? "Rupee" : "Rupees";
  return `${parts.length ? `${parts.join(" ")} ${rupeeWord}` : ""}${p ? `${parts.length ? " and " : ""}${twoDigits(p)} Paise` : ""} Only`;
}

function rs(paise: number) {
  return `Rs. ${new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(paise / 100)}`;
}

const METHOD: Record<string, string> = { upi: "UPI", bank_transfer: "Bank transfer", cash: "Cash", cheque: "Cheque", gateway: "Online" };

export async function renderReceiptPdf(
  r: Pick<IDonationReceipt, "receiptNumber" | "status" | "donorName" | "donorAddress" | "amountPaise" | "donatedOn" | "method" | "transactionRef" | "donationReference" | "issuedAt" | "cancelReason" | "tax" | "donorPan">,
) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Donation receipt ${r.receiptNumber}`);
  pdf.setAuthor(site.name);
  const page = pdf.addPage([595.28, 841.89]); // A4
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const forest = rgb(0.082, 0.239, 0.196);
  const muted = rgb(0.33, 0.37, 0.35);
  const { width } = page.getSize();
  const left = 56;
  let y = 780;

  const text = (s: string, opts: { x?: number; size?: number; f?: typeof font; color?: ReturnType<typeof rgb> } = {}) => {
    page.drawText(s, { x: opts.x ?? left, y, size: opts.size ?? 10.5, font: opts.f ?? font, color: opts.color ?? rgb(0.15, 0.17, 0.16) });
  };

  page.drawRectangle({ x: 0, y: 812, width, height: 30, color: forest });
  text(site.name.toUpperCase(), { size: 18, f: bold, color: forest });
  y -= 18;
  const a = site.address;
  text(`${a.line1}, ${a.locality}, ${a.district}, ${a.state} ${a.postalCode}, India`, { size: 9.5, color: muted });
  y -= 13;
  const reg = registration.filter((x) => x.show && /Registration number|Darpan/.test(x.label)).map((x) => `${x.label}: ${x.value}`);
  if (reg.length) text(reg.join("   |   "), { size: 9, color: muted });
  y -= 36;
  text("DONATION RECEIPT", { size: 15, f: bold, color: forest });
  text(`Receipt No: ${r.receiptNumber}`, { x: 340, size: 10.5, f: bold });
  y -= 16;
  text(`Date of issue: ${fmtDate(r.issuedAt.toISOString())}`, { x: 340, size: 10 });
  y -= 30;

  page.drawLine({ start: { x: left, y }, end: { x: width - left, y }, thickness: 0.6, color: rgb(0.85, 0.83, 0.78) });
  y -= 28;
  text("Received with thanks from", { color: muted });
  y -= 16;
  text(r.donorName, { size: 13, f: bold });
  if (r.donorAddress) {
    for (const line of r.donorAddress.match(/.{1,80}(\s|$)/g) ?? []) {
      y -= 14;
      text(line.trim(), { size: 10 });
    }
  }
  y -= 30;

  const rows: [string, string][] = [
    ["Amount", rs(r.amountPaise)],
    ["Amount in words", rupeesInWords(r.amountPaise)],
    ["Date of donation", fmtDate(r.donatedOn)],
    ["Mode of payment", METHOD[r.method] ?? r.method],
    ["Transaction reference", r.transactionRef || "-"],
    ["Donation reference", r.donationReference],
    ...(r.donorPan ? ([["PAN of donor", r.donorPan]] as [string, string][]) : []),
  ];
  for (const [k, v] of rows) {
    text(k, { color: muted });
    text(v, { x: 220, f: k === "Amount" ? bold : font, size: k === "Amount" ? 12 : 10.5 });
    y -= 22;
  }

  y -= 16;
  // 80G/12A wording appears only when the receipt recorded an active 80G approval at the time of issue.
  if (r.tax) {
    y -= 4;
    text("Income-tax registrations", { f: bold, color: forest });
    y -= 18;
    const period = (v: { validFrom: string; validTo: string }) =>
      v.validFrom || v.validTo ? ` (valid ${v.validFrom ? `from ${fmtDate(v.validFrom)}` : ""}${v.validTo ? ` to ${fmtDate(v.validTo)}` : ""})` : "";
    const taxRows: [string, string][] = [
      ...(r.tax.trustPan ? ([["PAN of the trust", r.tax.trustPan]] as [string, string][]) : []),
      ["80G approval no.", `${r.tax.reg80G.number}${period(r.tax.reg80G)}`],
      ...(r.tax.reg12A ? ([["12A registration no.", `${r.tax.reg12A.number}${period(r.tax.reg12A)}`]] as [string, string][]) : []),
    ];
    for (const [k, v] of taxRows) {
      text(k, { color: muted, size: 10 });
      text(v.slice(0, 70), { x: 220, size: 10 });
      y -= 18;
    }
    y -= 8;
  }

  const notes = [
    "This receipt acknowledges a voluntary donation received by H R Foundation.",
    r.tax
      ? "This donation is eligible for deduction under section 80G of the Income-tax Act, 1961, subject to the conditions of that section. Cash donations above Rs. 2,000 are not eligible."
      : "This receipt does not state or certify eligibility for any income-tax deduction.",
    r.tax ? "The 80G and 12A approval certificates are provided with this receipt." : "",
    "This is a receipt issued to an individual donor and is not a registration or approval certificate of the foundation.",
  ].filter(Boolean);
  for (const n of notes) {
    for (const line of n.match(/.{1,110}(\s|$)/g) ?? [n]) {
      text(line.trim(), { size: 9, color: muted });
      y -= 13;
    }
  }

  y = 150;
  page.drawLine({ start: { x: 360, y }, end: { x: width - left, y }, thickness: 0.6, color: rgb(0.6, 0.6, 0.6) });
  y -= 14;
  text("Authorised signatory", { x: 360, size: 9.5, color: muted });
  y -= 13;
  text(`for ${site.name}`, { x: 360, size: 9.5, color: muted });

  if (r.status === "cancelled") {
    page.drawText("CANCELLED", { x: 130, y: 380, size: 90, font: bold, color: rgb(0.66, 0.2, 0.16), opacity: 0.18, rotate: degrees(30) });
    y = 90;
    text(`Cancelled: ${r.cancelReason ?? ""}`.slice(0, 110), { size: 9, color: rgb(0.66, 0.2, 0.16) });
  }

  page.drawText("Computer-generated receipt. Please quote the receipt number in any correspondence.", { x: left, y: 50, size: 8, font, color: muted });
  return pdf.save();
}
