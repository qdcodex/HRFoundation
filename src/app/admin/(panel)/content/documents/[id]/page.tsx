import { notFound } from "next/navigation";
import { Types } from "mongoose";
import { DocumentEditor } from "@/components/admin/content/content-forms";
import { PageHeader } from "@/components/admin/page-header";
import { AccessDenied } from "@/components/admin/ui/feedback";
import { guardPage } from "@/lib/auth/dal";
import { connectDb } from "@/lib/db/connect";
import { PublicDocument } from "@/lib/db/models/content";

export const instant = false;
export const metadata = { title: "Document" };

export default async function EditDocument({ params }: PageProps<"/admin/content/documents/[id]">) {
  const { admin, allowed } = await guardPage("documents:manage", "documents:publish");
  if (!allowed) return <AccessDenied />;
  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) notFound();
  await connectDb();
  const d = await PublicDocument.findById(id).lean();
  if (!d) notFound();
  return (
    <>
      <PageHeader title={d.title} crumbs={[{ label: "Documents", href: "/admin/content/documents" }, { label: d.title }]} />
      <div className="max-w-3xl">
        <DocumentEditor
          canPublish={admin.permissions.includes("documents:publish")}
          doc={{
            id,
            title: d.title,
            description: d.description,
            category: d.category,
            docDate: d.docDate ?? "",
            visibility: d.visibility,
            order: d.order,
            status: d.status,
            fileName: d.file?.name ?? null,
          }}
        />
      </div>
    </>
  );
}
