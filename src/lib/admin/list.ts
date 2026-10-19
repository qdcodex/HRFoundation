/** URL-driven list state (search, filters, sorting, pagination) shared by admin list pages. */

export type SearchParams = Record<string, string | string[] | undefined>;
export type ListQuery = Record<string, string>;

export function flatParams(sp: SearchParams): ListQuery {
  const out: ListQuery = {};
  for (const [k, v] of Object.entries(sp)) {
    const value = Array.isArray(v) ? v[0] : v;
    if (value !== undefined && value !== "") out[k] = String(value).slice(0, 200);
  }
  return out;
}

export function parseList(q: ListQuery, opts: { sortable: string[]; defaultSort: string; defaultDir?: "asc" | "desc"; pageSize?: number }) {
  const page = Math.max(1, Math.min(10_000, Number.parseInt(q.page ?? "1", 10) || 1));
  const pageSize = opts.pageSize ?? 20;
  const sort = opts.sortable.includes(q.sort ?? "") ? q.sort! : opts.defaultSort;
  const dir: 1 | -1 = (q.dir ?? opts.defaultDir ?? "desc") === "asc" ? 1 : -1;
  return { page, pageSize, skip: (page - 1) * pageSize, sort, dir, search: (q.q ?? "").trim() };
}

export function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function hrefWith(pathname: string, q: ListQuery, changes: Record<string, string | null>) {
  const params = new URLSearchParams(q);
  for (const [k, v] of Object.entries(changes)) {
    if (v === null || v === "") params.delete(k);
    else params.set(k, v);
  }
  const s = params.toString();
  return s ? `${pathname}?${s}` : pathname;
}

/** "YYYY-MM-DD" → Date at the start (or end) of that day in India. */
export function istDayBoundary(iso: string | undefined, end = false) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return undefined;
  const d = new Date(`${iso}T${end ? "23:59:59.999" : "00:00:00.000"}+05:30`);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export function serialize<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}
