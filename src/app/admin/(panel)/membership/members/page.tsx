import { Download } from "lucide-react";
import { ListFilters } from "@/components/admin/list-filters";
import { MembersTable } from "@/components/admin/membership/member-tables";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/admin/ui/button";
import { AccessDenied } from "@/components/admin/ui/feedback";
import { flatParams } from "@/lib/admin/list";
import { PAYMENT_OPTIONS, TRACKER_OPTIONS } from "@/lib/admin/membership-labels";
import { listMembers } from "@/lib/admin/membership-queries";
import { guardPage } from "@/lib/auth/dal";

/** Authenticated, per-request page: navigation waits for the server. */
export const instant = false;

export const metadata = { title: "Members" };

export default async function MembersPage({ searchParams }: PageProps<"/admin/membership/members">) {
  const { admin, allowed } = await guardPage("membership:read");
  if (!allowed) return <AccessDenied />;
  const query = flatParams(await searchParams);
  const data = await listMembers(query, { scope: "members", admin });
  const canExport = admin.permissions.includes("membership:export");

  return (
    <>
      <PageHeader
        title="Members"
        description={`Activated memberships. Defaults to Active; use the status filter for suspended members. Age eligibility uses the current limit (under ${data.rules.benefitAgeLimit}).`}
        crumbs={[{ label: "Membership", href: "/admin/membership" }, { label: "Members" }]}
        actions={
          canExport && (
            <Button asChild variant="outline">
              <a href={`/admin/api/reports/members?${new URLSearchParams(query).toString()}`}>
                <Download aria-hidden /> Export CSV
              </a>
            </Button>
          )
        }
      />
      <div className="space-y-4">
        <ListFilters
          action="/admin/membership/members"
          query={query}
          searchPlaceholder="Search membership ID, name or mobile"
          filters={[
            {
              type: "select",
              name: "status",
              label: "Status",
              options: [
                { value: "active", label: "Active" },
                { value: "suspended", label: "Suspended" },
              ],
            },
            { type: "select", name: "payment", label: "Payment", options: PAYMENT_OPTIONS },
            { type: "select", name: "waiting", label: "Waiting period", options: TRACKER_OPTIONS },
            {
              type: "select",
              name: "age",
              label: "Age",
              options: [
                { value: "eligible", label: `Under ${data.rules.benefitAgeLimit}` },
                { value: "over", label: `${data.rules.benefitAgeLimit} or over` },
              ],
            },
            { type: "date", name: "from", label: "Applied from" },
            { type: "date", name: "to", label: "Applied to" },
          ]}
        />
        <MembersTable rows={data.rows} total={data.total} page={data.page} pageSize={data.pageSize} query={query} showNominee={admin.permissions.includes("nominees:read")} />
      </div>
    </>
  );
}
