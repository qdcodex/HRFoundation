import { PageHeader } from "@/components/admin/page-header";
import { UserForm } from "@/components/admin/system/system-forms";
import { AccessDenied } from "@/components/admin/ui/feedback";
import { guardPage } from "@/lib/auth/dal";
import { PERMISSIONS, ROLES } from "@/lib/auth/permissions";

export const instant = false;
export const metadata = { title: "New administrator" };

export default async function NewUserPage() {
  const { allowed } = await guardPage("users:manage");
  if (!allowed) return <AccessDenied />;
  return (
    <>
      <PageHeader
        title="New administrator"
        description="A random temporary password is generated and shown once. The person must choose their own password at first sign-in."
        crumbs={[{ label: "Users", href: "/admin/users" }, { label: "New" }]}
      />
      <div className="max-w-4xl">
        <UserForm
          user={null}
          isSelf={false}
          roles={Object.entries(ROLES).map(([key, r]) => ({ key, label: r.label, description: r.description }))}
          permissions={Object.entries(PERMISSIONS).map(([key, label]) => ({ key, label }))}
        />
      </div>
    </>
  );
}
