import { DocumentEditor } from "@/components/admin/content/content-forms";
import { PageHeader } from "@/components/admin/page-header";
import { AccessDenied } from "@/components/admin/ui/feedback";
import { guardPage } from "@/lib/auth/dal";

export const instant = false;
export const metadata = { title: "New document" };

export default async function NewDocument() {
  const { admin, allowed } = await guardPage("documents:manage");
  if (!allowed) return <AccessDenied />;
  return (
    <>
      <PageHeader title="New public document" description="New documents are saved as drafts." crumbs={[{ label: "Documents", href: "/admin/content/documents" }, { label: "New" }]} />
      <div className="max-w-3xl">
        <DocumentEditor doc={null} canPublish={admin.permissions.includes("documents:publish")} />
      </div>
    </>
  );
}
