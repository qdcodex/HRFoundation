import type { Permission } from "@/lib/auth/permissions";

export type NavItem = { label: string; href: string; icon: string; any: Permission[]; exact?: boolean };
export type NavSection = { title: string; items: NavItem[] };

/**
 * Sidebar structure. Items are shown only to users holding one of the listed permissions;
 * every page still enforces its own permission on the server.
 */
export const ADMIN_NAV: NavSection[] = [
  { title: "Overview", items: [{ label: "Dashboard", href: "/admin", icon: "layout-dashboard", any: ["dashboard:view"], exact: true }] },
  {
    title: "Website Management",
    items: [
      { label: "Pages", href: "/admin/content/pages", icon: "file-text", any: ["content:manage"] },
      { label: "Services", href: "/admin/content/services", icon: "hand-heart", any: ["content:manage"] },
      { label: "Activities & Initiatives", href: "/admin/content/activities", icon: "calendar-days", any: ["content:manage"] },
      { label: "News & Updates", href: "/admin/content/news", icon: "newspaper", any: ["content:manage"] },
      { label: "Public Documents", href: "/admin/content/documents", icon: "files", any: ["documents:manage", "documents:publish"] },
      { label: "Contact Enquiries", href: "/admin/enquiries", icon: "inbox", any: ["enquiries:read"] },
      { label: "Media Library", href: "/admin/content/media", icon: "image", any: ["content:manage"] },
    ],
  },
  {
    title: "Membership",
    items: [
      { label: "Membership Dashboard", href: "/admin/membership", icon: "users", any: ["membership:read"], exact: true },
      { label: "Applications", href: "/admin/membership/applications", icon: "clipboard-list", any: ["membership:read"] },
      { label: "Active Members", href: "/admin/membership/members", icon: "user-check", any: ["membership:read"] },
      { label: "Membership Payments", href: "/admin/membership/payments", icon: "wallet", any: ["membership:payments", "membership:read"] },
      { label: "Waiting Period Tracker", href: "/admin/membership/waiting-period", icon: "hourglass", any: ["membership:read"] },
      { label: "Nominees", href: "/admin/membership/nominees", icon: "contact", any: ["nominees:read"] },
      { label: "Death-Benefit Claims", href: "/admin/claims", icon: "shield-check", any: ["claims:read"] },
    ],
  },
  {
    title: "Donations & Finance",
    items: [
      { label: "Donations", href: "/admin/donations", icon: "hand-coins", any: ["donations:read"], exact: true },
      { label: "Payment Reconciliation", href: "/admin/donations/reconciliation", icon: "scale", any: ["donations:manage"] },
      { label: "Donation Receipts", href: "/admin/donations/receipts", icon: "receipt", any: ["receipts:manage", "donations:read"] },
      { label: "Reports", href: "/admin/reports", icon: "chart-column", any: ["finance:reports", "membership:export", "enquiries:export", "claims:read"] },
    ],
  },
  {
    title: "Administration",
    items: [
      { label: "Users & Roles", href: "/admin/users", icon: "user-cog", any: ["users:manage"] },
      { label: "Audit Logs", href: "/admin/audit", icon: "history", any: ["audit:read"] },
      { label: "Website Settings", href: "/admin/settings/website", icon: "settings", any: ["settings:manage"] },
      { label: "Membership Rules", href: "/admin/settings/membership-rules", icon: "scroll-text", any: ["rules:manage"] },
      { label: "Notification Settings", href: "/admin/settings/notifications", icon: "bell", any: ["settings:manage"] },
    ],
  },
];

export function visibleNav(permissions: readonly string[]) {
  return ADMIN_NAV.map((s) => ({ ...s, items: s.items.filter((i) => i.any.some((p) => permissions.includes(p))) })).filter((s) => s.items.length > 0);
}
