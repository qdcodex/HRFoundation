import "server-only";
import type { Types } from "mongoose";
import { connectDb } from "@/lib/db/connect";
import { Member, Nominee } from "@/lib/db/models/membership";
import { loadCertificateLogo, renderMembershipCertificate } from "@/lib/membership-certificate-pdf";
import { loadSettings } from "@/lib/settings";
import { toIso, todayInIndia } from "@/lib/waiting-period";

/** Certificate PDF bytes for an active or suspended member, or null when none can be issued. */
export async function certificatePdf(memberId: Types.ObjectId | string, baseUrl: string) {
  await connectDb();
  const member = await Member.findById(memberId).lean();
  if (!member?.membershipId || !member.effectiveDate || !["active", "suspended"].includes(member.status)) return null;
  const [nominee, rules, logoPng] = await Promise.all([
    Nominee.findOne({ memberId: member._id }).lean(),
    loadSettings("membershipRules"),
    loadCertificateLogo(baseUrl),
  ]);
  const bytes = await renderMembershipCertificate({
    member: { fullName: member.fullName, membershipId: member.membershipId, effectiveDate: member.effectiveDate, status: member.status },
    nominee,
    rules,
    issuedOn: toIso(todayInIndia()),
    logoPng,
  });
  return { membershipId: member.membershipId, filename: `${member.membershipId}-certificate.pdf`, bytes };
}

/** The certificate as an inline PDF response. */
export async function certificateResponse(memberId: Types.ObjectId | string, requestUrl: string) {
  const cert = await certificatePdf(memberId, requestUrl);
  if (!cert) return null;
  return {
    membershipId: cert.membershipId,
    response: new Response(new Uint8Array(cert.bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${cert.filename}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    }),
  };
}
