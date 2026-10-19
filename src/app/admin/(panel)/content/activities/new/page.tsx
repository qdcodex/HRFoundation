import { ActivityEditor } from "@/components/admin/content/content-forms";
import { PageHeader } from "@/components/admin/page-header";
import { AccessDenied } from "@/components/admin/ui/feedback";
import { mediaOptions } from "@/lib/admin/content-queries";
import { guardPage } from "@/lib/auth/dal";
import { connectDb } from "@/lib/db/connect";
import { Service } from "@/lib/db/models/content";

export const instant = false;
export const metadata = { title: "New activity" };

export default async function NewActivity() {
  const { allowed } = await guardPage("content:manage");
  if (!allowed) return <AccessDenied />;
  await connectDb();
  const [media, services] = await Promise.all([mediaOptions(), Service.find().sort({ order: 1 }).select("slug title").lean()]);
  return (
    <>
      <PageHeader title="New activity" crumbs={[{ label: "Activities", href: "/admin/content/activities" }, { label: "New" }]} />
      <div className="max-w-4xl">
        <ActivityEditor activity={null} media={media} services={services.map((s) => ({ slug: s.slug, title: s.title }))} />
      </div>
    </>
  );
}
