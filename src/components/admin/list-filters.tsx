import Link from "next/link";
import { Search, X } from "lucide-react";
import type { ListQuery } from "@/lib/admin/list";
import { Button } from "./ui/button";
import { Input, NativeSelect } from "./ui/form";

export type FilterDef =
  | { type: "select"; name: string; label: string; options: { value: string; label: string }[] }
  | { type: "date"; name: string; label: string };

/**
 * Search + filter bar. A plain GET form: works without JavaScript and keeps state in the URL,
 * so filtered views can be bookmarked and shared with colleagues who have the same access.
 */
export function ListFilters({
  action,
  query,
  filters = [],
  searchPlaceholder = "Search…",
  keep = [],
}: {
  action: string;
  query: ListQuery;
  filters?: FilterDef[];
  searchPlaceholder?: string;
  /** query keys to carry over (e.g. "tab") */
  keep?: string[];
}) {
  const active = Boolean(query.q) || filters.some((f) => query[f.name]);
  return (
    <form action={action} method="get" role="search" className="flex flex-wrap items-end gap-3 rounded-xl border border-line bg-white p-3">
      {keep.map((k) => query[k] && <input key={k} type="hidden" name={k} value={query[k]} />)}
      {query.sort && <input type="hidden" name="sort" value={query.sort} />}
      {query.dir && <input type="hidden" name="dir" value={query.dir} />}
      <div className="relative min-w-52 flex-1">
        <label htmlFor="list-search" className="sr-only">
          Search
        </label>
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
        <Input id="list-search" name="q" defaultValue={query.q ?? ""} placeholder={searchPlaceholder} className="pl-9" />
      </div>
      {filters.map((f) => (
        <div key={f.name} className="min-w-36">
          <label htmlFor={`filter-${f.name}`} className="mb-1 block text-xs font-semibold text-muted">
            {f.label}
          </label>
          {f.type === "select" ? (
            <NativeSelect id={`filter-${f.name}`} name={f.name} defaultValue={query[f.name] ?? ""}>
              <option value="">All</option>
              {f.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </NativeSelect>
          ) : (
            <Input id={`filter-${f.name}`} type="date" name={f.name} defaultValue={query[f.name] ?? ""} />
          )}
        </div>
      ))}
      <div className="flex gap-2">
        <Button type="submit">Apply</Button>
        {active && (
          <Button asChild variant="ghost">
            <Link href={action}>
              <X aria-hidden />
              Clear
            </Link>
          </Button>
        )}
      </div>
    </form>
  );
}
