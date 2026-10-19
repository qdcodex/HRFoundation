"use client";

import { formatPaise } from "@/lib/money";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

/** Single-series chart colour (validated: lightness band, chroma floor, ≥3:1 against the white card). */
const SERIES = "#1a8a5c";

export type MonthPoint = { month: string; label: string; value: number };

/**
 * Monthly bar chart for one measure. A visually hidden table carries the same numbers
 * for screen readers and for anyone who prefers exact values.
 */
export function MonthlyBarChart({ data, valueLabel, kind = "count", title }: { data: MonthPoint[]; valueLabel: string; kind?: "count" | "currency"; title: string }) {
  const format = kind === "currency" ? (v: number) => formatPaise(v) : (v: number) => new Intl.NumberFormat("en-IN").format(v);
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) {
    return <p className="flex h-56 items-center justify-center rounded-lg bg-ivory/60 text-sm text-muted">No records in this period.</p>;
  }
  return (
    <figure>
      <div className="h-56" aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap="28%">
            <CartesianGrid vertical={false} stroke="#ece8dd" />
            <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: "#ddd7c8" }} tick={{ fill: "#55605a", fontSize: 12 }} interval="preserveStartEnd" />
            <YAxis
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              width={56}
              tick={{ fill: "#55605a", fontSize: 12 }}
              tickFormatter={(v: number) => compact(kind, v)}
            />
            <Tooltip
              cursor={{ fill: "rgba(21,61,50,0.06)" }}
              contentStyle={{ borderRadius: 8, border: "1px solid #ddd7c8", fontSize: 13 }}
              formatter={(v) => [format(Number(v)), valueLabel]}
            />
            <Bar dataKey="value" fill={SERIES} radius={[4, 4, 0, 0]} maxBarSize={36} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="sr-only">{title}</figcaption>
      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th scope="col">Month</th>
            <th scope="col">{valueLabel}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.month}>
              <th scope="row">{d.label}</th>
              <td>{format(d.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

function compact(kind: "count" | "currency", v: number) {
  const n = kind === "currency" ? v / 100 : v;
  return (kind === "currency" ? "₹" : "") + new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

/** Status distribution as labelled horizontal bars — identity is carried by the text label, not colour. */
export function DistributionList({ items }: { items: { key: string; label: string; value: number }[] }) {
  const total = items.reduce((s, i) => s + i.value, 0);
  if (total === 0) return <p className="rounded-lg bg-ivory/60 py-10 text-center text-sm text-muted">No records yet.</p>;
  const max = Math.max(...items.map((i) => i.value));
  return (
    <ul className="space-y-2.5">
      {items.map((i) => (
        <li key={i.key} className="grid grid-cols-[minmax(7rem,11rem)_1fr_auto] items-center gap-3 text-sm">
          <span className="truncate text-charcoal">{i.label}</span>
          <span className="h-2.5 overflow-hidden rounded-full bg-ivory-deep" aria-hidden>
            <span className="block h-full rounded-full" style={{ width: `${max ? (i.value / max) * 100 : 0}%`, background: SERIES }} />
          </span>
          <span className="w-16 text-right font-semibold tabular-nums">
            {i.value}
            <span className="ml-1 text-xs font-normal text-muted">{Math.round((i.value / total) * 100)}%</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
