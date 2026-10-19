import { notFound } from "next/navigation";
import { Types } from "mongoose";
import { ActivityEditor } from "@/components/admin/content/content-forms";
import { PageHeader } from "@/components/admin/page-header";
import { AccessDenied } from "@/components/admin/ui/feedback";
import { mediaOptions } from "@/lib/admin/content-queries";
import { guardPage } from "@/lib/auth/dal";
import { connectDb } from "@/lib/db/connect";
import { Activity, Service } from "@/lib/db/models/content";

export const instant = false;
export const metadata = { title: "Edit activity" };

export default async function EditActivity({ params }: PageProps<"/admin/content/activities/[id]">) {
  const { allowed } = await guardPage("content:manage");
  if (!allowed) return <AccessDenied />;
  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) notFound();
  await connectDb();
  const [a, media, services] = await Promise.all([Activity.findById(id).lean(), mediaOptions(), Service.find().sort({ order: 1 }).select("slug title").lean()]);
  if (!a) notFound();
  return (
    <>
      <PageHeader title={`Edit: ${a.title}`} crumbs={[{ label: "Activities", href: "/admin/content/activities" }, { label: a.title }]} />
      <div className="max-w-4xl">
        <ActivityEditor
          media={media}
          services={services.map((s) => ({ slug: s.slug, title: s.title }))}
          activity={{
            id,
            slug: a.slug,
            title: a.title,
            description: a.description,
            date: a.date,
            location: a.location ?? "",
            status: a.status,
            serviceSlug: a.serviceSlug ?? "",
            mediaIds: a.mediaIds.map(String),
            published: a.published,
          }}
        />
      </div>
    </>
  );
}
