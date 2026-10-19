import Link from "next/link";
import { BadgeCheck, ClipboardList, Hourglass, Users, Wallet } from "lucide-react";
import { DistributionList, MonthlyBarChart } from "@/components/admin/charts";
import { PageHeader } from "@/components/admin/page-header";
import { RangeTabs, StatCard } from "@/components/admin/stat-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/admin/ui/card";
import { AccessDenied, Notice } from "@/components/admin/ui/feedback";
import { listMembers } from "@/lib/admin/membership-queries";
import { membershipStats, memberStatusDistribution, RANGES, registrationsByMonth, type RangeKey } from "@/lib/admin/stats";
import { guardPage } from "@/lib/auth/dal";
import { MembershipPayment } from "@/lib/db/models/membership";
import { fmtDate } from "@/lib/format";
import { formatPaise } from "@/lib/money";

/** Authenticated, per-request page: navigation waits for the server. */
export const instant = false;

export const metadata = { title: "Membership dashboard" };

export default async function MembershipDashboard({ searchParams }: PageProps<"/admin/membership">) {
  const { admin, allowed } = await guardPage("membership:read");
  if (!allowed) return <AccessDenied />;
  const sp = await searchParams;
  const rangeKey = (sp.range as RangeKey) in RANGES ? (sp.range as RangeKey) : "12m";

  const approaching = await listMembers({ waiting: "approaching", sort: "effectiveDate", dir: "asc" }, { scope: "tracker", admin });
  const rules = approaching.rules;
  const [stats, series, dist, pendingPayments] = await Promise.all([
    membershipStats(rules),
    registrationsByMonth(RANGES[rangeKey]),
    memberStatusDistribution(),
    MembershipPayment.countDocuments({ status: "verification_pending" }),
  ]);

  return (
    <>
      <PageHeader
        title="Membership dashboard"
        crumbs={[{ label: "Membership" }]}
        description={
          <>
            Fee: {rules.feePaise ? `${formatPaise(rules.feePaise)} ${rules.feePeriod}` : "to be confirmed"} · Waiting period: {rules.waitingPeriodMonths} months · Maximum stated
            benefit: {formatPaise(rules.maxBenefitPaise)} · Age limit: under {rules.benefitAgeLimit}
          </>
        }
        actions={<RangeTabs current={rangeKey} basePath="/admin/membership" />}
      />
      {!rules.schemeApproved && (
        <Notice className="mb-6">The death-benefit provision is marked as proposed. Applications and memberships can be managed, but claim approvals are blocked.</Notice>
      )}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Total members" value={stats.total} href="/admin/membership/members?status=" icon={<Users aria-hidden />} />
        <StatCard label="Active" value={stats.active} href="/admin/membership/members" icon={<BadgeCheck aria-hidden />} />
        <StatCard label="Awaiting review" value={stats.awaiting} href="/admin/membership/applications?status=pending_approval" icon={<ClipboardList aria-hidden />} />
        <StatCard label="Payments to verify" value={pendingPayments} href="/admin/membership/payments?status=verification_pending" icon={<Wallet aria-hidden />} />
        <StatCard label="In waiting period" value={stats.inWaiting} href="/admin/membership/waiting-period?waiting=in_progress" icon={<Hourglass aria-hidden />} />
        <StatCard label="Waiting completed" value={stats.completed} href="/admin/membership/waiting-period?waiting=completed" icon={<Hourglass aria-hidden />} />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Applications per month</CardTitle>
          </CardHeader>
          <CardContent>
            <MonthlyBarChart data={series} valueLabel="Applications" title="Membership applications per month" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Status distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <DistributionList items={dist} />
          </CardContent>
        </Card>
        <Card className="xl:col-span-3">
          <CardHeader>
            <div>
              <CardTitle>Completing the waiting period in the next {rules.approachingDays} days</CardTitle>
              <CardDescription>Active members under the age limit.</CardDescription>
            </div>
            <Link href="/admin/membership/waiting-period?waiting=approaching" className="text-sm font-semibold text-emerald-ink hover:underline">
              Open tracker
            </Link>
          </CardHeader>
          <CardContent>
            {approaching.rows.length === 0 ? (
              <p className="text-sm text-muted">No members complete their waiting period in this window.</p>
            ) : (
              <ul className="divide-y divide-line">
                {approaching.rows.slice(0, 8).map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                    <Link href={`/admin/membership/members/${r.id}`} className="font-semibold text-forest hover:underline">
                      {r.fullName} <span className="font-mono text-xs font-normal text-muted">{r.membershipId}</span>
                    </Link>
                    <span className="text-muted">
                      Completes {fmtDate(r.waitingCompletes)} · {r.daysRemaining} days
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
