import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { SimpleTable } from "@/components/admin/simple-table";
import { Badge } from "@/components/admin/ui/badge";
import { Button } from "@/components/admin/ui/button";
import { AccessDenied, Notice } from "@/components/admin/ui/feedback";
import { documentCategories } from "@/content/documents";
import { guardPage } from "@/lib/auth/dal";
import { connectDb } from "@/lib/db/connect";
import { PublicDocument } from "@/lib/db/models/content";
import { fmtDateTime } from "@/lib/format";

export const instant = false;
export const metadata = { title: "Public documents" };

export default async function DocumentsList() {
  const { admin, allowed } = await guardPage("documents:manage", "documents:publish");
  if (!allowed) return <AccessDenied />;
  await connectDb();
  const docs = await PublicDocument.find().sort({ order: 1, createdAt: 1 }).lean();
  return (
    <>
      <PageHeader
        title="Public documents"
        description="Approved foundation documents for the public Documents page. Member, nominee and claim documents are stored separately and can never be published here."
        crumbs={[{ label: "Website" }, { label: "Documents" }]}
        actions={
          admin.permissions.includes("documents:manage") && (
            <Button asChild>
              <Link href="/admin/content/documents/new">
                <Plus aria-hidden /> New document
              </Link>
            </Button>
          )
        }
      />
      <Notice className="mb-4">Remove personal details (trustee PAN/Aadhaar, phone numbers, signatures) from scanned files before uploading.</Notice>
      <SimpleTable
        caption="Public documents"
        headers={["Document", "Category", "Visibility", "Status", "Updated", ""]}
        empty="No documents."
        rows={docs.map((d) => [
          <Link key="t" href={`/admin/content/documents/${d._id}`} className="font-semibold text-forest hover:underline">
            {d.title}
          </Link>,
          documentCategories[d.category],
          d.visibility === "public" && d.file ? "Public download" : "On request",
          d.status === "published" ? (
            <Badge key="s" tone="success">
              Published
            </Badge>
          ) : (
            <Badge key="s">Draft</Badge>
          ),
          <span key="u" className="text-xs text-muted">
            {fmtDateTime(d.updatedAt)}
          </span>,
          <Link key="e" href={`/admin/content/documents/${d._id}`} className="text-sm font-semibold text-emerald-ink hover:underline">
            Open<span className="sr-only"> {d.title}</span>
          </Link>,
        ])}
      />
    </>
  );
}
