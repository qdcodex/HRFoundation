import "server-only";
import { connectDb } from "@/lib/db/connect";
import { Donation, DonationReceipt, DONATION_STATUS_LABELS, type IDonation } from "@/lib/db/models/finance";
import { PAYMENT_METHOD_LABELS } from "@/lib/db/models/membership";
import { escapeRegex, parseList, type ListQuery } from "./list";
import type { DonationRow } from "@/components/admin/finance/finance-tables";

export async function listDonations(q: ListQuery, base: Record<string, unknown> = {}) {
  await connectDb();
  const list = parseList(q, { sortable: ["donatedOn", "amountPaise", "status", "createdAt"], defaultSort: "donatedOn" });
  const filter: Record<string, unknown> = { ...base };
  if (q.status && q.status in DONATION_STATUS_LABELS) filter.status = q.status;
  if (q.method && q.method in PAYMENT_METHOD_LABELS) filter.method = q.method;
  if (q.from || q.to) filter.donatedOn = { ...(q.from ? { $gte: q.from } : {}), ...(q.to ? { $lte: q.to } : {}) };
  if (list.search) {
    const rx = new RegExp(escapeRegex(list.search), "i");
    filter.$or = [{ reference: rx }, { donorName: rx }, { transactionRef: rx }];
  }
  if (q.receipt === "issued" || q.receipt === "none") {
    const ids = await DonationReceipt.distinct("donationId", { status: "issued" });
    filter._id = q.receipt === "issued" ? { $in: ids } : { $nin: ids };
    if (q.receipt === "none") filter.status = "verified";
  }

  const [docs, total] = await Promise.all([
    Donation.find(filter).sort({ [list.sort]: list.dir, _id: -1 }).skip(list.skip).limit(list.pageSize).select("-notes").lean<IDonation[]>(),
    Donation.countDocuments(filter),
  ]);
  const ids = docs.map((d) => d._id);
  const issued = new Set((await DonationReceipt.find({ donationId: { $in: ids }, status: "issued" }).select("donationId").lean()).map((r) => r.donationId.toString()));

  // Possible duplicates: another live donation with the same amount and date.
  const dupes = docs.length
    ? await Donation.aggregate<{ _id: { a: number; d: string }; n: number }>([
        { $match: { status: { $nin: ["failed", "cancelled"] }, $or: docs.map((d) => ({ amountPaise: d.amountPaise, donatedOn: d.donatedOn })) } },
        { $group: { _id: { a: "$amountPaise", d: "$donatedOn" }, n: { $sum: 1 } } },
        { $match: { n: { $gt: 1 } } },
      ])
    : [];
  const dupeKeys = new Set(dupes.map((x) => `${x._id.a}|${x._id.d}`));

  const rows: DonationRow[] = docs.map((d) => ({
    id: d._id.toString(),
    reference: d.reference,
    donorName: d.donorName ?? null,
    donatedOn: d.donatedOn,
    amountPaise: d.amountPaise,
    methodLabel: PAYMENT_METHOD_LABELS[d.method],
    transactionRef: d.transactionRef ?? null,
    status: d.status,
    statusLabel: DONATION_STATUS_LABELS[d.status],
    receipt: d.status === "verified" ? (issued.has(d._id.toString()) ? "issued" : "none") : "not_applicable",
    possibleDuplicate: !["failed", "cancelled"].includes(d.status) && dupeKeys.has(`${d.amountPaise}|${d.donatedOn}`),
  }));
  return { rows, total, page: list.page, pageSize: list.pageSize };
}

export const DONATION_FILTERS = [
  { type: "select" as const, name: "status", label: "Verification", options: Object.entries(DONATION_STATUS_LABELS).map(([value, label]) => ({ value, label })) },
  { type: "select" as const, name: "method", label: "Method", options: ["upi", "bank_transfer", "cheque", "cash", "gateway"].map((v) => ({ value: v, label: PAYMENT_METHOD_LABELS[v] })) },
  {
    type: "select" as const,
    name: "receipt",
    label: "Receipt",
    options: [
      { value: "issued", label: "Issued" },
      { value: "none", label: "Verified, not issued" },
    ],
  },
  { type: "date" as const, name: "from", label: "From" },
  { type: "date" as const, name: "to", label: "To" },
];
