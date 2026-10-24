import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { CheckCircle2, Download, FileText, KeyRound } from "lucide-react";
import { ClaimDocumentUpload } from "@/components/forms/ClaimDocumentUpload";
import { ClaimForm } from "@/components/forms/ClaimForm";
import { MemberLogoutButton } from "@/components/forms/MemberAuthForms";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PendingNote } from "@/components/ui/States";
import { site } from "@/content/site";
import { Claim, ClaimDocument, CLAIM_STATUS_LABELS } from "@/lib/db/models/claims";
import { MEMBER_STATUS_LABELS, Nominee } from "@/lib/db/models/membership";
import { claimSla } from "@/lib/domain/claim-sla";
import { trackWaitingPeriod, TRACKER_LABELS } from "@/lib/domain/eligibility";
import { CLAIM_OPEN_FOR_UPLOAD } from "@/lib/domain/online-claim";
import { fmtDate, fmtDateTime, maskMobile } from "@/lib/format";
import { getMember } from "@/lib/member-auth/session";
import { loadSettings } from "@/lib/settings";
import { todayInIndia } from "@/lib/waiting-period";

export const metadata = { title: "My membership" };

export default function MemberHomePage({ searchParams }: PageProps<"/member">) {
  return (
    <section className="bg-ivory py-12 sm:py-16">
      <div className="container-site">
        <Suspense fallback={<div className="h-[32rem]" />}>
          <Dashboard searchParams={searchParams} />
        </Suspense>
      </div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b border-line py-3 last:border-0 sm:flex-row sm:justify-between sm:gap-6">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="font-semibold text-charcoal sm:text-right">{value}</dd>
    </div>
  );
}

async function Dashboard({ searchParams }: Pick<PageProps<"/member">, "searchParams">) {
  const member = await getMember();
  if (!member) redirect("/member/login");
  if (member.portal?.mustChangePassword) redirect("/member/password?required=1");
  const query = await searchParams;

  const [rules, nominee, claims] = await Promise.all([
    loadSettings("membershipRules"),
    Nominee.findOne({ memberId: member._id }).lean(),
    Claim.find({ memberId: member._id }).sort({ submittedAt: -1 }).select("reference status submittedAt dateOfDeath claimant.name infoRequests decision.outcome payment.paidOn").lean(),
  ]);
  const documents = claims.length
    ? await ClaimDocument.find({ claimId: { $in: claims.map((c) => c._id) } }).sort({ createdAt: 1 }).select("claimId kind originalName createdAt").lean()
    : [];
  const tracker = trackWaitingPeriod(member, rules, todayInIndia());
  const openClaim = claims.find((c) => CLAIM_OPEN_FOR_UPLOAD.includes(c.status) || ["approved", "payment_pending"].includes(c.status));
  const relationship = nominee ? (nominee.relationship === "other" ? (nominee.relationshipOther ?? "Other") : nominee.relationship) : "";

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow text-gold-ink">Member portal</p>
          <h1 className="mt-3 font-display text-4xl leading-tight font-extrabold text-forest">Welcome, {member.fullName}.</h1>
          <p className="mt-2 font-mono text-sm text-muted">{member.membershipId}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/member/password" className="inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold text-emerald-ink hover:underline">
            <KeyRound aria-hidden className="size-4" /> Change password
          </Link>
          <MemberLogoutButton />
        </div>
      </div>

      {query.password === "changed" && (
        <p role="status" className="flex items-center gap-2 rounded-xl border border-emerald/30 bg-sage px-4 py-3 text-sm font-medium text-forest">
          <CheckCircle2 aria-hidden className="size-5 text-emerald" /> Your password has been changed. Keep it safe and share it only with your nominee.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="rounded-[1.75rem] bg-white p-6 ring-1 ring-line sm:p-8 lg:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-xl font-bold text-forest">My membership</h2>
            <StatusBadge tone={member.status === "active" ? "confirmed" : "pending"}>{MEMBER_STATUS_LABELS[member.status]}</StatusBadge>
          </div>
          <dl className="mt-4">
            <Row label="Membership ID" value={<span className="font-mono">{member.membershipId}</span>} />
            <Row label="Effective date" value={fmtDate(member.effectiveDate)} />
            <Row label={`Waiting period (${rules.waitingPeriodMonths} months)`} value={TRACKER_LABELS[tracker.status]} />
            <Row label="Waiting period completes" value={fmtDate(tracker.completes)} />
            <Row label="Nominee" value={nominee ? `${nominee.name} (${relationship}, mobile ${maskMobile(nominee.mobile)})` : "Not recorded"} />
          </dl>
          <p className="mt-4 text-xs leading-relaxed text-muted">
            To change your nominee or contact details, email{" "}
            <a href={`mailto:${site.contact.email}`} className="text-emerald-ink underline underline-offset-2">
              {site.contact.email}
            </a>
            .
          </p>
        </div>

        <div className="flex flex-col justify-between rounded-[1.75rem] bg-forest p-6 text-ivory sm:p-8 lg:col-span-5">
          <div>
            <FileText aria-hidden className="size-8 text-gold" />
            <h2 className="mt-4 font-display text-xl font-bold">Membership certificate</h2>
            <p className="mt-2 leading-relaxed text-ivory/80">Download or print your certificate. It shows your membership ID, effective date and nominee.</p>
          </div>
          <a href="/member/certificate" target="_blank" rel="noopener" className="mt-6 inline-flex h-12 w-fit items-center gap-2 rounded-full bg-gold px-6 font-display font-semibold text-forest-deep hover:bg-gold/90">
            <Download aria-hidden className="size-4" /> Download certificate (PDF)
          </a>
        </div>
      </div>

      <div className="rounded-[1.75rem] bg-white p-6 ring-1 ring-line sm:p-8" id="claim">
        <h2 className="font-display text-xl font-bold text-forest">Claims</h2>
        <p className="mt-2 max-w-3xl leading-relaxed text-muted">
          For the family: if the member has passed away, the nominee can submit a claim here with the death certificate. After
          verification, the approved amount is transferred to the nominee&apos;s bank account. We aim to complete this within{" "}
          {rules.claimTargetDays} days of receiving complete documents.
        </p>

        {claims.map((c) => {
          const docs = documents.filter((d) => d.claimId.equals(c._id));
          const pendingRequests = c.infoRequests.filter((r) => !r.resolvedAt);
          const sla = claimSla(c, rules.claimTargetDays);
          return (
            <article key={c._id.toString()} className="mt-6 rounded-2xl border border-line p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-display font-bold text-forest">
                  Claim <span className="font-mono">{c.reference}</span>
                </p>
                <StatusBadge tone={["paid", "approved"].includes(c.status) ? "confirmed" : "pending"}>{CLAIM_STATUS_LABELS[c.status]}</StatusBadge>
              </div>
              <dl className="mt-3 grid gap-x-8 text-sm sm:grid-cols-2">
                <Row label="Submitted" value={fmtDateTime(c.submittedAt)} />
                <Row label="Date of death" value={fmtDate(c.dateOfDeath)} />
                {sla.kind === "running" && <Row label="Target completion" value={fmtDate(sla.dueOn)} />}
                {c.payment?.paidOn && <Row label="Paid on" value={fmtDate(c.payment.paidOn)} />}
              </dl>
              {pendingRequests.length > 0 && (
                <div className="mt-4 rounded-xl border border-gold/40 bg-gold-soft/40 p-4 text-sm">
                  <p className="font-semibold text-gold-ink">The foundation needs more information:</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    {pendingRequests.map((r) => (
                      <li key={r._id.toString()}>{r.message}</li>
                    ))}
                  </ul>
                </div>
              )}
              {docs.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-semibold text-charcoal">Documents received</p>
                  <ul className="mt-2 space-y-1 text-sm text-muted">
                    {docs.map((d) => (
                      <li key={d._id.toString()}>
                        {d.kind} — {d.originalName} ({fmtDateTime(d.createdAt)})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {CLAIM_OPEN_FOR_UPLOAD.includes(c.status) && (
                <div className="mt-5 border-t border-line pt-5">
                  <p className="mb-4 text-sm font-semibold text-charcoal">Add a document</p>
                  <ClaimDocumentUpload claimId={c._id.toString()} />
                </div>
              )}
            </article>
          );
        })}

        {!openClaim && (
          <div className="mt-8 border-t border-line pt-8">
            <h3 className="mb-6 font-display text-lg font-bold text-forest">Submit a claim</h3>
            {rules.schemeApproved ? (
              <ClaimForm targetDays={rules.claimTargetDays} portal />
            ) : (
              <PendingNote>
                Online claims open once the membership scheme is formally approved. Until then, please email{" "}
                <a href={`mailto:${site.contact.email}`} className="text-emerald-ink underline underline-offset-2">
                  {site.contact.email}
                </a>
                .
              </PendingNote>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
