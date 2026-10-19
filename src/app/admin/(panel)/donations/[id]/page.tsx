import { notFound } from "next/navigation";
import { Types } from "mongoose";
import { DonationActions, ReceiptActions } from "@/components/admin/finance/donation-actions";
import { PageHeader } from "@/components/admin/page-header";
import { Badge, StatusBadge } from "@/components/admin/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, DetailList } from "@/components/admin/ui/card";
import { AccessDenied } from "@/components/admin/ui/feedback";
import { guardPage } from "@/lib/auth/dal";
import { connectDb } from "@/lib/db/connect";
import { AdminUser } from "@/lib/db/models/auth";
import { Donation, DonationReceipt, DONATION_STATUS_LABELS } from "@/lib/db/models/finance";
import { PAYMENT_METHOD_LABELS } from "@/lib/db/models/membership";
import { AuditLog } from "@/lib/db/models/system";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { formatPaise } from "@/lib/money";

export const instant = false;
export const metadata = { title: "Donation" };

export default async function DonationDetailPage({ params }: PageProps<"/admin/donations/[id]">) {
  const { admin, allowed } = await guardPage("donations:read");
  if (!allowed) return <AccessDenied />;
  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) notFound();
  await connectDb();
  const d = await Donation.findById(id).lean();
  if (!d) notFound();
  const [receipts, history, users, similar] = await Promise.all([
    DonationReceipt.find({ donationId: d._id }).sort({ issuedAt: -1 }).lean(),
    AuditLog.find({ entityType: "Donation", entityId: id }).sort({ at: -1 }).limit(30).lean(),
    AdminUser.find({ _id: { $in: [d.recordedBy, d.verifiedBy].filter((x): x is Types.ObjectId => Boolean(x)) } }).select("name").lean(),
    Donation.find({ _id: { $ne: d._id }, amountPaise: d.amountPaise, donatedOn: d.donatedOn, status: { $nin: ["failed", "cancelled"] } }).select("reference donorName transactionRef").lean(),
  ]);
  const names = new Map(users.map((u) => [u._id.toString(), u.name]));
  const has = (p: (typeof admin.permissions)[number]) => admin.permissions.includes(p);

  return (
    <>
      <PageHeader
        title={`${formatPaise(d.amountPaise)} — ${d.donorName || "Donor not provided"}`}
        crumbs={[{ label: "Donations", href: "/admin/donations" }, { label: d.reference }]}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={d.status} label={DONATION_STATUS_LABELS[d.status]} />
            <span className="font-mono text-xs">{d.reference}</span>
          </span>
        }
        actions={
          <DonationActions
            donationId={id}
            status={d.status}
            canManage={has("donations:manage")}
            canReceipt={has("receipts:manage")}
            hasIssuedReceipt={receipts.some((r) => r.status === "issued")}
            hasDonorName={Boolean(d.donorName)}
            donor={{ donorName: d.donorName ?? "", donorEmail: d.donorEmail ?? "", donorPhone: d.donorPhone ?? "", donorAddress: d.donorAddress ?? "", purpose: d.purpose ?? "" }}
          />
        }
      />
      {similar.length > 0 && (
        <div className="mb-6 rounded-lg border border-gold/50 bg-gold-soft/35 px-4 py-3 text-sm">
          <strong>Possible duplicate:</strong> {similar.length} other donation(s) share this amount and date:{" "}
          {similar.map((s) => `${s.reference}${s.transactionRef ? ` (${s.transactionRef})` : ""}`).join(", ")}. Check the statement before verifying.
        </div>
      )}
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Payment</CardTitle>
            </CardHeader>
            <CardContent>
              <DetailList
                items={[
                  { label: "Amount", value: formatPaise(d.amountPaise) },
                  { label: "Date received", value: fmtDate(d.donatedOn) },
                  { label: "Method", value: PAYMENT_METHOD_LABELS[d.method] },
                  { label: "Transaction ref", value: <span className="font-mono">{d.transactionRef ?? "—"}</span> },
                  { label: "Source", value: d.source === "manual" ? "Recorded by staff" : "Online gateway" },
                  { label: "Purpose", value: d.purpose ?? "—" },
                  { label: "Recorded by", value: `${names.get(d.recordedBy.toString()) ?? "—"}, ${fmtDateTime(d.createdAt)}` },
                  { label: "Verified", value: d.verifiedAt ? `${names.get(String(d.verifiedBy)) ?? "—"}, ${fmtDateTime(d.verifiedAt)}` : "Not verified" },
                  { label: "Reconciliation note", value: d.reconciliationNote ?? "—" },
                  { label: "Status reason", value: d.statusReason ?? "—" },
                ]}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Receipts</CardTitle>
            </CardHeader>
            <CardContent>
              {receipts.length === 0 ? (
                <p className="text-sm text-muted">{d.status === "verified" ? "No receipt issued yet." : "Receipts can be issued once the donation is verified."}</p>
              ) : (
                <ul className="divide-y divide-line">
                  {receipts.map((r) => (
                    <li key={r._id.toString()} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                      <span>
                        <a href={`/admin/api/receipts/${r._id}`} target="_blank" rel="noopener" className="font-mono font-semibold text-emerald-ink hover:underline">
                          {r.receiptNumber}
                        </a>
                        <Badge tone={r.status === "issued" ? "success" : "neutral"} className="ml-2">
                          {r.status === "issued" ? "Issued" : "Cancelled"}
                        </Badge>
                        <span className="block text-xs text-muted">
                          {fmtDateTime(r.issuedAt)} · {r.issuedByName} · email: {r.emailStatus.replace(/_/g, " ")}
                          {r.cancelReason && ` · cancelled: ${r.cancelReason}`}
                        </span>
                      </span>
                      {has("receipts:manage") && <ReceiptActions receiptId={r._id.toString()} status={r.status} hasEmail={Boolean(r.donorEmail)} />}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Donor</CardTitle>
            </CardHeader>
            <CardContent>
              <DetailList
                items={[
                  { label: "Name", value: d.donorName ?? "—" },
                  { label: "Mobile", value: d.donorPhone ?? "—" },
                  { label: "Email", value: d.donorEmail ?? "—" },
                  { label: "Address", value: d.donorAddress ?? "—" },
                ]}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>History</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3 border-l-2 border-line pl-4 text-sm">
                {history.map((h) => (
                  <li key={h._id.toString()}>
                    <p>{h.summary}</p>
                    <p className="text-xs text-muted">
                      {h.actorName} · {fmtDateTime(h.at)}
                    </p>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
