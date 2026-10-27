"use server";

import { revalidatePath, updateTag } from "next/cache";
import { Types } from "mongoose";
import { z } from "zod";
import { ActionError, runAction, type ActionResult } from "@/lib/actions";
import { audit } from "@/lib/audit";
import { authorize, AuthError } from "@/lib/auth/dal";
import { connectDb } from "@/lib/db/connect";
import { Setting } from "@/lib/db/models/system";
import { loadSettings, taxExemptionSchema, type TaxExemption } from "@/lib/settings";
import { deleteFile, putFile, UploadError, validateUpload } from "@/lib/storage";

const KINDS = { reg12A: "12A registration", reg80G: "80G approval" } as const;
type Kind = keyof typeof KINDS;

async function save(value: TaxExemption, admin: { id: string; name: string }) {
  await Setting.updateOne(
    { _id: "taxExemption" },
    { $set: { value: taxExemptionSchema.parse(value), updatedBy: new Types.ObjectId(admin.id), updatedByName: admin.name } },
    { upsert: true },
  );
  updateTag("settings");
  revalidatePath("/admin/settings/tax-exemption");
}

const isoOrEmpty = z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date.")]);
const detailsSchema = z.object({
  trustPan: z.union([z.literal(""), z.string().trim().toUpperCase().regex(/^[A-Z]{5}\d{4}[A-Z]$/, "Enter a valid PAN, e.g. ABCDE1234F.")]),
  reg12ANumber: z.string().trim().max(80),
  reg12AFrom: isoOrEmpty,
  reg12ATo: isoOrEmpty,
  reg80GNumber: z.string().trim().max(80),
  reg80GFrom: isoOrEmpty,
  reg80GTo: isoOrEmpty,
});

/** Registration numbers, validity and the trust PAN (printed on receipts once 80G is active). */
export async function saveTaxDetails(input: unknown) {
  return runAction("settings:manage", detailsSchema, input, async (d, admin) => {
    await connectDb();
    const cur = await loadSettings("taxExemption");
    await save(
      {
        trustPan: d.trustPan,
        reg12A: { ...cur.reg12A, number: d.reg12ANumber, validFrom: d.reg12AFrom, validTo: d.reg12ATo },
        reg80G: { ...cur.reg80G, number: d.reg80GNumber, validFrom: d.reg80GFrom, validTo: d.reg80GTo },
      },
      admin,
    );
    await audit(admin, { action: "settings.tax_details_updated", entityType: "Setting", entityId: "taxExemption", summary: "Updated 12A/80G registration details." });
    return { ok: true, message: "Registration details saved." };
  });
}

/** Uploads (or replaces) the approval certificate PDF for 12A or 80G. Stored privately; sent only to donors with their receipt. */
export async function uploadTaxCertificate(form: FormData): Promise<ActionResult> {
  try {
    const admin = await authorize("settings:manage");
    const kind = String(form.get("kind") ?? "") as Kind;
    if (!(kind in KINDS)) return { ok: false, error: "Unknown certificate type." };
    if (form.get("confirm") !== "on") return { ok: false, error: "Confirm this is the official approval issued by the Income Tax Department.", fieldErrors: { confirm: "Required." } };
    const v = await validateUpload(form.get("file") as File, { allowed: ["application/pdf"], maxBytes: 10 * 1024 * 1024 });
    await connectDb();
    const cur = await loadSettings("taxExemption");
    const fileId = await putFile("private_files", { bytes: v.bytes, filename: v.filename, mime: v.mime, metadata: { kind: `tax-certificate:${kind}` } });
    const previous = cur[kind].fileId;
    await save({ ...cur, [kind]: { ...cur[kind], fileId: fileId.toString(), fileName: v.filename } }, admin);
    if (previous) await deleteFile("private_files", previous);
    await audit(admin, { action: "settings.tax_certificate_uploaded", entityType: "Setting", entityId: "taxExemption", summary: `Uploaded ${KINDS[kind]} certificate “${v.filename}”.` });
    return { ok: true, message: `${KINDS[kind]} certificate uploaded.` };
  } catch (error) {
    if (error instanceof UploadError) return { ok: false, error: error.message, fieldErrors: { file: error.message } };
    if (error instanceof AuthError) return { ok: false, error: error.message };
    console.error("[tax certificate upload]", error);
    return { ok: false, error: "The certificate could not be uploaded." };
  }
}

export async function removeTaxCertificate(input: unknown) {
  return runAction("settings:manage", z.object({ kind: z.enum(["reg12A", "reg80G"]) }), input, async (d, admin) => {
    await connectDb();
    const cur = await loadSettings("taxExemption");
    const fileId = cur[d.kind].fileId;
    if (!fileId) throw new ActionError("No certificate is uploaded.");
    await save({ ...cur, [d.kind]: { ...cur[d.kind], fileId: null, fileName: null } }, admin);
    await deleteFile("private_files", fileId);
    await audit(admin, { action: "settings.tax_certificate_removed", entityType: "Setting", entityId: "taxExemption", summary: `Removed ${KINDS[d.kind]} certificate.` });
    return { ok: true, message: "Certificate removed. It is no longer sent to donors." };
  });
}
