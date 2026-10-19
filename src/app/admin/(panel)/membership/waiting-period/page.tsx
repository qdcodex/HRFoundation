import Link from "next/link";
import { ListFilters } from "@/components/admin/list-filters";
import { TrackerTable } from "@/components/admin/membership/tracker-table";
import { PageHeader } from "@/components/admin/page-header";
import { AccessDenied, Notice } from "@/components/admin/ui/feedback";
import { flatParams, hrefWith } from "@/lib/admin/list";
import { TRACKER_OPTIONS } from "@/lib/admin/membership-labels";
import { listMembers, trackerCounts } from "@/lib/admin/membership-queries";
import { guardPage } from "@/lib/auth/dal";
import { cn } from "@/lib/utils";

/** Authenticated, per-request page: navigation waits for the server. */
export const instant = false;

export const metadata = { title: "Waiting period tracker" };

export default async function WaitingPeriodPage({ searchParams }: PageProps<"/admin/membership/waiting-period">) {
  const { admin, allowed } = await guardPage("membership:read");
  if (!allowed) return <AccessDenied />;
  const query = flatParams(await searchParams);
  const data = await listMembers(query, { scope: "tracker", admin });
  const counts = await trackerCounts(data.rules);

  return (
    <>
      <PageHeader
        title="Waiting-period tracker"
        description={`The waiting period is ${data.rules.waitingPeriodMonths} calendar months from the effective membership date; when the target month is shorter, the last day of that month is used (e.g. 31 Aug → 28/29 Feb).`}
        crumbs={[{ label: "Membership", href: "/admin/membership" }, { label: "Waiting period" }]}
      />
      <Notice className="mb-4">
        “Waiting Period Completed” means only that this condition is met. Eligibility for benefit consideration also requires active membership, the age
        criterion (under {data.rules.benefitAgeLimit}), verification of a claim and the approved rules. Nothing is approved automatically.
      </Notice>
      <ul className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6" aria-label="Counts by waiting status">
        {TRACKER_OPTIONS.map((o) => {
          const active = query.waiting === o.value;
          return (
            <li key={o.value}>
              <Link
                href={hrefWith("/admin/membership/waiting-period", {}, { waiting: active ? null : o.value })}
                aria-current={active ? "true" : undefined}
                className={cn("block rounded-xl border bg-white p-3 hover:border-forest", active ? "border-forest ring-2 ring-forest/20" : "border-line")}
              >
                <span className="block text-xs text-muted">{o.value === "approaching" ? `Completing in ${data.rules.approachingDays} days` : o.label}</span>
                <span className="font-display text-2xl font-extrabold text-forest tabular-nums">{counts[o.value as keyof typeof counts]}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="space-y-4">
        <ListFilters
          action="/admin/membership/waiting-period"
          query={query}
          searchPlaceholder="Search membership ID, name or mobile"
          filters={[
            { type: "select", name: "waiting", label: "Waiting status", options: TRACKER_OPTIONS },
            {
              type: "select",
              name: "status",
              label: "Membership",
              options: [
                { value: "active", label: "Active" },
                { value: "suspended", label: "Suspended" },
              ],
            },
            {
              type: "select",
              name: "age",
              label: "Age",
              options: [
                { value: "eligible", label: `Under ${data.rules.benefitAgeLimit}` },
                { value: "over", label: `${data.rules.benefitAgeLimit} or over` },
              ],
            },
          ]}
        />
        <TrackerTable rows={data.rows} total={data.total} page={data.page} pageSize={data.pageSize} query={query} ageLimit={data.rules.benefitAgeLimit} />
      </div>
    </>
  );
}
