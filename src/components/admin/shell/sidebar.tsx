"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dialog as SheetPrimitive } from "radix-ui";
import {
  Bell,
  CalendarDays,
  ChartColumn,
  ChevronsLeft,
  ClipboardList,
  Contact,
  Files,
  FileText,
  HandCoins,
  HandHeart,
  History,
  Hourglass,
  Image as ImageIcon,
  Inbox,
  LayoutDashboard,
  Menu,
  Newspaper,
  Receipt,
  Scale,
  ScrollText,
  Settings,
  ShieldCheck,
  UserCheck,
  UserCog,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import type { NavSection } from "@/lib/admin/nav";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  "layout-dashboard": LayoutDashboard,
  "file-text": FileText,
  "hand-heart": HandHeart,
  "calendar-days": CalendarDays,
  newspaper: Newspaper,
  files: Files,
  inbox: Inbox,
  image: ImageIcon,
  users: Users,
  "clipboard-list": ClipboardList,
  "user-check": UserCheck,
  wallet: Wallet,
  hourglass: Hourglass,
  contact: Contact,
  "shield-check": ShieldCheck,
  "hand-coins": HandCoins,
  scale: Scale,
  receipt: Receipt,
  "chart-column": ChartColumn,
  "user-cog": UserCog,
  history: History,
  settings: Settings,
  "scroll-text": ScrollText,
  bell: Bell,
};

function isActive(pathname: string, href: string, exact?: boolean) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

function NavList({ sections, collapsed, onNavigate }: { sections: NavSection[]; collapsed?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin" className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
      {sections.map((section) => (
        <div key={section.title}>
          <p className={cn("mb-1.5 px-2 text-[0.68rem] font-semibold tracking-[0.14em] text-ivory/50 uppercase", collapsed && "sr-only")}>{section.title}</p>
          <ul className="space-y-0.5">
            {section.items.map((item) => {
              const Icon = ICONS[item.icon] ?? FileText;
              const active = isActive(pathname, item.href, item.exact);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm text-ivory/80 transition-colors hover:bg-ivory/10 hover:text-ivory focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none",
                      active && "bg-ivory/12 font-semibold text-ivory shadow-[inset_3px_0_0_var(--color-gold)]",
                      collapsed && "justify-center px-0",
                    )}
                  >
                    <Icon className="size-4 shrink-0" aria-hidden />
                    <span className={cn("truncate", collapsed && "sr-only")}>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function Brand({ collapsed }: { collapsed?: boolean }) {
  return (
    <Link href="/admin" className="flex items-center gap-3 rounded-md focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none">
      <span className="grid h-9 w-11 shrink-0 place-items-center rounded-lg bg-ivory">
        <Image src="/brand/hr-foundation-emblem.png" alt="" width={480} height={319} className="h-6 w-auto" />
      </span>
      <span className={cn("leading-tight", collapsed && "sr-only")}>
        <span className="block font-display text-sm font-extrabold text-ivory">H R Foundation</span>
        <span className="block text-[0.7rem] text-ivory/60">Administration</span>
      </span>
    </Link>
  );
}

export function Sidebar({ sections }: { sections: NavSection[] }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-dvh shrink-0 flex-col bg-forest-deep transition-[width] duration-200 lg:flex",
        collapsed ? "w-[4.5rem]" : "w-64",
      )}
    >
      <div className={cn("flex h-16 items-center border-b border-ivory/10 px-4", collapsed && "justify-center px-2")}>
        <Brand collapsed={collapsed} />
      </div>
      <NavList sections={sections} collapsed={collapsed} />
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        aria-pressed={collapsed}
        className="m-3 flex items-center justify-center gap-2 rounded-lg px-2 py-2 text-xs text-ivory/60 hover:bg-ivory/10 hover:text-ivory focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none"
      >
        <ChevronsLeft className={cn("size-4 transition-transform", collapsed && "rotate-180")} aria-hidden />
        <span className={cn(collapsed && "sr-only")}>{collapsed ? "Expand sidebar" : "Collapse sidebar"}</span>
      </button>
    </aside>
  );
}

/** Mobile/tablet navigation in a modal sheet (focus-trapped, Escape closes). */
export function MobileSidebar({ sections }: { sections: NavSection[] }) {
  const [open, setOpen] = useState(false);
  return (
    <SheetPrimitive.Root open={open} onOpenChange={setOpen}>
      <SheetPrimitive.Trigger className="grid size-10 place-items-center rounded-lg border border-line bg-white text-forest lg:hidden">
        <Menu className="size-5" aria-hidden />
        <span className="sr-only">Open navigation</span>
      </SheetPrimitive.Trigger>
      <SheetPrimitive.Portal>
        <SheetPrimitive.Overlay className="fixed inset-0 z-50 bg-forest-deep/50 data-[state=open]:animate-fade-in" />
        <SheetPrimitive.Content className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col bg-forest-deep shadow-2xl focus:outline-none data-[state=open]:animate-fade-in">
          <SheetPrimitive.Title className="sr-only">Admin navigation</SheetPrimitive.Title>
          <SheetPrimitive.Description className="sr-only">Links to every section you can access.</SheetPrimitive.Description>
          <div className="flex h-16 items-center justify-between border-b border-ivory/10 px-4">
            <Brand />
            <SheetPrimitive.Close className="grid size-9 place-items-center rounded-lg text-ivory/80 hover:bg-ivory/10">
              <X className="size-5" aria-hidden />
              <span className="sr-only">Close navigation</span>
            </SheetPrimitive.Close>
          </div>
          <NavList sections={sections} onNavigate={() => setOpen(false)} />
        </SheetPrimitive.Content>
      </SheetPrimitive.Portal>
    </SheetPrimitive.Root>
  );
}
