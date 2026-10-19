import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { SimpleTable } from "@/components/admin/simple-table";
import { Badge } from "@/components/admin/ui/badge";
import { Button } from "@/components/admin/ui/button";
import { AccessDenied } from "@/components/admin/ui/feedback";
import { guardPage } from "@/lib/auth/dal";
import { connectDb } from "@/lib/db/connect";
import { Activity } from "@/lib/db/models/content";
import { fmtDate } from "@/lib/format";

export const instant = false;
export const metadata = { title: "Activities" };

export default async function ActivitiesList() {
  const { allowed } = await guardPage("content:manage");
  if (!allowed) return <AccessDenied />;
  await connectDb();
  const items = await Activity.find().sort({ date: -1 }).lean();
  return (
    <>
      <PageHeader
        title="Activities & initiatives"
        description="Publish only activities approved by the foundation. Mark an activity completed only after it has taken place and been verified."
        crumbs={[{ label: "Website" }, { label: "Activities" }]}
        actions={
          <Button asChild>
            <Link href="/admin/content/activities/new">
              <Plus aria-hidden /> New activity
            </Link>
          </Button>
        }
      />
      <SimpleTable
        caption="Activities"
        headers={["Activity", "Date", "Status", "Website", ""]}
        empty="No activities yet."
        rows={items.map((a) => [
          <Link key="t" href={`/admin/content/activities/${a._id}`} className="font-semibold text-forest hover:underline">
            {a.title}
          </Link>,
          fmtDate(a.date),
          <Badge key="s" tone={a.status === "completed" ? "success" : "info"}>
            {a.status === "completed" ? "Completed" : "Planned"}
          </Badge>,
          a.published ? (
            <Badge key="p" tone="success">
              Published
            </Badge>
          ) : (
            <Badge key="p">Not published</Badge>
          ),
          <Link key="e" href={`/admin/content/activities/${a._id}`} className="text-sm font-semibold text-emerald-ink hover:underline">
            Edit<span className="sr-only"> {a.title}</span>
          </Link>,
        ])}
      />
    </>
  );
}
