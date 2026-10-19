import { notFound } from "next/navigation";
import { Types } from "mongoose";
import { NewsEditor } from "@/components/admin/content/content-forms";
import { PageHeader } from "@/components/admin/page-header";
import { AccessDenied } from "@/components/admin/ui/feedback";
import { mediaOptions } from "@/lib/admin/content-queries";
import { guardPage } from "@/lib/auth/dal";
import { connectDb } from "@/lib/db/connect";
import { NewsArticle } from "@/lib/db/models/content";
import { toIso, todayInIndia } from "@/lib/waiting-period";

export const instant = false;
export const metadata = { title: "Edit article" };

export default async function EditArticle({ params }: PageProps<"/admin/content/news/[id]">) {
  const { allowed } = await guardPage("content:manage");
  if (!allowed) return <AccessDenied />;
  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) notFound();
  await connectDb();
  const [n, media] = await Promise.all([NewsArticle.findById(id).lean(), mediaOptions()]);
  if (!n) notFound();
  return (
    <>
      <PageHeader
        title={`Edit: ${n.title}`}
        description={
          n.status === "published" ? (
            <a href={`/news/${n.slug}`} target="_blank" rel="noopener" className="font-mono text-emerald-ink underline">
              /news/{n.slug}
            </a>
          ) : (
            "Draft — not visible on the website."
          )
        }
        crumbs={[{ label: "News", href: "/admin/content/news" }, { label: n.title }]}
      />
      <div className="max-w-4xl">
        <NewsEditor
          media={media}
          today={toIso(todayInIndia())}
          article={{
            id,
            slug: n.slug,
            title: n.title,
            summary: n.summary,
            body: n.body,
            category: n.category,
            featuredImageId: n.featuredImageId?.toString() ?? "",
            publishDate: n.publishDate,
            seoTitle: n.seoTitle ?? "",
            seoDescription: n.seoDescription ?? "",
            status: n.status,
          }}
        />
      </div>
    </>
  );
}
