import { NewsEditor } from "@/components/admin/content/content-forms";
import { PageHeader } from "@/components/admin/page-header";
import { AccessDenied } from "@/components/admin/ui/feedback";
import { mediaOptions } from "@/lib/admin/content-queries";
import { guardPage } from "@/lib/auth/dal";
import { toIso, todayInIndia } from "@/lib/waiting-period";

export const instant = false;
export const metadata = { title: "New article" };

export default async function NewArticle() {
  const { allowed } = await guardPage("content:manage");
  if (!allowed) return <AccessDenied />;
  const media = await mediaOptions();
  return (
    <>
      <PageHeader title="New article" crumbs={[{ label: "News", href: "/admin/content/news" }, { label: "New" }]} />
      <div className="max-w-4xl">
        <NewsEditor article={null} media={media} today={toIso(todayInIndia())} />
      </div>
    </>
  );
}
