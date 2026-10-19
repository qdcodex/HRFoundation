import Link from "next/link";
import type { ReactNode } from "react";

/** Compact statistic tile. `note` explains how the number is derived. */
export function StatCard({ label, value, note, href, icon }: { label: string; value: ReactNode; note?: string; href?: string; icon?: ReactNode }) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-muted">{label}</p>
        {icon && <span className="text-emerald-ink [&_svg]:size-4">{icon}</span>}
      </div>
      <p className="mt-2 font-display text-2xl font-extrabold tracking-tight text-forest tabular-nums">{value}</p>
      {note && <p className="mt-1 text-xs text-muted">{note}</p>}
    </>
  );
  const cls = "block rounded-xl border border-line bg-white p-4 shadow-xs";
  return href ? (
    <Link href={href} className={`${cls} transition-colors hover:border-forest focus-visible:ring-3 focus-visible:ring-gold/50 focus-visible:outline-none`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export function RangeTabs({ current, basePath }: { current: string; basePath: string }) {
  const options = [
    { key: "6m", label: "6 months" },
    { key: "12m", label: "12 months" },
    { key: "24m", label: "24 months" },
  ];
  return (
    <nav aria-label="Chart period" className="inline-flex gap-1 rounded-lg bg-ivory-deep p-1">
      {options.map((o) => (
        <Link
          key={o.key}
          href={`${basePath}?range=${o.key}`}
          aria-current={current === o.key ? "page" : undefined}
          scroll={false}
          className="rounded-md px-3 py-1.5 text-sm font-semibold text-muted hover:text-charcoal aria-[current=page]:bg-white aria-[current=page]:text-forest aria-[current=page]:shadow-xs"
        >
          {o.label}
        </Link>
      ))}
    </nav>
  );
}
