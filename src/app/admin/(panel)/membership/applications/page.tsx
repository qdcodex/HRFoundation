import Link from "next/link";
import { Plus } from "lucide-react";
import { ListFilters } from "@/components/admin/list-filters";
import { ApplicationsTable } from "@/components/admin/membership/member-tables";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/admin/ui/button";
import { AccessDenied } from "@/components/admin/ui/feedback";
import { flatParams } from "@/lib/admin/list";
import { MEMBER_STATUS_OPTIONS, PAYMENT_OPTIONS } from "@/lib/admin/membership-labels";
import { listMembers } from "@/lib/admin/membership-queries";
import { guardPage } from "@/lib/auth/dal";

/** Authenticated, per-request page: navigation waits for the server. */
export const instant = false;

export const metadata = { title: "Applications" };

export default async function ApplicationsPage({ searchParams }: PageProps<"/admin/membership/applications">) {
  const { admin, allowed } = await guardPage("membership:read");
  if (!allowed) return <AccessDenied />;
  const query = flatParams(await searchParams);
  const data = await listMembers(query, { scope: "applications", admin });

  return (
    <>
      <PageHeader
        title="Membership applications"
        description="Applications that are not yet active. Activation requires a verified payment and an approval decision."
        crumbs={[{ label: "Membership", href: "/admin/membership" }, { label: "Applications" }]}
        actions={
          admin.permissions.includes("membership:manage") && (
            <Button asChild>
              <Link href="/admin/membership/applications/new">
                <Plus aria-hidden /> Paper application
              </Link>
            </Button>
          )
        }
      />
      <div className="space-y-4">
        <ListFilters
          action="/admin/membership/applications"
          query={query}
          searchPlaceholder="Search name, application ref or mobile"
          filters={[
            { type: "select", name: "status", label: "Status", options: [...MEMBER_STATUS_OPTIONS.filter((o) => !["active", "suspended"].includes(o.value))] },
            { type: "select", name: "payment", label: "Payment", options: PAYMENT_OPTIONS },
            { type: "date", name: "from", label: "Applied from" },
            { type: "date", name: "to", label: "Applied to" },
          ]}
        />
        <ApplicationsTable rows={data.rows} total={data.total} page={data.page} pageSize={data.pageSize} query={query} />
      </div>
    </>
  );
}
