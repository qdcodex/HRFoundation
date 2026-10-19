import Link from "next/link";
import { PageHeader } from "@/components/admin/page-header";
import { SimpleTable } from "@/components/admin/simple-table";
import { Badge } from "@/components/admin/ui/badge";
import { AccessDenied } from "@/components/admin/ui/feedback";
import { statusLabels } from "@/content/services";
import { guardPage } from "@/lib/auth/dal";
import { connectDb } from "@/lib/db/connect";
import { Service } from "@/lib/db/models/content";
import { fmtDateTime } from "@/lib/format";

export const instant = false;
export const metadata = { title: "Services" };

export default async function ServicesList() {
  const { allowed } = await guardPage("content:manage");
  if (!allowed) return <AccessDenied />;
  await connectDb();
  const services = await Service.find().sort({ order: 1 }).lean();
  return (
    <>
      <PageHeader
        title="Services"
        description="Edit service pages, status labels and publication. Only mark a service as a registered objective when it is in the trust's registration, and only list activities the trustees have approved."
        crumbs={[{ label: "Website" }, { label: "Services" }]}
      />
      <SimpleTable
        caption="Services"
        headers={["Service", "Status label", "Website", "Updated", ""]}
        empty="No services found. Run npm run db:seed."
        rows={services.map((s) => [
          <Link key="t" href={`/admin/content/services/${s.slug}`} className="font-semibold text-forest hover:underline">
            {s.title}
          </Link>,
          <Badge key="s" tone={statusLabels[s.status].tone === "confirmed" ? "success" : "warning"}>
            {statusLabels[s.status].label}
          </Badge>,
          s.published ? (
            <Badge key="p" tone="success">
              Published
            </Badge>
          ) : (
            <Badge key="p">Hidden</Badge>
          ),
          <span key="u" className="text-xs text-muted">
            {fmtDateTime(s.updatedAt)}
          </span>,
          <Link key="e" href={`/admin/content/services/${s.slug}`} className="text-sm font-semibold text-emerald-ink hover:underline">
            Edit<span className="sr-only"> {s.title}</span>
          </Link>,
        ])}
      />
    </>
  );
}
