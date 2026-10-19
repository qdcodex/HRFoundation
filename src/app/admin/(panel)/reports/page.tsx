import Link from "next/link";
import { Download } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { SimpleTable } from "@/components/admin/simple-table";
import { Button } from "@/components/admin/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/admin/ui/card";
import { AccessDenied } from "@/components/admin/ui/feedback";
import { Input, Label } from "@/components/admin/ui/form";
import { flatParams } from "@/lib/admin/list";
import { REPORTS, reportsFor } from "@/lib/admin/reports";
import { requireAdmin } from "@/lib/auth/dal";
import { cn } from "@/lib/utils";

export const instant = false;
export const metadata = { title: "Reports" };

export default async function ReportsPage({ searchParams }: PageProps<"/admin/reports">) {
  const admin = await requireAdmin();
  const available = reportsFor(admin.permissions);
  if (available.length === 0) return <AccessDenied />;
  const q = flatParams(await searchParams);
  const selected = q.report && available.some(([k]) => k === q.report) ? q.report : available[0][0];
  const report = REPORTS[selected];
  const table = await report.build(q, admin);
  const qs = new URLSearchParams({ ...(q.from ? { from: q.from } : {}), ...(q.to ? { to: q.to } : {}) }).toString();

  return (
    <>
      <PageHeader
        title="Reports"
        description="Reports are built from database records at the time you open them. Exports respect your permissions and are recorded in the audit log."
        crumbs={[{ label: "Reports" }]}
      />
      <div className="grid gap-6 xl:grid-cols-4">
        <nav aria-label="Reports" className="xl:col-span-1">
          <ul className="space-y-1">
            {available.map(([key, r]) => (
              <li key={key}>
                <Link
                  href={`/admin/reports?report=${key}${qs ? `&${qs}` : ""}`}
                  aria-current={key === selected ? "page" : undefined}
                  className={cn("block rounded-lg px-3 py-2 text-sm hover:bg-white", key === selected && "bg-white font-semibold text-forest shadow-xs ring-1 ring-line")}
                >
                  {r.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="space-y-4 xl:col-span-3">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>{report.label}</CardTitle>
                <CardDescription>{report.description}</CardDescription>
              </div>
              <Button asChild variant="outline">
                <a href={`/admin/api/reports/${selected}${qs ? `?${qs}` : ""}`}>
                  <Download aria-hidden /> Export CSV
                </a>
              </Button>
            </CardHeader>
            {report.dated && (
              <CardContent>
                <form method="get" className="flex flex-wrap items-end gap-3">
                  <input type="hidden" name="report" value={selected} />
                  <div>
                    <Label htmlFor="from">From</Label>
                    <Input id="from" type="date" name="from" defaultValue={q.from ?? ""} className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="to">To</Label>
                    <Input id="to" type="date" name="to" defaultValue={q.to ?? ""} className="mt-1" />
                  </div>
                  <Button type="submit">Apply</Button>
                </form>
              </CardContent>
            )}
          </Card>
          <p className="text-sm text-muted">{table.rows.length} row(s){table.rows.length > 200 ? " — showing the first 200; export for all rows" : ""}.</p>
          <SimpleTable caption={report.label} headers={table.headers} rows={table.rows.slice(0, 200).map((r) => r.map((c) => String(c)))} empty="No records for this period." />
        </div>
      </div>
    </>
  );
}
