import type { ReactNode } from "react";
import { AlertTriangle, Inbox, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  children,
  action,
  className,
  icon,
  headingLevel: Heading = "h3",
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
  icon?: ReactNode;
  headingLevel?: "h2" | "h3";
}) {
  return (
    <div className={cn("rounded-2xl border border-dashed border-line bg-white/60 px-6 py-12 text-center sm:px-12", className)}>
      <div className="mx-auto mb-5 grid size-14 place-items-center rounded-full bg-sage text-forest">
        {icon ?? <Inbox aria-hidden className="size-6" />}
      </div>
      <Heading className="font-display text-xl font-bold text-forest">{title}</Heading>
      {children && <div className="mx-auto mt-3 max-w-lg leading-relaxed text-muted">{children}</div>}
      {action && <div className="mt-6 flex flex-wrap justify-center gap-3">{action}</div>}
    </div>
  );
}

export function ErrorState({ title = "Something went wrong", children, action }: { title?: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div role="alert" className="rounded-2xl border border-danger/30 bg-danger/5 px-6 py-10 text-center">
      <AlertTriangle aria-hidden className="mx-auto mb-4 size-8 text-danger" />
      <h2 className="font-display text-xl font-bold text-charcoal">{title}</h2>
      {children && <div className="mx-auto mt-2 max-w-md text-muted">{children}</div>}
      {action && <div className="mt-6 flex justify-center gap-3">{action}</div>}
    </div>
  );
}

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="flex min-h-[40vh] items-center justify-center gap-3 text-muted">
      <Loader2 aria-hidden className="size-5 animate-spin text-emerald" />
      <span>{label}</span>
    </div>
  );
}

/** Highlights content that is awaiting confirmation from the foundation. */
export function PendingNote({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex gap-3 rounded-xl border border-gold/40 bg-gold-soft/30 px-4 py-3 text-sm leading-relaxed text-charcoal", className)}>
      <span aria-hidden className="mt-1.5 size-2 shrink-0 rounded-full bg-gold" />
      <div>{children}</div>
    </div>
  );
}
