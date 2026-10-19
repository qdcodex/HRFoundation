"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import type { NavItem } from "@/content/navigation";
import { BrandLink } from "@/components/ui/Brand";
import { buttonClasses } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { MobileNavigation } from "./MobileNavigation";

export function isActivePath(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

/** Reads the current path (runtime URL data) and renders the header with active-link state. */
export function SiteHeaderWithPath({ nav }: { nav: NavItem[] }) {
  return <SiteHeader nav={nav} pathname={usePathname()} />;
}

/** Header markup. `pathname` is optional so a static version can render while the path streams in. */
export function SiteHeader({ nav, pathname = "" }: { nav: NavItem[]; pathname?: string }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b bg-ivory transition-[border-color,box-shadow] duration-300",
        scrolled ? "border-line shadow-[0_6px_24px_-18px_rgba(21,61,50,0.45)]" : "border-transparent",
      )}
    >
      <div className="container-site flex h-[4.5rem] items-center justify-between gap-6">
        <BrandLink />

        <nav aria-label="Main" className="hidden xl:block">
          <ul className="flex items-center gap-1">
            {nav.map((item) => (
              <li key={item.label}>
                {item.kind === "link" ? (
                  <Link
                    href={item.href}
                    aria-current={isActivePath(pathname, item.href) ? "page" : undefined}
                    className="relative whitespace-nowrap rounded-full px-3.5 py-2 font-display text-[0.92rem] font-semibold text-charcoal transition-colors hover:text-emerald-ink aria-[current=page]:text-forest aria-[current=page]:after:absolute aria-[current=page]:after:inset-x-3.5 aria-[current=page]:after:-bottom-0.5 aria-[current=page]:after:h-0.5 aria-[current=page]:after:bg-gold"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <NavMenu item={item} pathname={pathname} />
                )}
              </li>
            ))}
          </ul>
        </nav>

        <div className="hidden items-center gap-2 xl:flex">
          <Link href="/membership" className={buttonClasses("outline", "md", "h-10 px-4")}>
            Membership
          </Link>
          <Link href="/donate" className={buttonClasses("primary", "md", "h-10 px-5")}>
            Donate
          </Link>
        </div>

        <MobileNavigation nav={nav} pathname={pathname} />
      </div>
    </header>
  );
}

function NavMenu({ item, pathname }: { item: Extract<NavItem, { kind: "menu" }>; pathname: string }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const active = item.items.some((l) => isActivePath(pathname, l.href)) || (item.overview && isActivePath(pathname, item.overview.href));

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const hoverOpen = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  };
  const hoverClose = () => {
    closeTimer.current = setTimeout(() => setOpen(false), 140);
  };

  const wide = item.items.length > 3;

  return (
    <div
      ref={wrapperRef}
      className="relative"
      onPointerEnter={(e) => e.pointerType === "mouse" && hoverOpen()}
      onPointerLeave={(e) => e.pointerType === "mouse" && hoverClose()}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-1 whitespace-nowrap rounded-full px-3.5 py-2 font-display text-[0.92rem] font-semibold transition-colors hover:text-emerald-ink",
          active ? "text-forest" : "text-charcoal",
        )}
      >
        {item.label}
        <ChevronDown aria-hidden className={cn("size-4 transition-transform", open && "rotate-180")} />
      </button>

      <div
        id={panelId}
        hidden={!open}
        className={cn(
          "absolute top-full left-1/2 z-50 -translate-x-1/2 pt-3",
          wide ? "w-[min(46rem,90vw)]" : "w-80",
        )}
      >
        <div className="animate-fade-in overflow-hidden rounded-2xl border border-line bg-white shadow-[0_24px_60px_-30px_rgba(14,42,34,0.45)]">
          <ul className={cn("grid gap-1 p-3", wide && "sm:grid-cols-2")}>
            {item.items.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setOpen(false)}
                  aria-current={isActivePath(pathname, link.href) ? "page" : undefined}
                  className="group block rounded-xl px-4 py-3 transition-colors hover:bg-sage/60 aria-[current=page]:bg-sage/60"
                >
                  <span className="font-display text-[0.95rem] font-bold text-forest">{link.label}</span>
                  {link.description && <span className="mt-1 line-clamp-2 block text-sm leading-snug text-muted">{link.description}</span>}
                </Link>
              </li>
            ))}
          </ul>
          {item.overview && (
            <Link
              href={item.overview.href}
              onClick={() => setOpen(false)}
              className="flex items-center justify-between border-t border-line bg-ivory px-7 py-4 font-display text-sm font-bold text-forest transition-colors hover:bg-sage/50"
            >
              <span>
                {item.overview.label}
                {item.overview.description && <span className="ml-2 font-sans font-normal text-muted">— {item.overview.description}</span>}
              </span>
              <ArrowUpRight aria-hidden className="size-4" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
