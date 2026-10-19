import { flatParams } from "@/lib/admin/list";
import { REPORTS, toCsv } from "@/lib/admin/reports";
import { audit } from "@/lib/audit";
import { authorize, AuthError } from "@/lib/auth/dal";

/** CSV export for a report. Permission is checked per report on the server; every export is audited. */
export async function GET(request: Request, { params }: RouteContext<"/admin/api/reports/[type]">) {
  try {
    const { type } = await params;
    const report = REPORTS[type];
    if (!report) return new Response("Unknown report", { status: 404 });
    const admin = await authorize(...report.any);
    const query = flatParams(Object.fromEntries(new URL(request.url).searchParams));
    const table = await report.build(query, admin);
    await audit(admin, {
      action: "reports.exported",
      entityType: "Report",
      entityId: type,
      summary: `Exported “${report.label}” (${table.rows.length} rows${query.from || query.to ? `, ${query.from ?? "…"} to ${query.to ?? "…"}` : ""}).`,
    });
    const stamp = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
    return new Response(toCsv(table), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="hrf-${type}-${stamp}.csv"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof AuthError) return new Response(error.message, { status: error.status });
    console.error("[report export]", error);
    return new Response("Error", { status: 500 });
  }
}
