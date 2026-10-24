import type { NavLink } from "./site";

type ServiceLink = { title: string; shortTitle: string; href: string; summary: string };

export type NavItem =
  | { kind: "link"; label: string; href: string }
  | { kind: "menu"; label: string; id: string; overview?: NavLink; items: NavLink[] };

/** Main navigation. Services come from the CMS (published services only). */
export const buildMainNav = (services: ServiceLink[]): NavItem[] => [
  { kind: "link", label: "About", href: "/about" },
  {
    kind: "menu",
    label: "Services",
    id: "services",
    overview: { label: "All services", href: "/services", description: "Our charitable objectives and programmes" },
    items: services.map((s) => ({ label: s.title, href: s.href, description: s.summary })),
  },
  {
    kind: "menu",
    label: "Our Work",
    id: "work",
    items: [
      { label: "Activities", href: "/activities", description: "Initiatives approved by the foundation" },
      { label: "News", href: "/news", description: "Announcements and updates" },
    ],
  },
  { kind: "link", label: "Get Involved", href: "/get-involved" },
  { kind: "link", label: "Contact", href: "/contact" },
];

export const buildFooterNav = (services: ServiceLink[]): { title: string; links: NavLink[] }[] => [
  {
    title: "Foundation",
    links: [
      { label: "About us", href: "/about" },
      { label: "Activities", href: "/activities" },
      { label: "News", href: "/news" },
    ],
  },
  {
    title: "Services",
    links: [{ label: "All services", href: "/services" }, ...services.map((s) => ({ label: s.shortTitle, href: s.href }))],
  },
  {
    title: "Take part",
    links: [
      { label: "Donate", href: "/donate" },
      { label: "Membership", href: "/membership" },
      { label: "Membership terms", href: "/membership/terms" },
      { label: "Member login", href: "/member/login" },
      { label: "Get involved", href: "/get-involved" },
      { label: "Contact", href: "/contact" },
    ],
  },
];

export const legalNav: NavLink[] = [
  { label: "Privacy policy", href: "/privacy-policy" },
  { label: "Terms of use", href: "/terms" },
];
