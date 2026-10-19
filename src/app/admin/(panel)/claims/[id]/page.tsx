import Link from "next/link";
import { notFound } from "next/navigation";
import { Types } from "mongoose";
import { CheckCircle2, FileText, XCircle } from "lucide-react";
import { ClaimDocumentUpload, ClaimNoteForm, ClaimWorkflow } from "@/components/admin/claims/claim-actions";
import { PageHeader } from "@/components/admin/page-header";
import { Badge, StatusBadge } from "@/components/admin/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, DetailList } from "@/components/admin/ui/card";
import { AccessDenied, Notice } from "@/components/admin/ui/feedback";
import { guardPage } from "@/lib/auth/dal";
import { permissionsFor } from "@/lib/auth/permissions";
import { connectDb } from "@/lib/db/connect";
import { AdminUser } from "@/lib/db/models/auth";
import { Claim, ClaimDocument, CLAIM_STATUS_LABELS } from "@/lib/db/models/claims";
import { Member, MEMBER_STATUS_LABELS, MembershipPayment } from "@/lib/db/models/membership";
import { AuditLog } from "@/lib/db/models/system";
import { evaluateClaimEligibility } from "@/lib/domain/eligibility";
import { fmtDate, fmtDateTime, maskMobile } from "@/lib/format";
import { formatPaise, paiseToRupeesInput } from "@/lib/money";
import { loadSettings } from "@/lib/settings";
import { toIso, todayInIndia } from "@/lib/waiting-period";

export const instant = false;
export const metadata = { title: "Claim" };

const VIA: Record<string, string> = { in_person: "In person", post: "Post", email: "Email", phone: "Phone" };

export default async function ClaimPage({ params }: PageProps<"/admin/claims/[id]">) {
  const { admin, allowed } = await guardPage("claims:read");
  if (!allowed) return <AccessDenied />;
  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) notFound();
  await connectDb();
  const claim = await Claim.findById(id).lean();
  if (!claim) notFound();

  const has = (p: (typeof admin.permissions)[number]) => admin.permissions.includes(p);
  const perms = { review: has("claims:review"), decide: has("claims:decide"), payments: has("claims:payments"), documents: has("claims:documents") };
  const showClaimant = has("nominees:read") || perms.review;
  const rules = await loadSettings("membershipRules");

  const [member, verifiedPaymentCount, documents, history, users] = await Promise.all([
    Member.findById(claim.memberId).lean(),
    MembershipPayment.countDocuments({ memberId: claim.memberId, status: "verified" }),
    perms.documents ? ClaimDocument.find({ claimId: claim._id }).sort({ createdAt: -1 }).lean() : [],
    AuditLog.find({ entityType: "Claim", entityId: id }).sort({ at: -1 }).limit(40).lean(),
    perms.review ? AdminUser.find({ active: true }).select("name roles extraPermissions").lean() : [],
  ]);
  const reviewers = users.filter((u) => permissionsFor(u.roles, u.extraPermissions).has("claims:review")).map((u) => ({ id: u._id.toString(), name: u.name }));

  // Live eligibility (re-computed again on the server at decision time).
  const eligibility = member ? evaluateClaimEligibility({ ...member, verifiedPaymentCount }, claim.dateOfDeath, rules) : [];
  const allPassed = eligibility.length > 0 && eligibility.every((c) => c.passed);
  const shownChecks = claim.decision?.eligibility?.length ? claim.decision.eligibility : eligibility;

  return (
    <>
      <PageHeader
        title={`Claim ${claim.reference}`}
        crumbs={[{ label: "Claims", href: "/admin/claims" }, { label: claim.reference }]}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={claim.status} label={CLAIM_STATUS_LABELS[claim.status]} />
            <span>
              Member{" "}
              <Link href={`/admin/membership/members/${claim.memberId}`} className="font-semibold text-emerald-ink hover:underline">
                {claim.memberName} ({claim.membershipId})
              </Link>
            </span>
          </span>
        }
        actions={
          <ClaimWorkflow
            claimId={id}
            status={claim.status}
            perms={perms}
            allPassed={allPassed}
            maxAllowed={formatPaise(rules.maxBenefitPaise)}
            approvedAmount={claim.decision?.approvedAmountPaise ? paiseToRupeesInput(claim.decision.approvedAmountPaise) : null}
            reviewers={reviewers}
            assignedTo={claim.assignedTo?.toString() ?? null}
            today={toIso(todayInIndia())}
          />
        }
      />

      {!rules.schemeApproved && <Notice className="mb-6">The scheme is marked as proposed, so approval is blocked. Review, notes and rejection remain available.</Notice>}

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Eligibility checks</CardTitle>
                <CardDescription>
                  {claim.decision ? `Snapshot saved with the decision on ${fmtDateTime(claim.decision.at)}.` : "Computed from current records. Re-checked on the server when a decision is saved."}
                </CardDescription>
              </div>
              <Badge tone={allPassed ? "success" : "warning"}>{allPassed ? "All conditions met" : "Conditions not met"}</Badge>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {shownChecks.map((c) => (
                  <li key={c.key} className="flex gap-3 text-sm">
                    {c.passed ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald" aria-label="Passed" /> : <XCircle className="mt-0.5 size-5 shrink-0 text-danger" aria-label="Not met" />}
                    <span>
                      <span className="font-semibold">{c.label}</span>
                      <span className="block text-muted">{c.detail}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs text-muted">Meeting these conditions makes a claim eligible for consideration only. A person with decision authority must record the outcome.</p>
            </CardContent>
          </Card>

          {perms.documents && (
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Supporting documents</CardTitle>
                  <CardDescription>Stored privately. Every view is recorded in the audit log.</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {documents.length === 0 ? (
                  <p className="text-sm text-muted">No documents uploaded.</p>
                ) : (
                  <ul className="divide-y divide-line">
                    {documents.map((d) => (
                      <li key={d._id.toString()} className="flex flex-wrap items-center justify-between gap-3 py-2.5 text-sm">
                        <span className="flex items-center gap-2">
                          <FileText className="size-4 text-muted" aria-hidden />
                          <span>
                            <span className="font-semibold">{d.kind}</span>
                            <span className="block text-xs text-muted">
                              {d.originalName} · {Math.round(d.size / 1024)} KB · {d.uploadedByName}, {fmtDateTime(d.createdAt)}
                            </span>
                          </span>
                        </span>
                        <span className="flex gap-3">
                          <a href={`/admin/api/files/claim/${d._id}`} target="_blank" rel="noopener" className="font-semibold text-emerald-ink hover:underline">
                            View<span className="sr-only"> {d.kind} (opens in new tab)</span>
                          </a>
                          <a href={`/admin/api/files/claim/${d._id}?download=1`} className="font-semibold text-emerald-ink hover:underline">
                            Download<span className="sr-only"> {d.kind}</span>
                          </a>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {perms.review && claim.status !== "closed" && <ClaimDocumentUpload claimId={id} />}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Verification notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {claim.verificationNotes.length === 0 ? (
                <p className="text-sm text-muted">No notes yet.</p>
              ) : (
                <ul className="space-y-3">
                  {[...claim.verificationNotes].reverse().map((n) => (
                    <li key={n._id.toString()} className="rounded-lg bg-ivory p-3 text-sm">
                      <p className="whitespace-pre-wrap">{n.text}</p>
                      <p className="mt-1 text-xs text-muted">
                        {n.byName} · {fmtDateTime(n.at)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
              {perms.review && claim.status !== "closed" && <ClaimNoteForm claimId={id} />}
            </CardContent>
          </Card>

          {claim.infoRequests.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Information requests</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm">
                  {claim.infoRequests.map((r) => (
                    <li key={r._id.toString()} className="rounded-lg border border-line p-3">
                      <p className="whitespace-pre-wrap">{r.message}</p>
                      <p className="mt-1 text-xs text-muted">
                        Requested by {r.requestedByName}, {fmtDateTime(r.at)} ·{" "}
                        {r.resolvedAt ? `Received ${fmtDateTime(r.resolvedAt)}: ${r.resolutionNote}` : <strong className="text-gold-ink">Awaiting response</strong>}
                      </p>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Audit trail</CardTitle>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Claim</CardTitle>
            </CardHeader>
            <CardContent>
              <DetailList
                items={[
                  { label: "Reference", value: <span className="font-mono text-xs">{claim.reference}</span> },
                  { label: "Submitted", value: fmtDateTime(claim.submittedAt) },
                  { label: "Received via", value: VIA[claim.receivedVia] },
                  { label: "Date of death", value: fmtDate(claim.dateOfDeath) },
                  { label: "Requested amount", value: claim.requestedAmountPaise ? formatPaise(claim.requestedAmountPaise) : "—" },
                  { label: "Reviewer", value: claim.assignedToName ?? "Unassigned" },
                ]}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Claimant</CardTitle>
              {claim.claimant.isNominee ? <Badge tone="success">Nominee on record</Badge> : <Badge tone="warning">Not the nominee</Badge>}
            </CardHeader>
            <CardContent>
              {showClaimant ? (
                <DetailList
                  items={[
                    { label: "Name", value: claim.claimant.name },
                    { label: "Relationship", value: claim.claimant.relationship },
                    { label: "Mobile", value: claim.claimant.mobile },
                    { label: "Email", value: claim.claimant.email || "—" },
                  ]}
                />
              ) : (
                <p className="text-sm text-muted">Claimant details are restricted. Mobile on record: {maskMobile(claim.claimant.mobile)}</p>
              )}
            </CardContent>
          </Card>
          {member && (
            <Card>
              <CardHeader>
                <CardTitle>Member</CardTitle>
              </CardHeader>
              <CardContent>
                <DetailList
                  items={[
                    { label: "Status", value: MEMBER_STATUS_LABELS[member.status] },
                    { label: "Effective date", value: fmtDate(member.effectiveDate) },
                    { label: "Date of birth", value: fmtDate(member.dateOfBirth) },
                  ]}
                />
              </CardContent>
            </Card>
          )}
          {claim.recommendation && (
            <Card>
              <CardHeader>
                <CardTitle>Recommendation</CardTitle>
                <Badge tone={claim.recommendation.outcome === "approve" ? "success" : "danger"}>{claim.recommendation.outcome === "approve" ? "Approve" : "Reject"}</Badge>
              </CardHeader>
              <CardContent className="text-sm">
                <p className="whitespace-pre-wrap">{claim.recommendation.note}</p>
                <p className="mt-2 text-xs text-muted">
                  {claim.recommendation.byName} · {fmtDateTime(claim.recommendation.at)}
                </p>
              </CardContent>
            </Card>
          )}
          {claim.decision && (
            <Card>
              <CardHeader>
                <CardTitle>Decision</CardTitle>
                <StatusBadge status={claim.decision.outcome} label={claim.decision.outcome === "approved" ? "Approved" : "Rejected"} />
              </CardHeader>
              <CardContent>
                <DetailList
                  items={[
                    { label: "Approved amount", value: claim.decision.approvedAmountPaise ? formatPaise(claim.decision.approvedAmountPaise) : "—" },
                    { label: "Limit at decision", value: formatPaise(claim.decision.maxAllowedPaise) },
                    { label: "Decided by", value: `${claim.decision.byName}, ${fmtDateTime(claim.decision.at)}` },
                    { label: "Reason", value: <span className="whitespace-pre-wrap">{claim.decision.reason}</span> },
                  ]}
                />
              </CardContent>
            </Card>
          )}
          {claim.payment && (
            <Card>
              <CardHeader>
                <CardTitle>Payment</CardTitle>
              </CardHeader>
              <CardContent>
                <DetailList
                  items={[
                    { label: "Amount", value: formatPaise(claim.payment.amountPaise) },
                    { label: "Paid on", value: fmtDate(claim.payment.paidOn) },
                    { label: "Reference", value: claim.payment.reference },
                    { label: "Recorded by", value: `${claim.payment.recordedByName}, ${fmtDateTime(claim.payment.at)}` },
                  ]}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
