import Link from "next/link";
import { BadgeCheck, ClipboardList, FileText, HandCoins, Hourglass, Scale, ShieldCheck, Users } from "lucide-react";
import { DistributionList, MonthlyBarChart } from "@/components/admin/charts";
import { PageHeader } from "@/components/admin/page-header";
import { RangeTabs, StatCard } from "@/components/admin/stat-card";
import { StatusBadge } from "@/components/admin/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/admin/ui/card";
import { Notice } from "@/components/admin/ui/feedback";
import {
  claimStats,
  claimStatusDistribution,
  donationStats,
  membershipStats,
  memberStatusDistribution,
  RANGES,
  registrationsByMonth,
  verifiedDonationsByMonth,
  type RangeKey,
} from "@/lib/admin/stats";
import { requireAdmin } from "@/lib/auth/dal";
import { connectDb } from "@/lib/db/connect";
import { Claim, CLAIM_STATUS_LABELS } from "@/lib/db/models/claims";
import { SitePage } from "@/lib/db/models/content";
import { Donation, DONATION_STATUS_LABELS } from "@/lib/db/models/finance";
import { Member, MEMBER_STATUS_LABELS } from "@/lib/db/models/membership";
import { AuditLog } from "@/lib/db/models/system";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { formatPaise } from "@/lib/money";
import { loadSettings } from "@/lib/settings";

/** Authenticated, per-request page: navigation waits for the server. */
export const instant = false;

export const metadata = { title: "Dashboard" };

export default async function DashboardPage({ searchParams }: PageProps<"/admin">) {
  const admin = await requireAdmin();
  const has = (p: (typeof admin.permissions)[number]) => admin.permissions.includes(p);
  const rangeKey = ((await searchParams).range as RangeKey) in RANGES ? ((await searchParams).range as RangeKey) : "12m";
  const months = RANGES[rangeKey];
  await connectDb();
  const rules = await loadSettings("membershipRules");

  const showMembers = has("membership:read");
  const showDonations = has("donations:read");
  const showClaims = has("claims:read");
  const showContent = has("content:manage");

  const [mStats, dStats, cStats, publishedPages, regSeries, donSeries, mDist, cDist] = await Promise.all([
    showMembers ? membershipStats(rules) : null,
    showDonations ? donationStats() : null,
    showClaims ? claimStats() : null,
    showContent ? SitePage.countDocuments({ published: { $ne: null } }) : null,
    showMembers ? registrationsByMonth(months) : null,
    showDonations ? verifiedDonationsByMonth(months) : null,
    showMembers ? memberStatusDistribution() : null,
    showClaims ? claimStatusDistribution() : null,
  ]);

  const [recentApps, recentVerifications, recentDonations, recentClaims, recentAudit] = await Promise.all([
    showMembers ? Member.find().sort({ submittedAt: -1 }).limit(5).select("fullName applicationRef status submittedAt").lean() : [],
    showMembers ? AuditLog.find({ action: "membership.payment_verified" }).sort({ at: -1 }).limit(5).lean() : [],
    showDonations ? Donation.find().sort({ createdAt: -1 }).limit(5).select("reference donorName amountPaise status donatedOn").lean() : [],
    showClaims ? Claim.find().sort({ submittedAt: -1 }).limit(5).select("reference memberName status submittedAt").lean() : [],
    has("audit:read") ? AuditLog.find().sort({ at: -1 }).limit(8).lean() : [],
  ]);

  const nothing = !showMembers && !showDonations && !showClaims && !showContent;

  return (
    <>
      <PageHeader
        title={`Welcome, ${admin.name.split(" ")[0]}`}
        description="All figures are counted directly from the database. Only verified donations are included in donation totals."
        actions={(showMembers || showDonations) && <RangeTabs current={rangeKey} basePath="/admin" />}
      />

      {!rules.schemeApproved && showMembers && (
        <Notice className="mb-6">
          The death-benefit scheme is marked as <strong>proposed</strong> in Membership Rules. Claim approvals are blocked until it is formally approved.
        </Notice>
      )}

      {nothing && <Notice tone="info">Your role has no dashboard data. Use the sidebar to open your sections.</Notice>}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {mStats && (
          <>
            <StatCard label="Total members" value={mStats.total} note="Activated memberships (any status)" href="/admin/membership/members?status=" icon={<Users aria-hidden />} />
            <StatCard label="Active members" value={mStats.active} href="/admin/membership/members" icon={<BadgeCheck aria-hidden />} />
            <StatCard label="Applications awaiting review" value={mStats.awaiting} note={`${mStats.pendingPayment} more awaiting payment`} href="/admin/membership/applications?status=pending_approval" icon={<ClipboardList aria-hidden />} />
            <StatCard label="In waiting period" value={mStats.inWaiting} note="Active, under age limit" href="/admin/membership/waiting-period?waiting=in_progress" icon={<Hourglass aria-hidden />} />
            <StatCard label="Waiting period completed" value={mStats.completed} note="Not a guarantee of benefit" href="/admin/membership/waiting-period?waiting=completed" icon={<Hourglass aria-hidden />} />
          </>
        )}
        {dStats && (
          <>
            <StatCard label="Verified donations" value={formatPaise(dStats.verifiedPaise)} note={`${dStats.verifiedCount} verified record(s)`} href="/admin/donations?status=verified" icon={<HandCoins aria-hidden />} />
            <StatCard label="Awaiting reconciliation" value={dStats.awaiting} href="/admin/donations/reconciliation" icon={<Scale aria-hidden />} />
          </>
        )}
        {cStats && (
          <>
            <StatCard label="Claims awaiting review" value={cStats.awaiting} href="/admin/claims" icon={<ShieldCheck aria-hidden />} />
            <StatCard label="Approved claims" value={cStats.approved} note="Approved, payment pending or paid" href="/admin/claims?status=approved" icon={<ShieldCheck aria-hidden />} />
          </>
        )}
        {publishedPages !== null && <StatCard label="Published website pages" value={publishedPages} note="Pages with published edits" href="/admin/content/pages" icon={<FileText aria-hidden />} />}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        {regSeries && (
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Membership registrations</CardTitle>
                <CardDescription>Applications received per month (website and paper).</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <MonthlyBarChart data={regSeries} valueLabel="Applications" title="Membership applications per month" />
            </CardContent>
          </Card>
        )}
        {donSeries && (
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Verified donations</CardTitle>
                <CardDescription>Sum of verified donations by donation date.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <MonthlyBarChart data={donSeries} valueLabel="Verified donations" kind="currency" title="Verified donations per month" />
            </CardContent>
          </Card>
        )}
        {mDist && (
          <Card>
            <CardHeader>
              <CardTitle>Application status</CardTitle>
            </CardHeader>
            <CardContent>
              <DistributionList items={mDist} />
            </CardContent>
          </Card>
        )}
        {cDist && (
          <Card>
            <CardHeader>
              <CardTitle>Death-benefit claim status</CardTitle>
            </CardHeader>
            <CardContent>
              <DistributionList items={cDist} />
            </CardContent>
          </Card>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        {showMembers && (
          <Recent title="Recent applications" empty="No applications yet." href="/admin/membership/applications">
            {recentApps.map((m) => (
              <RecentItem key={m._id.toString()} href={`/admin/membership/members/${m._id}`} primary={m.fullName} secondary={fmtDateTime(m.submittedAt)}>
                <StatusBadge status={m.status} label={MEMBER_STATUS_LABELS[m.status]} />
              </RecentItem>
            ))}
          </Recent>
        )}
        {showMembers && (
          <Recent title="Recent payment verifications" empty="No verified payments yet." href="/admin/membership/payments?status=verified">
            {recentVerifications.map((a) => (
              <RecentItem key={a._id.toString()} href={`/admin/membership/members/${a.entityId}`} primary={a.summary} secondary={`${a.actorName} · ${fmtDateTime(a.at)}`} />
            ))}
          </Recent>
        )}
        {showDonations && (
          <Recent title="Recent donation records" empty="No donations recorded yet." href="/admin/donations">
            {recentDonations.map((d) => (
              <RecentItem key={d._id.toString()} href={`/admin/donations/${d._id}`} primary={`${formatPaise(d.amountPaise)} · ${d.donorName || "Anonymous"}`} secondary={fmtDate(d.donatedOn)}>
                <StatusBadge status={d.status} label={DONATION_STATUS_LABELS[d.status]} />
              </RecentItem>
            ))}
          </Recent>
        )}
        {showClaims && (
          <Recent title="Recent claims" empty="No claims submitted." href="/admin/claims">
            {recentClaims.map((c) => (
              <RecentItem key={c._id.toString()} href={`/admin/claims/${c._id}`} primary={`${c.reference} · ${c.memberName}`} secondary={fmtDateTime(c.submittedAt)}>
                <StatusBadge status={c.status} label={CLAIM_STATUS_LABELS[c.status]} />
              </RecentItem>
            ))}
          </Recent>
        )}
        {has("audit:read") && (
          <Recent title="Administrative actions" empty="No actions recorded." href="/admin/audit">
            {recentAudit.map((a) => (
              <RecentItem key={a._id.toString()} primary={a.summary} secondary={`${a.actorName} · ${fmtDateTime(a.at)}`} />
            ))}
          </Recent>
        )}
      </div>
    </>
  );
}

function Recent({ title, href, empty, children }: { title: string; href: string; empty: string; children: React.ReactNode[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <Link href={href} className="text-sm font-semibold text-emerald-ink hover:underline">
          View all<span className="sr-only">: {title}</span>
        </Link>
      </CardHeader>
      <CardContent className="py-2">{children.length ? <ul className="divide-y divide-line">{children}</ul> : <p className="py-6 text-center text-sm text-muted">{empty}</p>}</CardContent>
    </Card>
  );
}

function RecentItem({ primary, secondary, href, children }: { primary: string; secondary: string; href?: string; children?: React.ReactNode }) {
  const text = (
    <span className="min-w-0">
      <span className="block truncate text-sm font-medium text-charcoal">{primary}</span>
      <span className="block text-xs text-muted">{secondary}</span>
    </span>
  );
  return (
    <li className="flex items-center justify-between gap-3 py-2.5">
      {href ? (
        <Link href={href} className="min-w-0 hover:underline">
          {text}
        </Link>
      ) : (
        text
      )}
      {children}
    </li>
  );
}
