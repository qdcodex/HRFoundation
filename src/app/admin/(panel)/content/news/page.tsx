import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { SimpleTable } from "@/components/admin/simple-table";
import { Badge } from "@/components/admin/ui/badge";
import { Button } from "@/components/admin/ui/button";
import { AccessDenied } from "@/components/admin/ui/feedback";
import { guardPage } from "@/lib/auth/dal";
import { connectDb } from "@/lib/db/connect";
import { NewsArticle } from "@/lib/db/models/content";
import { fmtDate } from "@/lib/format";

export const instant = false;
export const metadata = { title: "News" };

export default async function NewsList() {
  const { allowed } = await guardPage("content:manage");
  if (!allowed) return <AccessDenied />;
  await connectDb();
  const items = await NewsArticle.find().sort({ publishDate: -1 }).select("-body").lean();
  return (
    <>
      <PageHeader
        title="News & updates"
        description="Write official announcements. Drafts are private; published articles appear on the News page and home page."
        crumbs={[{ label: "Website" }, { label: "News" }]}
        actions={
          <Button asChild>
            <Link href="/admin/content/news/new">
              <Plus aria-hidden /> New article
            </Link>
          </Button>
        }
      />
      <SimpleTable
        caption="News articles"
        headers={["Title", "Category", "Publication date", "Status", ""]}
        empty="No articles yet."
        rows={items.map((n) => [
          <Link key="t" href={`/admin/content/news/${n._id}`} className="font-semibold text-forest hover:underline">
            {n.title}
          </Link>,
          n.category,
          fmtDate(n.publishDate),
          n.status === "published" ? (
            <Badge key="s" tone="success">
              Published
            </Badge>
          ) : (
            <Badge key="s">Draft</Badge>
          ),
          <Link key="e" href={`/admin/content/news/${n._id}`} className="text-sm font-semibold text-emerald-ink hover:underline">
            Edit<span className="sr-only"> {n.title}</span>
          </Link>,
        ])}
      />
    </>
  );
}
