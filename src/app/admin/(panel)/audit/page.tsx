import { ListFilters } from "@/components/admin/list-filters";
import { PageHeader } from "@/components/admin/page-header";
import { SimpleTable } from "@/components/admin/simple-table";
import { AccessDenied } from "@/components/admin/ui/feedback";
import { escapeRegex, flatParams, hrefWith, istDayBoundary, parseList } from "@/lib/admin/list";
import { guardPage } from "@/lib/auth/dal";
import { connectDb } from "@/lib/db/connect";
import { AuditLog } from "@/lib/db/models/system";
import { fmtDateTime } from "@/lib/format";
import Link from "next/link";

export const instant = false;
export const metadata = { title: "Audit log" };

const AREAS = ["auth", "users", "membership", "claims", "donations", "receipts", "content", "enquiries", "settings"];

export default async function AuditPage({ searchParams }: PageProps<"/admin/audit">) {
  const { allowed } = await guardPage("audit:read");
  if (!allowed) return <AccessDenied />;
  const query = flatParams(await searchParams);
  const list = parseList(query, { sortable: ["at"], defaultSort: "at", pageSize: 50 });
  await connectDb();
  const filter: Record<string, unknown> = {};
  if (query.area && AREAS.includes(query.area)) filter.action = new RegExp(`^${query.area}\\.`);
  const from = istDayBoundary(query.from);
  const to = istDayBoundary(query.to, true);
  if (from || to) filter.at = { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) };
  if (list.search) {
    const rx = new RegExp(escapeRegex(list.search), "i");
    filter.$or = [{ summary: rx }, { actorName: rx }, { actorEmail: rx }, { entityId: rx }];
  }
  const [rows, total] = await Promise.all([AuditLog.find(filter).sort({ at: -1 }).skip(list.skip).limit(list.pageSize).lean(), AuditLog.countDocuments(filter)]);
  const pages = Math.max(1, Math.ceil(total / list.pageSize));
  return (
    <>
      <PageHeader
        title="Audit log"
        description="An append-only record of sign-ins and sensitive actions. Personal values are redacted from stored details. Entries cannot be edited or deleted from the dashboard."
        crumbs={[{ label: "Administration" }, { label: "Audit log" }]}
      />
      <div className="space-y-4">
        <ListFilters
          action="/admin/audit"
          query={query}
          searchPlaceholder="Search summary, person or record ID"
          filters={[
            { type: "select", name: "area", label: "Area", options: AREAS.map((a) => ({ value: a, label: a[0].toUpperCase() + a.slice(1) })) },
            { type: "date", name: "from", label: "From" },
            { type: "date", name: "to", label: "To" },
          ]}
        />
        <SimpleTable
          caption="Audit log entries"
          headers={["When", "Who", "Action", "Summary"]}
          empty="No entries match."
          rows={rows.map((r) => [
            <span key="w" className="text-xs whitespace-nowrap text-muted">
              {fmtDateTime(r.at)}
            </span>,
            <span key="p" className="text-sm">
              {r.actorName}
              {r.actorEmail && <span className="block text-xs text-muted">{r.actorEmail}</span>}
            </span>,
            <code key="a" className="text-xs">
              {r.action}
            </code>,
            <span key="s" className="text-sm">
              {r.summary}
              {r.details && (
                <details className="mt-1 text-xs text-muted">
                  <summary className="cursor-pointer">Details</summary>
                  <pre className="mt-1 max-w-xl overflow-x-auto rounded bg-ivory p-2 whitespace-pre-wrap">{JSON.stringify(r.details, null, 2)}</pre>
                </details>
              )}
            </span>,
          ])}
        />
        <nav aria-label="Pagination" className="flex items-center justify-between text-sm text-muted">
          <span>
            {total} entries · page {list.page} of {pages}
          </span>
          <span className="flex gap-3">
            {list.page > 1 && (
              <Link href={hrefWith("/admin/audit", query, { page: String(list.page - 1) })} className="font-semibold text-emerald-ink">
                Previous
              </Link>
            )}
            {list.page < pages && (
              <Link href={hrefWith("/admin/audit", query, { page: String(list.page + 1) })} className="font-semibold text-emerald-ink">
                Next
              </Link>
            )}
          </span>
        </nav>
      </div>
    </>
  );
}
