import type { Types } from "mongoose";
import { ListFilters } from "@/components/admin/list-filters";
import { PaymentsTable, type PaymentRow } from "@/components/admin/membership/payments-table";
import { PageHeader } from "@/components/admin/page-header";
import { AccessDenied, Notice } from "@/components/admin/ui/feedback";
import { escapeRegex, flatParams, parseList } from "@/lib/admin/list";
import { guardPage } from "@/lib/auth/dal";
import { connectDb } from "@/lib/db/connect";
import { AdminUser } from "@/lib/db/models/auth";
import { Member, MembershipPayment, PAYMENT_METHOD_LABELS } from "@/lib/db/models/membership";

/** Authenticated, per-request page: navigation waits for the server. */
export const instant = false;

export const metadata = { title: "Membership payments" };

const STATUS_LABEL: Record<string, string> = { verification_pending: "Verification pending", verified: "Verified", rejected: "Rejected" };

export default async function MembershipPaymentsPage({ searchParams }: PageProps<"/admin/membership/payments">) {
  const { admin, allowed } = await guardPage("membership:payments", "membership:read");
  if (!allowed) return <AccessDenied />;
  const query = flatParams(await searchParams);
  const list = parseList(query, { sortable: ["paidOn", "amountPaise", "status"], defaultSort: "paidOn" });

  await connectDb();
  const filter: Record<string, unknown> = {};
  if (query.status && query.status in STATUS_LABEL) filter.status = query.status;
  if (query.method && query.method in PAYMENT_METHOD_LABELS) filter.method = query.method;
  if (query.from || query.to) filter.paidOn = { ...(query.from ? { $gte: query.from } : {}), ...(query.to ? { $lte: query.to } : {}) };
  if (list.search) {
    const rx = new RegExp(escapeRegex(list.search), "i");
    const memberIds = await Member.find({ $or: [{ fullName: rx }, { membershipId: rx }, { applicationRef: rx }] }).distinct("_id");
    filter.$or = [{ transactionRef: rx }, { memberId: { $in: memberIds } }];
  }

  const [docs, total, pendingCount] = await Promise.all([
    MembershipPayment.find(filter).sort({ [list.sort]: list.dir, _id: -1 }).skip(list.skip).limit(list.pageSize).lean(),
    MembershipPayment.countDocuments(filter),
    MembershipPayment.countDocuments({ status: "verification_pending" }),
  ]);
  const members = new Map(
    (await Member.find({ _id: { $in: docs.map((d) => d.memberId) } }).select("fullName membershipId applicationRef").lean()).map((m) => [m._id.toString(), m]),
  );
  const users = new Map((await AdminUser.find({ _id: { $in: docs.map((d) => d.recordedBy as Types.ObjectId) } }).select("name").lean()).map((u) => [u._id.toString(), u.name]));

  const rows: PaymentRow[] = docs.map((p) => {
    const m = members.get(p.memberId.toString());
    return {
      id: p._id.toString(),
      memberId: p.memberId.toString(),
      memberName: m?.fullName ?? "Unknown",
      memberRef: m?.membershipId ?? m?.applicationRef ?? "",
      amountPaise: p.amountPaise,
      method: p.method,
      methodLabel: PAYMENT_METHOD_LABELS[p.method],
      transactionRef: p.transactionRef ?? null,
      paidOn: p.paidOn,
      status: p.status,
      statusLabel: STATUS_LABEL[p.status],
      recordedBy: users.get(p.recordedBy.toString()) ?? "—",
    };
  });

  return (
    <>
      <PageHeader
        title="Membership payments"
        description="Payments are recorded against an application and verified against the bank or UPI statement. Record new payments from the member's page."
        crumbs={[{ label: "Membership", href: "/admin/membership" }, { label: "Payments" }]}
      />
      {pendingCount > 0 && (
        <Notice className="mb-4">
          {pendingCount} payment{pendingCount === 1 ? "" : "s"} awaiting verification.
        </Notice>
      )}
      <div className="space-y-4">
        <ListFilters
          action="/admin/membership/payments"
          query={query}
          searchPlaceholder="Search member, membership ID or transaction reference"
          filters={[
            { type: "select", name: "status", label: "Status", options: Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label })) },
            { type: "select", name: "method", label: "Method", options: ["upi", "bank_transfer", "cheque", "cash"].map((v) => ({ value: v, label: PAYMENT_METHOD_LABELS[v] })) },
            { type: "date", name: "from", label: "Paid from" },
            { type: "date", name: "to", label: "Paid to" },
          ]}
        />
        <PaymentsTable rows={rows} total={total} page={list.page} pageSize={list.pageSize} query={query} canVerify={admin.permissions.includes("membership:payments")} />
      </div>
    </>
  );
}
