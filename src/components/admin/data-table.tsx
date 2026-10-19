"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { tableFeatures, useTable, type ColumnDef, type RowData } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { hrefWith, type ListQuery } from "@/lib/admin/list";
import { cn } from "@/lib/utils";

const features = tableFeatures({});
export type AdminColumn<T extends RowData> = ColumnDef<typeof features, T, unknown>;
export { features as tableFeaturesConfig };

/**
 * Data table rendered with TanStack Table. Sorting and pagination are server-side:
 * header and pager links update the URL, and the server component re-queries the database.
 */
export function DataTable<T extends RowData>({
  columns,
  data,
  query,
  sortable = {},
  total,
  page,
  pageSize,
  caption,
  getRowKey,
}: {
  columns: AdminColumn<T>[];
  data: T[];
  query: ListQuery;
  /** column id → sort key accepted by the server */
  sortable?: Record<string, string>;
  total: number;
  page: number;
  pageSize: number;
  caption: string;
  getRowKey?: (row: T) => string;
}) {
  const pathname = usePathname();
  const table = useTable({ features, columns, data, getRowId: getRowKey ? (row: T) => getRowKey(row) : undefined });
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[44rem] text-left text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead className="border-b border-line bg-ivory/70">
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id}>
                {group.headers.map((header) => {
                  const key = sortable[header.column.id];
                  const active = key && query.sort === key;
                  const dir = active ? query.dir ?? "desc" : null;
                  return (
                    <th
                      key={header.id}
                      scope="col"
                      aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : undefined}
                      className="px-4 py-3 text-xs font-semibold tracking-wide whitespace-nowrap text-muted uppercase"
                    >
                      {header.isPlaceholder ? null : key ? (
                        <Link
                          href={hrefWith(pathname, query, { sort: key, dir: active && dir === "desc" ? "asc" : "desc", page: null })}
                          className="inline-flex items-center gap-1 hover:text-forest"
                          scroll={false}
                        >
                          <table.FlexRender header={header} />
                          {active ? dir === "asc" ? <ArrowUp className="size-3.5" aria-hidden /> : <ArrowDown className="size-3.5" aria-hidden /> : <ArrowUpDown className="size-3.5 opacity-40" aria-hidden />}
                        </Link>
                      ) : (
                        <table.FlexRender header={header} />
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-line">
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-muted">
                  No records match the current filters.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="hover:bg-ivory/50">
                  {row.getAllCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 align-middle">
                      <table.FlexRender cell={cell} />
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 text-sm text-muted">
        <p>
          {total === 0 ? "No records" : `Showing ${from}–${to} of ${total}`}
        </p>
        <div className="flex items-center gap-1">
          <PagerLink disabled={page <= 1} href={hrefWith(pathname, query, { page: String(page - 1) })} label="Previous page">
            <ChevronLeft className="size-4" aria-hidden />
          </PagerLink>
          <span className="px-2 tabular-nums">
            Page {page} of {pages}
          </span>
          <PagerLink disabled={page >= pages} href={hrefWith(pathname, query, { page: String(page + 1) })} label="Next page">
            <ChevronRight className="size-4" aria-hidden />
          </PagerLink>
        </div>
      </nav>
    </div>
  );
}

function PagerLink({ href, disabled, label, children }: { href: string; disabled: boolean; label: string; children: React.ReactNode }) {
  const cls = "grid size-8 place-items-center rounded-md border border-line";
  if (disabled)
    return (
      <span aria-disabled className={cn(cls, "opacity-40")}>
        {children}
        <span className="sr-only">{label}</span>
      </span>
    );
  return (
    <Link href={href} className={cn(cls, "hover:bg-ivory")} scroll={false}>
      {children}
      <span className="sr-only">{label}</span>
    </Link>
  );
}
