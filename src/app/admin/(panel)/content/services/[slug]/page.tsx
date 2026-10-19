import { notFound } from "next/navigation";
import { ServiceEditor } from "@/components/admin/content/content-forms";
import { PageHeader } from "@/components/admin/page-header";
import { AccessDenied } from "@/components/admin/ui/feedback";
import { mediaOptions } from "@/lib/admin/content-queries";
import { guardPage } from "@/lib/auth/dal";
import { connectDb } from "@/lib/db/connect";
import { Service } from "@/lib/db/models/content";

export const instant = false;
export const metadata = { title: "Edit service" };

export default async function EditService({ params }: PageProps<"/admin/content/services/[slug]">) {
  const { allowed } = await guardPage("content:manage");
  if (!allowed) return <AccessDenied />;
  const { slug } = await params;
  await connectDb();
  const s = await Service.findOne({ slug: String(slug).slice(0, 80) }).lean();
  if (!s) notFound();
  const media = await mediaOptions();
  return (
    <>
      <PageHeader
        title={`Edit: ${s.title}`}
        description={
          <a href={`/services/${s.slug}`} target="_blank" rel="noopener" className="font-mono text-emerald-ink underline">
            /services/{s.slug}
          </a>
        }
        crumbs={[{ label: "Services", href: "/admin/content/services" }, { label: s.shortTitle }]}
      />
      <div className="max-w-4xl">
        <ServiceEditor
          media={media}
          service={{
            slug: s.slug,
            title: s.title,
            shortTitle: s.shortTitle,
            status: s.status,
            published: s.published,
            summary: s.summary,
            seoTitle: s.seoTitle ?? "",
            metaDescription: s.metaDescription,
            overview: s.overview.join("\n\n"),
            objectives: s.objectives.join("\n"),
            approvedActivities: s.approvedActivities.map((a) => (a.description ? `${a.title} — ${a.description}` : a.title)).join("\n"),
            potentialInitiatives: s.potentialInitiatives.join("\n"),
            eligibility: s.eligibility.join("\n"),
            enquiry: s.enquiry,
            imageId: s.imageId?.toString() ?? "",
          }}
        />
      </div>
    </>
  );
}
