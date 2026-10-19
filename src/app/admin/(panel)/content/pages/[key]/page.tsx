import { notFound } from "next/navigation";
import { PageEditor } from "@/components/admin/content/content-forms";
import { PageHeader } from "@/components/admin/page-header";
import { AccessDenied, Notice } from "@/components/admin/ui/feedback";
import { guardPage } from "@/lib/auth/dal";
import { connectDb } from "@/lib/db/connect";
import { SitePage } from "@/lib/db/models/content";
import { fmtDateTime } from "@/lib/format";

export const instant = false;
export const metadata = { title: "Edit page" };

export default async function EditPage({ params }: PageProps<"/admin/content/pages/[key]">) {
  const { allowed } = await guardPage("content:manage");
  if (!allowed) return <AccessDenied />;
  const { key } = await params;
  await connectDb();
  const page = await SitePage.findOne({ key: String(key).slice(0, 40) }).lean();
  if (!page) notFound();
  const pendingDraft = JSON.stringify(page.draft) !== JSON.stringify(page.published);
  return (
    <>
      <PageHeader
        title={`Edit: ${page.label}`}
        description={
          <>
            Live at{" "}
            <a href={page.path} target="_blank" rel="noopener" className="font-mono text-emerald-ink underline">
              {page.path}
            </a>
            {page.publishedAt && ` · last published ${fmtDateTime(page.publishedAt)}`}
          </>
        }
        crumbs={[{ label: "Pages", href: "/admin/content/pages" }, { label: page.label }]}
      />
      {pendingDraft && <Notice className="mb-6">This page has saved changes that are not yet published.</Notice>}
      <div className="max-w-4xl">
        <PageEditor
          page={{
            key: page.key,
            label: page.label,
            path: page.path,
            hasBody: page.hasBody,
            draft: { title: page.draft.title, intro: page.draft.intro, seoTitle: page.draft.seoTitle, seoDescription: page.draft.seoDescription, body: page.draft.body },
          }}
        />
      </div>
    </>
  );
}
