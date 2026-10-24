import "server-only";
import { PDFDocument, rgb, StandardFonts, degrees, type PDFFont, type PDFPage } from "pdf-lib";
import { registration, site, siteUrl } from "@/content/site";
import { NOMINEE_RELATIONSHIPS } from "@/lib/db/models/membership";
import { fmtDate } from "@/lib/format";
import { addMonthsClamped, parseIsoDate, toIso } from "@/lib/waiting-period";

type CertificateInput = {
  member: { fullName: string; membershipId: string; effectiveDate: string; status: string };
  nominee: { name: string; relationship: (typeof NOMINEE_RELATIONSHIPS)[number]; relationshipOther?: string } | null;
  rules: { waitingPeriodMonths: number; schemeApproved: boolean; termsVersion: string; claimTargetDays: number };
  issuedOn: string; // YYYY-MM-DD (IST)
  logoPng?: Uint8Array | null;
};

const forest = rgb(0.082, 0.239, 0.196);
const gold = rgb(0.72, 0.58, 0.28);
const ink = rgb(0.15, 0.17, 0.16);
const muted = rgb(0.36, 0.4, 0.38);

function centered(page: PDFPage, text: string, y: number, size: number, font: PDFFont, color = ink) {
  const w = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: (page.getWidth() - w) / 2, y, size, font, color });
}

/** Wraps text to a maximum width, returning lines. */
function wrap(text: string, font: PDFFont, size: number, maxWidth: number) {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) > maxWidth && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

/** Membership certificate (A4 landscape). Contains no contact numbers, address or nominee mobile. */
export async function renderMembershipCertificate(input: CertificateInput) {
  const { member, nominee, rules } = input;
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Membership certificate ${member.membershipId}`);
  pdf.setAuthor(site.name);
  const page = pdf.addPage([841.89, 595.28]);
  const { width, height } = page.getSize();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const serif = await pdf.embedFont(StandardFonts.TimesRomanBoldItalic);

  // Frame
  page.drawRectangle({ x: 18, y: 18, width: width - 36, height: height - 36, borderColor: forest, borderWidth: 3 });
  page.drawRectangle({ x: 28, y: 28, width: width - 56, height: height - 56, borderColor: gold, borderWidth: 0.8 });

  let y = height - 64;
  if (input.logoPng) {
    try {
      const img = await pdf.embedPng(input.logoPng);
      const h = 62;
      const w = (img.width / img.height) * h;
      page.drawImage(img, { x: (width - w) / 2, y: y - h + 12, width: w, height: h });
      y -= h + 14;
    } catch {
      /* logo is optional */
    }
  }
  centered(page, site.name.toUpperCase(), y, 22, bold, forest);
  y -= 16;
  const reg = registration.filter((r) => r.show && /Registration number|Darpan/.test(r.label)).map((r) => `${r.label}: ${r.value}`);
  if (reg.length) centered(page, `A charitable trust, Telangana  |  ${reg.join("  |  ")}`, y, 8.5, font, muted);
  y -= 34;

  centered(page, "MEMBERSHIP CERTIFICATE", y, 18, bold, gold);
  y -= 30;
  centered(page, "This is to certify that", y, 12, font, muted);
  y -= 34;
  centered(page, member.fullName, y, 28, serif, forest);
  page.drawLine({ start: { x: width / 2 - 170, y: y - 8 }, end: { x: width / 2 + 170, y: y - 8 }, thickness: 0.6, color: gold });
  y -= 30;
  centered(page, `is a member of ${site.name}${member.status === "suspended" ? " (membership currently suspended)" : ""}.`, y, 12, font, ink);
  y -= 36;

  const eff = parseIsoDate(member.effectiveDate)!;
  const rel = nominee ? (nominee.relationship === "other" ? (nominee.relationshipOther ?? "Other") : nominee.relationship) : "";
  const rows: [string, string][] = [
    ["Membership ID", member.membershipId],
    ["Effective date", fmtDate(member.effectiveDate)],
    [`Waiting period (${rules.waitingPeriodMonths} months) completes`, fmtDate(toIso(addMonthsClamped(eff, rules.waitingPeriodMonths)))],
    ["Nominee", nominee ? `${nominee.name} (${rel.charAt(0).toUpperCase()}${rel.slice(1)})` : "Not recorded"],
    ["Date of issue", fmtDate(input.issuedOn)],
  ];
  const colX = width / 2 - 200;
  for (const [k, v] of rows) {
    page.drawText(k, { x: colX, y, size: 10.5, font, color: muted });
    page.drawText(v, { x: colX + 230, y, size: 11, font: bold, color: ink });
    y -= 19;
  }

  y -= 10;
  const notes = [
    `Membership is not an insurance policy. Any death-benefit support is subject to the foundation's membership terms (${rules.termsVersion}), verification of a claim and available funds, and is not guaranteed.`,
    rules.schemeApproved ? "" : "The death-benefit provision is proposed and subject to formal approval by the foundation.",
    `To make a claim, the nominee signs in at ${siteUrl.replace(/^https?:\/\//, "")}/member with this membership ID and uploads the death certificate. The foundation aims to complete verification and payment within ${rules.claimTargetDays} days of receiving complete documents.`,
  ].filter(Boolean);
  for (const n of notes) {
    for (const line of wrap(n, font, 8.5, width - 220)) {
      centered(page, line, y, 8.5, font, muted);
      y -= 11;
    }
    y -= 3;
  }

  page.drawLine({ start: { x: width - 260, y: 84 }, end: { x: width - 80, y: 84 }, thickness: 0.6, color: muted });
  page.drawText("Authorised signatory", { x: width - 260, y: 70, size: 9.5, font, color: muted });
  page.drawText(`for ${site.name}`, { x: width - 260, y: 58, size: 9.5, font, color: muted });
  page.drawText("Computer-generated certificate. Please quote the membership ID in all correspondence.", { x: 64, y: 58, size: 8, font, color: muted });

  if (member.status === "suspended") {
    page.drawText("SUSPENDED", { x: 220, y: 200, size: 96, font: bold, color: rgb(0.66, 0.2, 0.16), opacity: 0.14, rotate: degrees(20) });
  }
  return pdf.save();
}

/** Loads the emblem from the site's own static files (works on serverless hosts where /public is not on disk). */
export async function loadCertificateLogo(requestUrl: string) {
  try {
    const res = await fetch(new URL("/brand/hr-foundation-emblem.png", requestUrl), { cache: "force-cache" });
    return res.ok ? new Uint8Array(await res.arrayBuffer()) : null;
  } catch {
    return null;
  }
}
