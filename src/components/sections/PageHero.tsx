import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Crumb = { label: string; href?: string };

/** Interior page header with breadcrumbs, editorial title and an optional aside. */
export function PageHero({
  eyebrow,
  title,
  intro,
  crumbs = [],
  aside,
  tone = "light",
  children,
}: {
  eyebrow?: string;
  title: ReactNode;
  intro?: ReactNode;
  crumbs?: Crumb[];
  aside?: ReactNode;
  tone?: "light" | "sage" | "dark";
  children?: ReactNode;
}) {
  const dark = tone === "dark";
  const trail: Crumb[] = [{ label: "Home", href: "/" }, ...crumbs];

  return (
    <section
      className={cn(
        "relative overflow-hidden border-b",
        tone === "light" && "border-line bg-ivory",
        tone === "sage" && "border-sage-deep bg-sage",
        dark && "border-forest bg-forest text-ivory",
      )}
    >
      {/* decorative arch outlines */}
      <svg aria-hidden viewBox="0 0 400 400" className={cn("pointer-events-none absolute -top-10 -right-10 hidden h-[30rem] w-[30rem] md:block", dark ? "text-gold/20" : "text-gold/35")}>
        <path d="M40 400V200a160 160 0 0 1 320 0v200" fill="none" stroke="currentColor" />
        <path d="M90 400V210a110 110 0 0 1 220 0v190" fill="none" stroke="currentColor" />
      </svg>

      <div className="container-site relative grid gap-10 pt-10 pb-14 sm:pt-12 lg:grid-cols-12 lg:pb-20">
        <div className={aside ? "lg:col-span-7" : "lg:col-span-9"}>
          <nav aria-label="Breadcrumb" className="mb-10">
            <ol className={cn("flex flex-wrap items-center gap-1.5 text-sm", dark ? "text-ivory/70" : "text-muted")}>
              {trail.map((c, i) => (
                <li key={c.label} className="flex items-center gap-1.5">
                  {i > 0 && <ChevronRight aria-hidden className="size-3.5 opacity-60" />}
                  {c.href && i < trail.length - 1 ? (
                    <Link href={c.href} className="hover:underline">
                      {c.label}
                    </Link>
                  ) : (
                    <span aria-current={i === trail.length - 1 ? "page" : undefined}>{c.label}</span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
          {eyebrow && <p className={cn("eyebrow mb-5", dark ? "text-gold" : "text-gold-ink")}>{eyebrow}</p>}
          <h1 className={cn("display-lg max-w-4xl", dark ? "text-ivory" : "text-forest")}>{title}</h1>
          {intro && <div className={cn("mt-6 max-w-2xl text-lg leading-relaxed sm:text-xl", dark ? "text-ivory/80" : "text-muted")}>{intro}</div>}
          {children && <div className="mt-8">{children}</div>}
        </div>
        {aside && <div className="lg:col-span-5 lg:self-end">{aside}</div>}
      </div>
    </section>
  );
}
