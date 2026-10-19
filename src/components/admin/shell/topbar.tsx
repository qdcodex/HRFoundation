"use client";

import Link from "next/link";
import { ExternalLink, KeyRound, LogOut } from "lucide-react";
import { logoutAction } from "@/app/admin/actions/auth";
import type { NavSection } from "@/lib/admin/nav";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "../ui/menu";
import { MobileSidebar } from "./sidebar";

export function Topbar({ sections, user }: { sections: NavSection[]; user: { name: string; email: string; roleLabels: string[] } }) {
  const initials = user.name
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-white/95 px-4 backdrop-blur sm:px-6">
      <MobileSidebar sections={sections} />
      <div className="flex-1" />
      <Link
        href="/"
        target="_blank"
        className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-muted hover:bg-ivory hover:text-forest sm:inline-flex"
      >
        View website <ExternalLink className="size-3.5" aria-hidden />
        <span className="sr-only">(opens in a new tab)</span>
      </Link>
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2.5 rounded-lg p-1.5 pr-2.5 hover:bg-ivory focus-visible:ring-3 focus-visible:ring-gold/50 focus-visible:outline-none">
          <span aria-hidden className="grid size-8 place-items-center rounded-full bg-forest font-display text-xs font-bold text-ivory">
            {initials}
          </span>
          <span className="hidden text-left leading-tight sm:block">
            <span className="block text-sm font-semibold text-charcoal">{user.name}</span>
            <span className="block text-xs text-muted">{user.roleLabels.join(", ") || "No role"}</span>
          </span>
          <span className="sr-only">Account menu</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/admin/account">
              <KeyRound aria-hidden /> Account & password
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => void logoutAction().finally(() => window.location.replace("/admin/login"))}>
            <LogOut aria-hidden /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
