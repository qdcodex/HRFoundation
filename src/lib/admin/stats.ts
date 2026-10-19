import "server-only";
import type { Model } from "mongoose";
import { connectDb } from "@/lib/db/connect";
import { Claim, CLAIM_STATUS_LABELS, CLAIM_STATUSES } from "@/lib/db/models/claims";
import { Donation } from "@/lib/db/models/finance";
import { Member, MEMBER_STATUS_LABELS, MEMBER_STATUSES } from "@/lib/db/models/membership";
import { trackerFilter } from "@/lib/domain/membership-filters";
import type { MembershipRules } from "@/lib/settings";
import { todayInIndia } from "@/lib/waiting-period";

/**
 * Dashboard aggregations. Every figure is a direct database aggregation:
 * - "Verified donations" sums only donations with status "verified".
 * - Months are calendar months in India Standard Time.
 */

export const RANGES = { "6m": 6, "12m": 12, "24m": 24 } as const;
export type RangeKey = keyof typeof RANGES;

export function monthsBack(n: number) {
  const t = todayInIndia();
  const out: { month: string; label: string }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(t.year, t.month - 1 - i, 1));
    const month = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    out.push({ month, label: new Intl.DateTimeFormat("en-IN", { month: "short", year: "2-digit", timeZone: "UTC" }).format(d) });
  }
  return out;
}

function fill(months: { month: string; label: string }[], rows: { _id: string; value: number }[]) {
  const map = new Map(rows.map((r) => [r._id, r.value]));
  return months.map((m) => ({ ...m, value: map.get(m.month) ?? 0 }));
}

export async function registrationsByMonth(n: number) {
  await connectDb();
  const months = monthsBack(n);
  const from = new Date(`${months[0].month}-01T00:00:00+05:30`);
  const rows = await Member.aggregate<{ _id: string; value: number }>([
    { $match: { submittedAt: { $gte: from } } },
    { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$submittedAt", timezone: "Asia/Kolkata" } }, value: { $sum: 1 } } },
  ]);
  return fill(months, rows);
}

export async function verifiedDonationsByMonth(n: number) {
  await connectDb();
  const months = monthsBack(n);
  const rows = await Donation.aggregate<{ _id: string; value: number }>([
    { $match: { status: "verified", donatedOn: { $gte: `${months[0].month}-01` } } },
    { $group: { _id: { $substrBytes: ["$donatedOn", 0, 7] }, value: { $sum: "$amountPaise" } } },
  ]);
  return fill(months, rows);
}

async function distribution<K extends string>(model: Model<never>, keys: readonly K[], labels: Record<K, string>) {
  const rows = await model.aggregate<{ _id: K; n: number }>([{ $group: { _id: "$status", n: { $sum: 1 } } }]);
  const map = new Map(rows.map((r) => [r._id, r.n]));
  return keys.map((k) => ({ key: k, label: labels[k], value: map.get(k) ?? 0 }));
}

export async function memberStatusDistribution() {
  await connectDb();
  return distribution(Member as unknown as Model<never>, MEMBER_STATUSES, MEMBER_STATUS_LABELS);
}

export async function claimStatusDistribution() {
  await connectDb();
  return distribution(Claim as unknown as Model<never>, CLAIM_STATUSES, CLAIM_STATUS_LABELS);
}

export async function membershipStats(rules: MembershipRules) {
  await connectDb();
  const today = todayInIndia();
  const activated = { membershipId: { $type: "string" as const } };
  const [total, active, awaiting, pendingPayment, inWaiting, completed] = await Promise.all([
    Member.countDocuments(activated),
    Member.countDocuments({ status: "active" }),
    Member.countDocuments({ status: { $in: ["payment_verification", "pending_approval"] } }),
    Member.countDocuments({ status: "pending_payment" }),
    Member.countDocuments({ ...activated, ...trackerFilter("in_progress", rules, today) }),
    Member.countDocuments({ ...activated, ...trackerFilter("completed", rules, today) }),
  ]);
  return { total, active, awaiting, pendingPayment, inWaiting, completed };
}

export async function donationStats() {
  await connectDb();
  const [verified] = await Donation.aggregate<{ sum: number; n: number }>([{ $match: { status: "verified" } }, { $group: { _id: null, sum: { $sum: "$amountPaise" }, n: { $sum: 1 } } }]);
  const awaiting = await Donation.countDocuments({ status: { $in: ["pending", "verification_pending"] } });
  return { verifiedPaise: verified?.sum ?? 0, verifiedCount: verified?.n ?? 0, awaiting };
}

export async function claimStats() {
  await connectDb();
  const [awaiting, approved] = await Promise.all([
    Claim.countDocuments({ status: { $in: ["submitted", "under_review", "info_required"] } }),
    Claim.countDocuments({ status: { $in: ["approved", "payment_pending", "paid"] } }),
  ]);
  return { awaiting, approved };
}
