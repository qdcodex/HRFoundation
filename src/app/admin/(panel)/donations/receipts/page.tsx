import Link from "next/link";
import type { Types } from "mongoose";
import { ReceiptsTable, type ReceiptRow } from "@/components/admin/finance/finance-tables";
import { ListFilters } from "@/components/admin/list-filters";
import { PageHeader } from "@/components/admin/page-header";
import { AccessDenied, Notice } from "@/components/admin/ui/feedback";
import { escapeRegex, flatParams, istDayBoundary, parseList } from "@/lib/admin/list";
import { guardPage } from "@/lib/auth/dal";
import { connectDb } from "@/lib/db/connect";
import { Donation, DonationReceipt } from "@/lib/db/models/finance";

export const instant = false;
export const metadata = { title: "Donation receipts" };

export default async function ReceiptsPage({ searchParams }: PageProps<"/admin/donations/receipts">) {
  const { admin, allowed } = await guardPage("receipts:manage", "donations:read");
  if (!allowed) return <AccessDenied />;
  const query = flatParams(await searchParams);
  const list = parseList(query, { sortable: ["issuedAt", "amountPaise"], defaultSort: "issuedAt" });
  await connectDb();
  const filter: Record<string, unknown> = {};
  if (query.status === "issued" || query.status === "cancelled") filter.status = query.status;
  const from = istDayBoundary(query.from);
  const to = istDayBoundary(query.to, true);
  if (from || to) filter.issuedAt = { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) };
  if (list.search) {
    const rx = new RegExp(escapeRegex(list.search), "i");
    filter.$or = [{ receiptNumber: rx }, { donorName: rx }, { donationReference: rx }];
  }
  const [docs, total, awaiting] = await Promise.all([
    DonationReceipt.find(filter).sort({ [list.sort]: list.dir, _id: -1 }).skip(list.skip).limit(list.pageSize).lean(),
    DonationReceipt.countDocuments(filter),
    (async () => {
      const issued = await DonationReceipt.distinct("donationId", { status: "issued" });
      return Donation.countDocuments({ status: "verified", donorName: { $nin: [null, ""] }, _id: { $nin: issued } });
    })(),
  ]);
  const replaced = new Map((await DonationReceipt.find({ _id: { $in: docs.map((d) => d.replacesReceiptId).filter((x): x is Types.ObjectId => Boolean(x)) } }).select("receiptNumber").lean()).map((r) => [r._id.toString(), r.receiptNumber]));
  const rows: ReceiptRow[] = docs.map((r) => ({
    id: r._id.toString(),
    receiptNumber: r.receiptNumber,
    donationId: r.donationId.toString(),
    donorName: r.donorName,
    amountPaise: r.amountPaise,
    issuedAt: r.issuedAt.toISOString(),
    status: r.status,
    emailStatus: r.emailStatus,
    hasEmail: Boolean(r.donorEmail),
    issuedByName: r.issuedByName,
    replaces: r.replacesReceiptId ? (replaced.get(r.replacesReceiptId.toString()) ?? null) : null,
  }));

  return (
    <>
      <PageHeader
        title="Donation receipts"
        description="Receipts issued to individual donors for verified donations. These are separate from the foundation's registration documents."
        crumbs={[{ label: "Donations", href: "/admin/donations" }, { label: "Receipts" }]}
      />
      {awaiting > 0 && (
        <Notice className="mb-4">
          {awaiting} verified donation(s) with a donor name have no receipt yet.{" "}
          <Link href="/admin/donations?receipt=none" className="font-semibold underline">
            Review them
          </Link>
          .
        </Notice>
      )}
      <Notice tone="info" className="mb-4">
        Receipts do not state tax-deduction eligibility. Only one active receipt can exist per donation; corrections cancel the old receipt and issue a new number.
      </Notice>
      <div className="space-y-4">
        <ListFilters
          action="/admin/donations/receipts"
          query={query}
          searchPlaceholder="Search receipt number, donor or donation ref"
          filters={[
            {
              type: "select",
              name: "status",
              label: "Status",
              options: [
                { value: "issued", label: "Issued" },
                { value: "cancelled", label: "Cancelled" },
              ],
            },
            { type: "date", name: "from", label: "Issued from" },
            { type: "date", name: "to", label: "Issued to" },
          ]}
        />
        <ReceiptsTable rows={rows} total={total} page={list.page} pageSize={list.pageSize} query={query} canManage={admin.permissions.includes("receipts:manage")} />
      </div>
    </>
  );
}
