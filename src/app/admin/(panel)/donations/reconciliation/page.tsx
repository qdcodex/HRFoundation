import { DonationsTable } from "@/components/admin/finance/finance-tables";
import { ListFilters } from "@/components/admin/list-filters";
import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/admin/ui/card";
import { AccessDenied, Notice } from "@/components/admin/ui/feedback";
import { listDonations } from "@/lib/admin/finance-queries";
import { flatParams } from "@/lib/admin/list";
import { guardPage } from "@/lib/auth/dal";
import { connectDb } from "@/lib/db/connect";
import { Donation } from "@/lib/db/models/finance";
import { fmtDate } from "@/lib/format";
import { formatPaise } from "@/lib/money";

export const instant = false;
export const metadata = { title: "Payment reconciliation" };

export default async function ReconciliationPage({ searchParams }: PageProps<"/admin/donations/reconciliation">) {
  const { allowed } = await guardPage("donations:manage");
  if (!allowed) return <AccessDenied />;
  const query = flatParams(await searchParams);
  await connectDb();
  const [data, groups] = await Promise.all([
    listDonations({ sort: "donatedOn", dir: "asc", ...query }, { status: { $in: ["pending", "verification_pending"] } }),
    Donation.aggregate<{ _id: { amountPaise: number; donatedOn: string }; refs: string[]; n: number }>([
      { $match: { status: { $nin: ["failed", "cancelled"] } } },
      { $group: { _id: { amountPaise: "$amountPaise", donatedOn: "$donatedOn" }, refs: { $push: "$reference" }, n: { $sum: 1 } } },
      { $match: { n: { $gt: 1 } } },
      { $sort: { "_id.donatedOn": -1 } },
      { $limit: 20 },
    ]),
  ]);

  return (
    <>
      <PageHeader
        title="Payment reconciliation"
        description="Manual reconciliation for UPI, bank and cash donations: open each record, find the credit in the foundation's statement, then verify it or mark it failed. Screenshots are never accepted as proof."
        crumbs={[{ label: "Donations", href: "/admin/donations" }, { label: "Reconciliation" }]}
      />
      <Notice tone="info" className="mb-4">
        Transaction references are unique across donations and membership payments — the same UTR can never be recorded twice. Records with the same amount and date
        are flagged as possible duplicates for a manual check.
      </Notice>
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <ListFilters action="/admin/donations/reconciliation" query={query} searchPlaceholder="Search reference, donor or transaction ref" />
          <DonationsTable {...data} query={query} caption="Donations awaiting verification" />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Possible duplicates</CardTitle>
          </CardHeader>
          <CardContent>
            {groups.length === 0 ? (
              <p className="text-sm text-muted">No live donations share the same amount and date.</p>
            ) : (
              <ul className="divide-y divide-line text-sm">
                {groups.map((g) => (
                  <li key={`${g._id.amountPaise}-${g._id.donatedOn}`} className="py-2.5">
                    <p className="font-semibold">
                      {formatPaise(g._id.amountPaise)} on {fmtDate(g._id.donatedOn)} — {g.n} records
                    </p>
                    <p className="font-mono text-xs text-muted">{g.refs.join(", ")}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
