import Link from "next/link";
import { Download, Plus } from "lucide-react";
import { DonationsTable } from "@/components/admin/finance/finance-tables";
import { ListFilters } from "@/components/admin/list-filters";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { Button } from "@/components/admin/ui/button";
import { AccessDenied } from "@/components/admin/ui/feedback";
import { DONATION_FILTERS, listDonations } from "@/lib/admin/finance-queries";
import { flatParams } from "@/lib/admin/list";
import { donationStats } from "@/lib/admin/stats";
import { guardPage } from "@/lib/auth/dal";
import { formatPaise } from "@/lib/money";

export const instant = false;
export const metadata = { title: "Donations" };

export default async function DonationsPage({ searchParams }: PageProps<"/admin/donations">) {
  const { admin, allowed } = await guardPage("donations:read");
  if (!allowed) return <AccessDenied />;
  const query = flatParams(await searchParams);
  const [data, stats] = await Promise.all([listDonations(query), donationStats()]);
  const has = (p: (typeof admin.permissions)[number]) => admin.permissions.includes(p);

  return (
    <>
      <PageHeader
        title="Donations"
        description="Donations received through UPI, bank transfer, cheque or cash are recorded here and verified against the foundation's statements. Online gateway payments are not enabled."
        crumbs={[{ label: "Donations" }]}
        actions={
          <>
            {has("finance:reports") && (
              <Button asChild variant="outline">
                <a href={`/admin/api/reports/donations?${new URLSearchParams(query).toString()}`}>
                  <Download aria-hidden /> Export CSV
                </a>
              </Button>
            )}
            {has("donations:manage") && (
              <Button asChild>
                <Link href="/admin/donations/new">
                  <Plus aria-hidden /> Record donation
                </Link>
              </Button>
            )}
          </>
        }
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <StatCard label="Verified total" value={formatPaise(stats.verifiedPaise)} note={`${stats.verifiedCount} verified donation(s)`} />
        <StatCard label="Awaiting verification" value={stats.awaiting} href="/admin/donations/reconciliation" />
        <StatCard label="Totals include" value="Verified only" note="Pending, failed, cancelled and refunded are excluded" />
      </div>
      <div className="space-y-4">
        <ListFilters action="/admin/donations" query={query} filters={DONATION_FILTERS} searchPlaceholder="Search reference, donor or transaction ref" />
        <DonationsTable {...data} query={query} />
      </div>
    </>
  );
}
