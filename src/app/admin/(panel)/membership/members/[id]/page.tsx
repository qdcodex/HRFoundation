import Link from "next/link";
import { notFound } from "next/navigation";
import { Types } from "mongoose";
import { IssueLoginButton, MemberActions, NomineeEditor, NoteForm, PaymentVerifyActions } from "@/components/admin/membership/member-actions";
import { FileText } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/admin/ui/button";
import { Badge, StatusBadge } from "@/components/admin/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, DetailList } from "@/components/admin/ui/card";
import { AccessDenied, EmptyState, Notice } from "@/components/admin/ui/feedback";
import { guardPage } from "@/lib/auth/dal";
import { connectDb } from "@/lib/db/connect";
import { AdminUser } from "@/lib/db/models/auth";
import { Claim, CLAIM_STATUS_LABELS } from "@/lib/db/models/claims";
import { Member, MEMBER_STATUS_LABELS, MembershipPayment, Nominee, PAYMENT_METHOD_LABELS } from "@/lib/db/models/membership";
import { AuditLog } from "@/lib/db/models/system";
import { trackWaitingPeriod, TRACKER_LABELS } from "@/lib/domain/eligibility";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { formatPaise } from "@/lib/money";
import { loadSettings } from "@/lib/settings";
import { toIso, todayInIndia } from "@/lib/waiting-period";

/** Authenticated, per-request page: navigation waits for the server. */
export const instant = false;

export const metadata = { title: "Member" };

const PAYMENT_STATUS_LABEL: Record<string, string> = { verification_pending: "Verification pending", verified: "Verified", rejected: "Rejected" };

export default async function MemberDetailPage({ params }: PageProps<"/admin/membership/members/[id]">) {
  const { admin, allowed } = await guardPage("membership:read");
  if (!allowed) return <AccessDenied />;
  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) notFound();

  await connectDb();
  const member = await Member.findById(id).lean();
  if (!member) notFound();

  const can = (p: (typeof admin.permissions)[number]) => admin.permissions.includes(p);
  const rules = await loadSettings("membershipRules");
  const today = todayInIndia();
  const tracker = trackWaitingPeriod(member, rules, today);

  const [payments, nominee, claims, history] = await Promise.all([
    MembershipPayment.find({ memberId: member._id }).sort({ createdAt: -1 }).lean(),
    can("nominees:read") ? Nominee.findOne({ memberId: member._id }).lean() : null,
    can("claims:read") ? Claim.find({ memberId: member._id }).sort({ submittedAt: -1 }).select("reference status submittedAt").lean() : [],
    AuditLog.find({ entityType: "Member", entityId: id }).sort({ at: -1 }).limit(30).lean(),
  ]);
  const staffIds = [...new Set(payments.flatMap((p) => [p.recordedBy, p.verifiedBy].filter(Boolean).map(String)))];
  const staff = new Map((await AdminUser.find({ _id: { $in: staffIds } }).select("name").lean()).map((u) => [u._id.toString(), u.name]));
  const lastVerified = payments.filter((p) => p.status === "verified").sort((a, b) => b.paidOn.localeCompare(a.paidOn))[0];
  const title = member.membershipId ? `${member.fullName}` : `${member.fullName} (application)`;

  return (
    <>
      <PageHeader
        title={title}
        crumbs={[
          { label: "Membership", href: "/admin/membership" },
          member.membershipId ? { label: "Members", href: "/admin/membership/members" } : { label: "Applications", href: "/admin/membership/applications" },
          { label: member.membershipId ?? member.applicationRef },
        ]}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={member.status} label={MEMBER_STATUS_LABELS[member.status]} />
            {member.requiresReview && <Badge tone="warning">Requires review: {member.reviewReason}</Badge>}
            <span className="font-mono text-xs">{member.membershipId ?? member.applicationRef}</span>
          </span>
        }
        actions={
          <MemberActions
            memberId={id}
            status={member.status}
            requiresReview={member.requiresReview}
            canManage={can("membership:manage")}
            canPay={can("membership:payments")}
            today={toIso(today)}
            minEffectiveDate={lastVerified?.paidOn ?? null}
          />
        }
      />

      {member.statusReason && (
        <Notice className="mb-6">
          <strong>Latest status reason:</strong> {member.statusReason}
        </Notice>
      )}

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Personal & contact information</CardTitle>
            </CardHeader>
            <CardContent>
              <DetailList
                items={[
                  { label: "Full name", value: member.fullName },
                  { label: "Date of birth", value: `${fmtDate(member.dateOfBirth)} (age ${tracker.age ?? "—"})` },
                  { label: "Mobile", value: member.mobile },
                  { label: "Email", value: member.email || "—" },
                  { label: "Address", value: `${member.address}, ${member.district} – ${member.pinCode}` },
                ]}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Payment history</CardTitle>
                <CardDescription>Only verified payments count towards activation.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {payments.length === 0 ? (
                <p className="p-5 text-sm text-muted">No payments recorded.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[40rem] text-sm">
                    <caption className="sr-only">Membership payments</caption>
                    <thead className="bg-ivory/70 text-left text-xs text-muted uppercase">
                      <tr>
                        <th scope="col" className="px-5 py-2">Paid on</th>
                        <th scope="col" className="px-5 py-2">Amount</th>
                        <th scope="col" className="px-5 py-2">Method / reference</th>
                        <th scope="col" className="px-5 py-2">Status</th>
                        <th scope="col" className="px-5 py-2"><span className="sr-only">Actions</span></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {payments.map((p) => (
                        <tr key={p._id.toString()}>
                          <td className="px-5 py-3">{fmtDate(p.paidOn)}</td>
                          <td className="px-5 py-3 font-semibold tabular-nums">{formatPaise(p.amountPaise)}</td>
                          <td className="px-5 py-3">
                            {PAYMENT_METHOD_LABELS[p.method]}
                            {p.transactionRef && <span className="block font-mono text-xs text-muted">{p.transactionRef}</span>}
                            <span className="block text-xs text-muted">Recorded by {p.recordedBy ? (staff.get(String(p.recordedBy)) ?? "—") : "online payment (Razorpay)"}</span>
                          </td>
                          <td className="px-5 py-3">
                            <StatusBadge status={p.status} label={PAYMENT_STATUS_LABEL[p.status]} />
                            {p.verifiedAt && (
                              <span className="mt-1 block text-xs text-muted">
                                {p.status === "rejected" ? "Rejected" : "Verified"} by {staff.get(String(p.verifiedBy)) ?? "—"}, {fmtDateTime(p.verifiedAt)}
                              </span>
                            )}
                            {p.rejectionReason && <span className="block text-xs text-danger">{p.rejectionReason}</span>}
                          </td>
                          <td className="px-5 py-3 text-right">
                            {p.status === "verification_pending" && can("membership:payments") && (
                              <PaymentVerifyActions paymentId={p._id.toString()} summary={`${formatPaise(p.amountPaise)} via ${PAYMENT_METHOD_LABELS[p.method]}${p.transactionRef ? ` (${p.transactionRef})` : ""} on ${fmtDate(p.paidOn)}`} />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Internal notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {member.notes.length === 0 ? (
                <p className="text-sm text-muted">No notes yet.</p>
              ) : (
                <ul className="space-y-3">
                  {[...member.notes].reverse().map((n) => (
                    <li key={n._id.toString()} className="rounded-lg bg-ivory p-3 text-sm">
                      <p className="whitespace-pre-wrap">{n.text}</p>
                      <p className="mt-1 text-xs text-muted">
                        {n.byName} · {fmtDateTime(n.at)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
              {can("membership:manage") && <NoteForm memberId={id} />}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Record history</CardTitle>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <p className="text-sm text-muted">No recorded actions.</p>
              ) : (
                <ol className="space-y-3 border-l-2 border-line pl-4 text-sm">
                  {history.map((h) => (
                    <li key={h._id.toString()}>
                      <p>{h.summary}</p>
                      <p className="text-xs text-muted">
                        {h.actorName} · {fmtDateTime(h.at)}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Membership</CardTitle>
            </CardHeader>
            <CardContent>
              <DetailList
                items={[
                  { label: "Membership ID", value: member.membershipId ?? "Not yet issued" },
                  { label: "Application ref", value: <span className="font-mono text-xs">{member.applicationRef}</span> },
                  { label: "Application date", value: fmtDateTime(member.submittedAt) },
                  { label: "Source", value: member.source === "website" ? "Website form" : "Paper form (entered by staff)" },
                  { label: "Terms accepted", value: member.termsVersion },
                  { label: "Effective date", value: fmtDate(member.effectiveDate) },
                  { label: "Activated", value: fmtDateTime(member.activatedAt) },
                ]}
              />
            </CardContent>
          </Card>

          {member.membershipId && ["active", "suspended"].includes(member.status) && (
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Member portal & certificate</CardTitle>
                  <CardDescription>The member signs in with their membership ID. Their family uses the same login to submit a claim.</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <DetailList
                  items={[
                    { label: "Login issued", value: member.portal?.issuedAt ? fmtDateTime(member.portal.issuedAt) : "Not yet" },
                    { label: "Password", value: !member.portal?.issuedAt ? "—" : member.portal.mustChangePassword ? "Temporary (not yet changed)" : "Set by member" },
                    { label: "Last sign-in", value: member.portal?.lastLoginAt ? fmtDateTime(member.portal.lastLoginAt) : "Never" },
                  ]}
                />
                <div className="flex flex-wrap gap-2">
                  {can("membership:manage") && <IssueLoginButton memberId={id} issued={Boolean(member.portal?.issuedAt)} />}
                  <Button asChild variant="outline" size="sm">
                    <a href={`/admin/api/members/${id}/certificate`} target="_blank" rel="noopener">
                      <FileText aria-hidden /> Certificate (PDF)
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Waiting period</CardTitle>
                <CardDescription>{rules.waitingPeriodMonths} calendar months from the effective date.</CardDescription>
              </div>
              <StatusBadge status={tracker.status} label={TRACKER_LABELS[tracker.status]} />
            </CardHeader>
            <CardContent>
              <DetailList
                items={[
                  { label: "Starts", value: fmtDate(tracker.effective) },
                  { label: "Completes", value: fmtDate(tracker.completes) },
                  { label: "Days remaining", value: tracker.daysRemaining ?? "—" },
                  { label: `Age (under ${rules.benefitAgeLimit})`, value: tracker.age === null ? "—" : `${tracker.age} — ${tracker.ageEligible ? "within limit" : "not within limit"}` },
                  { label: "Status detail", value: tracker.reason },
                ]}
              />
              <p className="mt-3 text-xs text-muted">Completing the waiting period does not guarantee any payment. All approved conditions apply.</p>
            </CardContent>
          </Card>

          {can("nominees:read") && (
            <Card>
              <CardHeader>
                <CardTitle>Nominee</CardTitle>
                {can("nominees:manage") && (
                  <NomineeEditor
                    memberId={id}
                    nominee={nominee ? { name: nominee.name, relationship: nominee.relationship, relationshipOther: nominee.relationshipOther, mobile: nominee.mobile } : null}
                  />
                )}
              </CardHeader>
              <CardContent>
                {nominee ? (
                  <DetailList
                    items={[
                      { label: "Name", value: nominee.name },
                      { label: "Relationship", value: nominee.relationship === "other" ? nominee.relationshipOther : nominee.relationship },
                      { label: "Mobile", value: nominee.mobile },
                      { label: "Last updated", value: fmtDateTime(nominee.updatedAt) },
                    ]}
                  />
                ) : (
                  <p className="text-sm text-muted">No nominee recorded.</p>
                )}
              </CardContent>
            </Card>
          )}

          {can("claims:read") && (
            <Card>
              <CardHeader>
                <CardTitle>Claim history</CardTitle>
                {can("claims:review") && member.membershipId && (
                  <Link href={`/admin/claims/new?membershipId=${member.membershipId}`} className="text-sm font-semibold text-emerald-ink hover:underline">
                    Record a claim
                  </Link>
                )}
              </CardHeader>
              <CardContent>
                {claims.length === 0 ? (
                  <EmptyState title="No claims" />
                ) : (
                  <ul className="space-y-2 text-sm">
                    {claims.map((c) => (
                      <li key={c._id.toString()} className="flex items-center justify-between gap-2">
                        <Link href={`/admin/claims/${c._id}`} className="font-mono text-xs text-emerald-ink hover:underline">
                          {c.reference}
                        </Link>
                        <StatusBadge status={c.status} label={CLAIM_STATUS_LABELS[c.status]} />
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
