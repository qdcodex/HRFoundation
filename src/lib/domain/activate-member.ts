import "server-only";
import { Types } from "mongoose";
import { siteUrl } from "@/content/site";
import { audit } from "@/lib/audit";
import { nextSequence } from "@/lib/db/models/finance";
import { Member } from "@/lib/db/models/membership";
import { ActionError } from "@/lib/errors";
import { certificatePdf } from "@/lib/member-auth/certificate";
import { issueTemporaryPassword } from "@/lib/member-auth/credentials";
import { notify } from "@/lib/notifications";
import { loadSettings } from "@/lib/settings";
import { addMonthsClamped, ageOn, formatLong, parseIsoDate, toIso, type CalendarDate } from "@/lib/waiting-period";

type Actor = Parameters<typeof audit>[0];

/**
 * Activates a membership: assigns the next membership ID, sets the effective date (start of the
 * waiting period), issues portal login details and emails the certificate and login.
 * Used by the admin "Approve & activate" action and automatically after an online (Razorpay) payment.
 * The caller must already have checked that a verified payment exists.
 */
export async function activateMembership(opts: { memberId: Types.ObjectId | string; effective: CalendarDate; actor: Actor; reason?: string | null }) {
  const member = await Member.findById(opts.memberId).lean();
  if (!member) throw new ActionError("Application not found.");
  if (member.status !== "pending_approval") throw new ActionError("Only applications that are Pending Approval can be activated.");
  const rules = await loadSettings("membershipRules");
  if (ageOn(parseIsoDate(member.dateOfBirth)!, opts.effective) < rules.minApplicantAge) {
    throw new ActionError(`The applicant was under ${rules.minApplicantAge} on the effective date.`);
  }

  const effectiveDate = toIso(opts.effective);
  const seq = await nextSequence(`membershipId:${opts.effective.year}`);
  const membershipId = `HRF-M-${opts.effective.year}-${String(seq).padStart(5, "0")}`;
  const activated = await Member.findOneAndUpdate(
    { _id: member._id, status: "pending_approval", membershipId: null },
    {
      $set: {
        status: "active",
        membershipId,
        effectiveDate,
        activatedAt: new Date(),
        activatedBy: opts.actor.id ? new Types.ObjectId(opts.actor.id) : null,
        statusReason: opts.reason || null,
        statusChangedAt: new Date(),
      },
    },
    { returnDocument: "after" },
  ).lean();
  if (!activated) throw new ActionError("This application was already processed by someone else.");

  const waitingEnds = addMonthsClamped(opts.effective, rules.waitingPeriodMonths);
  const id = member._id.toString();
  await audit(opts.actor, {
    action: "membership.activated",
    entityType: "Member",
    entityId: id,
    summary: `Activated ${member.applicationRef} as ${membershipId}, effective ${effectiveDate}.`,
    details: { membershipId, effectiveDate, waitingEnds: toIso(waitingEnds) },
  });
  const password = await issueTemporaryPassword(activated._id);
  await audit(opts.actor, { action: "member_portal.login_issued", entityType: "Member", entityId: id, summary: `Issued member portal login for ${membershipId}.` });

  const cert = await certificatePdf(activated._id, siteUrl).catch(() => null);
  await notify(
    "membership_activated",
    activated.email,
    { name: activated.fullName, membershipId, effectiveDate: formatLong(opts.effective), waitingEnds: formatLong(waitingEnds) },
    { entity: "Member", id },
    { attachments: cert ? [{ filename: cert.filename, content: cert.bytes, contentType: "application/pdf" }] : undefined },
  );
  await sendLoginEmail(activated, membershipId, password, id);
  return { membershipId, name: activated.fullName, password, email: activated.email ?? null };
}

/** Emails the login details to the member; the admin copy and the stored log omit the password. */
export function sendLoginEmail(member: { fullName: string; email?: string | null }, membershipId: string, password: string, memberId: string) {
  return notify(
    "member_login_issued",
    member.email,
    { name: member.fullName, membershipId, password, loginUrl: `${siteUrl}/member/login` },
    { entity: "Member", id: memberId },
    { privateVars: ["password"] },
  );
}
