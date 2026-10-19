import { AlertTriangle, Inbox, ShieldX } from "lucide-react";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return <div aria-hidden className={cn("animate-pulse rounded-md bg-ivory-deep", className)} {...props} />;
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading" className="space-y-2 rounded-xl border border-line bg-white p-4">
      <Skeleton className="h-9 w-full" />
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-11 w-full" />
      ))}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div role="status" aria-label="Loading page" className="space-y-6">
      <Skeleton className="h-8 w-64" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <TableSkeleton />
    </div>
  );
}

export function EmptyState({ title, children, action, icon }: { title: string; children?: ReactNode; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-line bg-white px-6 py-12 text-center">
      <div className="mb-3 grid size-11 place-items-center rounded-full bg-sage text-forest">{icon ?? <Inbox className="size-5" aria-hidden />}</div>
      <p className="font-display font-bold text-forest">{title}</p>
      {children && <div className="mt-1 max-w-md text-sm text-muted">{children}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ title = "Could not load this data", children }: { title?: string; children?: ReactNode }) {
  return (
    <div role="alert" className="flex gap-3 rounded-xl border border-danger/30 bg-danger/5 p-4 text-sm">
      <AlertTriangle className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden />
      <div>
        <p className="font-semibold text-charcoal">{title}</p>
        {children && <div className="mt-1 text-muted">{children}</div>}
      </div>
    </div>
  );
}

export function Notice({ tone = "warning", children, className }: { tone?: "warning" | "info"; children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "rounded-lg border px-4 py-3 text-sm leading-relaxed",
        tone === "warning" ? "border-gold/50 bg-gold-soft/35 text-charcoal" : "border-sky-200 bg-sky-50 text-sky-900",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function AccessDenied() {
  return (
    <div className="mx-auto mt-10 max-w-md rounded-xl border border-line bg-white p-8 text-center">
      <ShieldX className="mx-auto size-10 text-danger" aria-hidden />
      <h1 className="mt-4 font-display text-xl font-bold text-forest">Access denied</h1>
      <p className="mt-2 text-sm text-muted">Your role does not include access to this section. Ask a Super Admin if you need it.</p>
      <Link href="/admin" className="mt-5 inline-block text-sm font-semibold text-emerald-ink underline underline-offset-4">
        Back to dashboard
      </Link>
    </div>
  );
}
