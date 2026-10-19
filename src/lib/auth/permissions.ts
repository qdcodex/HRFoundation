/**
 * Roles and permissions.
 *
 * Roles are defined in code (reviewable, version-controlled). Each administrator holds one or more
 * roles, and a Super Admin may grant individual extra permissions (e.g. letting a Content Manager read
 * membership records). Every server action, route handler and page checks permissions on the server.
 */

export const PERMISSIONS = {
  "dashboard:view": "View the dashboard",

  "content:manage": "Edit pages, services, activities, news and media",
  "documents:manage": "Upload and edit public documents",
  "documents:publish": "Publish public documents",

  "enquiries:read": "Read contact and volunteer enquiries",
  "enquiries:manage": "Update enquiry status, assignment and notes",
  "enquiries:export": "Export enquiries",

  "membership:read": "View membership applications and members",
  "membership:manage": "Record membership decisions and status changes",
  "membership:payments": "Record and verify membership payments",
  "membership:export": "Export membership reports (no nominee details)",
  "nominees:read": "View nominee details",
  "nominees:manage": "Edit nominee details",

  "donations:read": "View donations",
  "donations:manage": "Record and reconcile donations",
  "receipts:manage": "Issue and cancel donation receipts",
  "finance:reports": "View and export financial reports",

  "claims:read": "View death-benefit claims",
  "claims:review": "Review claims, add notes, request information, recommend",
  "claims:decide": "Record the authorised claim decision",
  "claims:documents": "Open claim supporting documents",
  "claims:payments": "Record claim payment details",

  "users:manage": "Manage administrators and roles",
  "audit:read": "View audit logs",
  "settings:manage": "Edit website and notification settings",
  "rules:manage": "Edit membership rules",
} as const;

export type Permission = keyof typeof PERMISSIONS;
export const ALL_PERMISSIONS = Object.keys(PERMISSIONS) as Permission[];

export const ROLES = {
  super_admin: {
    label: "Super Admin",
    description: "Full access, including administrators, settings and membership rules.",
    permissions: ALL_PERMISSIONS,
  },
  content_manager: {
    label: "Content Manager",
    description: "Website pages, services, activities, news, documents, media and enquiries.",
    permissions: [
      "dashboard:view",
      "content:manage",
      "documents:manage",
      "documents:publish",
      "enquiries:read",
      "enquiries:manage",
      "enquiries:export",
    ],
  },
  membership_manager: {
    label: "Membership Manager",
    description: "Applications, membership payments, status and nominees.",
    permissions: [
      "dashboard:view",
      "membership:read",
      "membership:manage",
      "membership:payments",
      "membership:export",
      "nominees:read",
      "nominees:manage",
    ],
  },
  finance_manager: {
    label: "Finance Manager",
    description: "Donations, reconciliation, receipts, financial reports and claim payments.",
    permissions: [
      "dashboard:view",
      "donations:read",
      "donations:manage",
      "receipts:manage",
      "finance:reports",
      "membership:read",
      "claims:read",
      "claims:payments",
    ],
  },
  claims_reviewer: {
    label: "Claims Reviewer",
    description: "Review death-benefit claims, documents and decisions.",
    permissions: [
      "dashboard:view",
      "membership:read",
      "nominees:read",
      "claims:read",
      "claims:review",
      "claims:decide",
      "claims:documents",
    ],
  },
} as const satisfies Record<string, { label: string; description: string; permissions: readonly Permission[] }>;

export type Role = keyof typeof ROLES;
export const ROLE_KEYS = Object.keys(ROLES) as Role[];

export function permissionsFor(roles: readonly string[], extra: readonly string[] = []): Set<Permission> {
  const set = new Set<Permission>();
  for (const role of roles) {
    const def = ROLES[role as Role];
    if (def) def.permissions.forEach((p) => set.add(p));
  }
  for (const p of extra) if (p in PERMISSIONS) set.add(p as Permission);
  return set;
}
