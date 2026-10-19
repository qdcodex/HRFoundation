"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Menu, X } from "lucide-react";
import type { NavItem } from "@/content/navigation";
import { BrandLink } from "@/components/ui/Brand";
import { buttonClasses } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

/**
 * Mobile navigation drawer built on the native <dialog> element:
 * showModal() provides focus containment, Escape-to-close and an inert background.
 */
export function MobileNavigation({ nav, pathname }: { nav: NavItem[]; pathname: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
    document.documentElement.style.overflow = open ? "hidden" : "";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div className="flex items-center gap-2 xl:hidden">
      <span className="hidden sm:block">
        <Link href="/donate" className={buttonClasses("primary", "md", "h-10 px-5")}>
          Donate
        </Link>
      </span>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="grid size-11 place-items-center rounded-full border border-forest/20 text-forest transition-colors hover:bg-sage"
      >
        <Menu aria-hidden className="size-5" />
        <span className="sr-only">Open menu</span>
      </button>

      <dialog
        ref={dialogRef}
        aria-label="Site menu"
        onClose={close}
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
        className="m-0 ml-auto h-dvh max-h-dvh w-full max-w-md bg-ivory p-0 text-charcoal backdrop:bg-forest-deep/50 open:animate-fade-in"
      >
        <div className="flex h-full flex-col">
          <div className="flex h-[4.5rem] items-center justify-between border-b border-line px-5">
            <BrandLink onClick={close} />
            <button
              type="button"
              onClick={close}
              className="grid size-11 place-items-center rounded-full border border-forest/20 text-forest hover:bg-sage"
            >
              <X aria-hidden className="size-5" />
              <span className="sr-only">Close menu</span>
            </button>
          </div>

          <nav aria-label="Mobile" className="flex-1 overflow-y-auto px-5 py-4">
            <ul className="divide-y divide-line">
              <li>
                <MobileLink href="/" pathname={pathname} onNavigate={close}>
                  Home
                </MobileLink>
              </li>
              {nav.map((item) =>
                item.kind === "link" ? (
                  <li key={item.href}>
                    <MobileLink href={item.href} pathname={pathname} onNavigate={close}>
                      {item.label}
                    </MobileLink>
                  </li>
                ) : (
                  <li key={item.id}>
                    <button
                      type="button"
                      aria-expanded={expanded === item.id}
                      aria-controls={`mobile-${item.id}`}
                      onClick={() => setExpanded((v) => (v === item.id ? null : item.id))}
                      className="flex w-full items-center justify-between py-4 text-left font-display text-lg font-bold text-forest"
                    >
                      {item.label}
                      <ChevronDown aria-hidden className={cn("size-5 transition-transform", expanded === item.id && "rotate-180")} />
                    </button>
                    <ul id={`mobile-${item.id}`} hidden={expanded !== item.id} className="mb-3 space-y-1 border-l-2 border-gold pl-4">
                      {item.overview && (
                        <li>
                          <MobileLink href={item.overview.href} pathname={pathname} onNavigate={close} small>
                            {item.overview.label}
                          </MobileLink>
                        </li>
                      )}
                      {item.items.map((link) => (
                        <li key={link.href}>
                          <MobileLink href={link.href} pathname={pathname} onNavigate={close} small>
                            {link.label}
                          </MobileLink>
                        </li>
                      ))}
                    </ul>
                  </li>
                ),
              )}
            </ul>
          </nav>

          <div className="grid grid-cols-2 gap-3 border-t border-line p-5">
            <Link href="/membership" onClick={close} className={buttonClasses("outline", "lg")}>
              Membership
            </Link>
            <Link href="/donate" onClick={close} className={buttonClasses("primary", "lg")}>
              Donate
            </Link>
          </div>
        </div>
      </dialog>
    </div>
  );
}

function MobileLink({
  href,
  pathname,
  onNavigate,
  small,
  children,
}: {
  href: string;
  pathname: string;
  onNavigate: () => void;
  small?: boolean;
  children: React.ReactNode;
}) {
  const active = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "block font-display font-bold text-forest aria-[current=page]:text-emerald-ink",
        small ? "py-2 text-base font-semibold text-charcoal" : "py-4 text-lg",
      )}
    >
      {children}
    </Link>
  );
}
