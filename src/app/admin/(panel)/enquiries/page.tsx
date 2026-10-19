import { Download } from "lucide-react";
import { ListFilters } from "@/components/admin/list-filters";
import { PageHeader } from "@/components/admin/page-header";
import { EnquiriesTable, type EnquiryRow } from "@/components/admin/system/enquiries-table";
import { Button } from "@/components/admin/ui/button";
import { AccessDenied } from "@/components/admin/ui/feedback";
import { escapeRegex, flatParams, istDayBoundary, parseList } from "@/lib/admin/list";
import { guardPage } from "@/lib/auth/dal";
import { connectDb } from "@/lib/db/connect";
import { Enquiry, ENQUIRY_STATUS_LABELS, ENQUIRY_STATUSES } from "@/lib/db/models/system";

export const instant = false;
export const metadata = { title: "Enquiries" };

export default async function EnquiriesPage({ searchParams }: PageProps<"/admin/enquiries">) {
  const { admin, allowed } = await guardPage("enquiries:read");
  if (!allowed) return <AccessDenied />;
  const query = flatParams(await searchParams);
  const list = parseList(query, { sortable: ["createdAt", "status", "name"], defaultSort: "createdAt" });
  await connectDb();
  const filter: Record<string, unknown> = {};
  if (query.status && (ENQUIRY_STATUSES as readonly string[]).includes(query.status)) filter.status = query.status;
  if (query.kind && ["contact", "volunteer", "partnership", "other"].includes(query.kind)) filter.kind = query.kind;
  if (query.assigned === "me") filter.assignedTo = admin.id;
  const from = istDayBoundary(query.from);
  const to = istDayBoundary(query.to, true);
  if (from || to) filter.createdAt = { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) };
  if (list.search) {
    const rx = new RegExp(escapeRegex(list.search), "i");
    filter.$or = [{ reference: rx }, { name: rx }, { email: rx }, { subject: rx }];
  }
  const [docs, total] = await Promise.all([
    Enquiry.find(filter).sort({ [list.sort]: list.dir, _id: -1 }).skip(list.skip).limit(list.pageSize).select("-message -notes").lean(),
    Enquiry.countDocuments(filter),
  ]);
  const rows: EnquiryRow[] = docs.map((e) => ({
    id: e._id.toString(),
    reference: e.reference,
    kind: e.kind,
    name: e.name,
    email: e.email ?? null,
    phone: e.phone ?? null,
    subject: e.subject,
    createdAt: e.createdAt.toISOString(),
    status: e.status,
    statusLabel: ENQUIRY_STATUS_LABELS[e.status],
    assignedToName: e.assignedToName ?? null,
  }));
  return (
    <>
      <PageHeader
        title="Contact & volunteer enquiries"
        description="Messages from the website's contact and get-involved forms. Personal contact details are visible only to staff with enquiry access."
        crumbs={[{ label: "Website" }, { label: "Enquiries" }]}
        actions={
          admin.permissions.includes("enquiries:export") && (
            <Button asChild variant="outline">
              <a href={`/admin/api/reports/enquiries?${new URLSearchParams(query).toString()}`}>
                <Download aria-hidden /> Export CSV
              </a>
            </Button>
          )
        }
      />
      <div className="space-y-4">
        <ListFilters
          action="/admin/enquiries"
          query={query}
          searchPlaceholder="Search reference, name, email or subject"
          filters={[
            { type: "select", name: "status", label: "Status", options: ENQUIRY_STATUSES.map((s) => ({ value: s, label: ENQUIRY_STATUS_LABELS[s] })) },
            {
              type: "select",
              name: "kind",
              label: "Type",
              options: [
                { value: "contact", label: "Contact" },
                { value: "volunteer", label: "Volunteer" },
                { value: "partnership", label: "Partnership" },
                { value: "other", label: "Other support" },
              ],
            },
            { type: "select", name: "assigned", label: "Assigned", options: [{ value: "me", label: "Assigned to me" }] },
            { type: "date", name: "from", label: "From" },
            { type: "date", name: "to", label: "To" },
          ]}
        />
        <EnquiriesTable rows={rows} total={total} page={list.page} pageSize={list.pageSize} query={query} />
      </div>
    </>
  );
}
