import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

export type Crumb = { label: string; href?: string };

export function PageHeader({ title, description, crumbs = [], actions }: { title: string; description?: ReactNode; crumbs?: Crumb[]; actions?: ReactNode }) {
  const trail: Crumb[] = [{ label: "Admin", href: "/admin" }, ...crumbs];
  return (
    <div className="mb-6 space-y-3">
      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-1 text-xs text-muted">
          {trail.map((c, i) => (
            <li key={`${c.label}-${i}`} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="size-3" aria-hidden />}
              {c.href && i < trail.length - 1 ? (
                <Link href={c.href} className="hover:text-forest hover:underline">
                  {c.label}
                </Link>
              ) : (
                <span aria-current={i === trail.length - 1 ? "page" : undefined}>{c.label}</span>
              )}
            </li>
          ))}
        </ol>
      </nav>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-forest">{title}</h1>
          {description && <div className="mt-1 max-w-3xl text-sm text-muted">{description}</div>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}
