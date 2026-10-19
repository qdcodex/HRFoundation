import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="card" className={cn("rounded-xl border border-line bg-white shadow-xs", className)} {...props} />;
}

export function CardHeader({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4", className)} {...props} />;
}

export function CardTitle({ className, ...props }: ComponentProps<"h2">) {
  return <h2 className={cn("font-display text-base font-bold text-forest", className)} {...props} />;
}

export function CardDescription({ className, ...props }: ComponentProps<"p">) {
  return <p className={cn("mt-0.5 text-sm text-muted", className)} {...props} />;
}

export function CardContent({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("p-5", className)} {...props} />;
}

/** Definition list for detail pages. */
export function DetailList({ items, className }: { items: { label: string; value: React.ReactNode }[]; className?: string }) {
  return (
    <dl className={cn("divide-y divide-line", className)}>
      {items.map((item) => (
        <div key={item.label} className="grid gap-1 py-2.5 sm:grid-cols-[11rem_1fr] sm:gap-4">
          <dt className="text-sm text-muted">{item.label}</dt>
          <dd className="text-sm font-medium break-words text-charcoal">{item.value ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}
