import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { SimpleTable } from "@/components/admin/simple-table";
import { Badge } from "@/components/admin/ui/badge";
import { Button } from "@/components/admin/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/admin/ui/card";
import { AccessDenied } from "@/components/admin/ui/feedback";
import { guardPage } from "@/lib/auth/dal";
import { PERMISSIONS, ROLES, type Role } from "@/lib/auth/permissions";
import { connectDb } from "@/lib/db/connect";
import { AdminUser } from "@/lib/db/models/auth";
import { fmtDateTime } from "@/lib/format";

export const instant = false;
export const metadata = { title: "Users & roles" };

export default async function UsersPage() {
  const { allowed } = await guardPage("users:manage");
  if (!allowed) return <AccessDenied />;
  await connectDb();
  const users = await AdminUser.find().sort({ active: -1, name: 1 }).lean();
  return (
    <>
      <PageHeader
        title="Users & roles"
        description="Administrators sign in with their own accounts. Permissions are checked on the server for every page and action."
        crumbs={[{ label: "Administration" }, { label: "Users" }]}
        actions={
          <Button asChild>
            <Link href="/admin/users/new">
              <Plus aria-hidden /> New administrator
            </Link>
          </Button>
        }
      />
      <SimpleTable
        caption="Administrators"
        headers={["Name", "Email", "Roles", "Status", "Last sign-in", ""]}
        rows={users.map((u) => [
          <Link key="n" href={`/admin/users/${u._id}`} className="font-semibold text-forest hover:underline">
            {u.name}
          </Link>,
          u.email,
          <span key="r" className="flex flex-wrap gap-1">
            {u.roles.map((r) => (
              <Badge key={r} tone={r === "super_admin" ? "dark" : "neutral"}>
                {ROLES[r as Role]?.label ?? r}
              </Badge>
            ))}
            {u.extraPermissions.length > 0 && <Badge tone="info">+{u.extraPermissions.length} permission(s)</Badge>}
          </span>,
          <span key="s" className="flex flex-wrap gap-1">
            {u.active ? <Badge tone="success">Active</Badge> : <Badge tone="danger">Deactivated</Badge>}
            {u.mustChangePassword && <Badge tone="warning">Temporary password</Badge>}
            {u.lockedUntil && u.lockedUntil > new Date() && <Badge tone="danger">Locked</Badge>}
          </span>,
          <span key="l" className="text-xs text-muted">
            {fmtDateTime(u.lastLoginAt)}
          </span>,
          <Link key="e" href={`/admin/users/${u._id}`} className="text-sm font-semibold text-emerald-ink hover:underline">
            Manage<span className="sr-only"> {u.name}</span>
          </Link>,
        ])}
      />
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Role reference</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-2">
          {Object.entries(ROLES).map(([key, r]) => (
            <div key={key} className="rounded-lg border border-line p-4">
              <p className="font-semibold">{r.label}</p>
              <p className="text-sm text-muted">{r.description}</p>
              <ul className="mt-2 list-disc pl-5 text-xs text-muted">
                {r.permissions.map((p) => (
                  <li key={p}>{PERMISSIONS[p]}</li>
                ))}
              </ul>
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
}
