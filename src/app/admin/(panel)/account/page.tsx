import { ChangePasswordForm } from "@/components/admin/auth-forms";
import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent, CardHeader, CardTitle, DetailList } from "@/components/admin/ui/card";
import { Notice } from "@/components/admin/ui/feedback";
import { requireAdmin } from "@/lib/auth/dal";
import { PERMISSIONS, ROLES, type Role } from "@/lib/auth/permissions";

/** Authenticated, per-request page: navigation waits for the server. */
export const instant = false;

export const metadata = { title: "Account" };

export default async function AccountPage({ searchParams }: PageProps<"/admin/account">) {
  const admin = await requireAdmin({ allowPasswordChange: true });
  const required = (await searchParams).required === "1" || admin.mustChangePassword;
  return (
    <>
      <PageHeader title="Account & password" crumbs={[{ label: "Account" }]} />
      {required && admin.mustChangePassword && (
        <Notice className="mb-6">You are using a temporary password. Choose a new password to continue using the dashboard.</Notice>
      )}
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Change password</CardTitle>
          </CardHeader>
          <CardContent>
            <ChangePasswordForm />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Your access</CardTitle>
          </CardHeader>
          <CardContent>
            <DetailList
              items={[
                { label: "Name", value: admin.name },
                { label: "Email", value: admin.email },
                { label: "Roles", value: admin.roles.map((r) => ROLES[r as Role]?.label ?? r).join(", ") || "None" },
              ]}
            />
            <ul className="mt-4 grid gap-1 text-sm text-muted sm:grid-cols-2">
              {admin.permissions.map((p) => (
                <li key={p}>• {PERMISSIONS[p]}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
