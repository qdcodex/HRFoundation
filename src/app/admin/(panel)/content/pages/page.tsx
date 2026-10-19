import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { SimpleTable } from "@/components/admin/simple-table";
import { Badge } from "@/components/admin/ui/badge";
import { AccessDenied } from "@/components/admin/ui/feedback";
import { guardPage } from "@/lib/auth/dal";
import { connectDb } from "@/lib/db/connect";
import { SitePage } from "@/lib/db/models/content";
import { fmtDateTime } from "@/lib/format";

export const instant = false;
export const metadata = { title: "Pages" };

export default async function PagesList() {
  const { allowed } = await guardPage("content:manage");
  if (!allowed) return <AccessDenied />;
  await connectDb();
  const pages = await SitePage.find().sort({ path: 1 }).lean();
  return (
    <>
      <PageHeader
        title="Website pages"
        description="Edit page headlines, introductions, SEO text and the privacy and terms text. Save a draft to work privately; publish to update the live website."
        crumbs={[{ label: "Website" }, { label: "Pages" }]}
      />
      <SimpleTable
        caption="Website pages"
        headers={["Page", "Path", "Status", "Last change", ""]}
        empty="No pages found. Run npm run db:seed to load the website's pages."
        rows={pages.map((p) => {
          const pendingDraft = JSON.stringify(p.draft) !== JSON.stringify(p.published);
          return [
            <Link key="l" href={`/admin/content/pages/${p.key}`} className="font-semibold text-forest hover:underline">
              {p.label}
            </Link>,
            <a key="p" href={p.path} target="_blank" rel="noopener" className="inline-flex items-center gap-1 font-mono text-xs text-muted hover:text-forest">
              {p.path} <ExternalLink className="size-3" aria-hidden />
              <span className="sr-only">(opens in new tab)</span>
            </a>,
            <span key="s" className="flex flex-wrap gap-1">
              {p.published ? <Badge tone="success">Published</Badge> : <Badge>Using defaults</Badge>}
              {pendingDraft && <Badge tone="warning">Unpublished changes</Badge>}
            </span>,
            <span key="c" className="text-xs text-muted">
              {fmtDateTime(p.updatedAt)}
              {p.updatedByName ? ` · ${p.updatedByName}` : ""}
            </span>,
            <Link key="e" href={`/admin/content/pages/${p.key}`} className="text-sm font-semibold text-emerald-ink hover:underline">
              Edit<span className="sr-only"> {p.label}</span>
            </Link>,
          ];
        })}
      />
    </>
  );
}
