import "server-only";
import { Types } from "mongoose";
import type { AdminContext } from "@/lib/auth/dal";
import { connectDb } from "@/lib/db/connect";
import { Member, MEMBER_STATUS_LABELS, MembershipPayment, Nominee, type IMember, type MemberStatus } from "@/lib/db/models/membership";
import { trackWaitingPeriod, TRACKER_LABELS, type TrackerStatus } from "@/lib/domain/eligibility";
import { ageCutoff, trackerFilter, type TrackerFilter } from "@/lib/domain/membership-filters";
import { loadSettings, type MembershipRules } from "@/lib/settings";
import { todayInIndia } from "@/lib/waiting-period";
import { escapeRegex, istDayBoundary, parseList, type ListQuery } from "./list";
import { PAYMENT_SUMMARY_LABELS } from "./membership-labels";

export type PaymentSummary = "verified" | "verification_pending" | "rejected" | "none";

export type MemberRow = {
  id: string;
  applicationRef: string;
  membershipId: string | null;
  fullName: string;
  mobile: string;
  submittedAt: string;
  effectiveDate: string | null;
  status: MemberStatus;
  statusLabel: string;
  payment: PaymentSummary;
  waitingCompletes: string | null;
  tracker: TrackerStatus;
  trackerLabel: string;
  daysRemaining: number | null;
  age: number | null;
  ageEligible: boolean | null;
  nomineeName: string | null;
  requiresReview: boolean;
};

async function paymentSummaries(ids: Types.ObjectId[]) {
  const rows = await MembershipPayment.aggregate<{ _id: Types.ObjectId; statuses: string[] }>([
    { $match: { memberId: { $in: ids } } },
    { $group: { _id: "$memberId", statuses: { $addToSet: "$status" } } },
  ]);
  const map = new Map<string, PaymentSummary>();
  for (const r of rows) {
    map.set(r._id.toString(), r.statuses.includes("verified") ? "verified" : r.statuses.includes("verification_pending") ? "verification_pending" : "rejected");
  }
  return map;
}

/** Member ids matching a payment-summary filter (used to filter lists by payment status). */
async function idsByPayment(summary: PaymentSummary) {
  if (summary === "verified") return { _id: { $in: await MembershipPayment.distinct("memberId", { status: "verified" }) } };
  const verified = await MembershipPayment.distinct("memberId", { status: "verified" });
  if (summary === "verification_pending") {
    return { _id: { $in: await MembershipPayment.distinct("memberId", { status: "verification_pending" }), $nin: verified } };
  }
  const any = await MembershipPayment.distinct("memberId", {});
  if (summary === "none") return { _id: { $nin: any } };
  const pending = await MembershipPayment.distinct("memberId", { status: "verification_pending" });
  return { _id: { $in: await MembershipPayment.distinct("memberId", { status: "rejected" }), $nin: [...verified, ...pending] } };
}

export async function listMembers(
  q: ListQuery,
  opts: { scope: "applications" | "members" | "tracker"; admin: AdminContext; pageSize?: number },
): Promise<{ rows: MemberRow[]; total: number; page: number; pageSize: number; rules: MembershipRules }> {
  await connectDb();
  const rules = await loadSettings("membershipRules");
  const today = todayInIndia();
  const list = parseList(q, {
    sortable: ["submittedAt", "fullName", "effectiveDate", "membershipId", "status"],
    defaultSort: opts.scope === "applications" ? "submittedAt" : "effectiveDate",
    defaultDir: opts.scope === "tracker" ? "asc" : "desc",
    pageSize: opts.pageSize,
  });

  const and: Record<string, unknown>[] = [];
  if (opts.scope === "applications") {
    and.push({ status: q.status && q.status !== "all" ? q.status : { $in: ["draft", "pending_payment", "payment_verification", "pending_approval", "rejected"] } });
    if (!q.status) and.push({ status: { $ne: "rejected" } });
  } else {
    and.push({ membershipId: { $type: "string" } });
    if (q.status) and.push({ status: q.status });
    else if (opts.scope === "members") and.push({ status: "active" });
  }
  if (list.search) {
    const rx = new RegExp(escapeRegex(list.search), "i");
    const digits = list.search.replace(/\D/g, "");
    and.push({ $or: [{ fullName: rx }, { membershipId: rx }, { applicationRef: rx }, ...(digits.length >= 4 ? [{ mobile: new RegExp(escapeRegex(digits)) }] : [])] });
  }
  const from = istDayBoundary(q.from);
  const to = istDayBoundary(q.to, true);
  if (from || to) and.push({ submittedAt: { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) } });
  if (q.payment && q.payment in PAYMENT_SUMMARY_LABELS) and.push(await idsByPayment(q.payment as PaymentSummary));
  if (q.waiting && ["in_progress", "completed", "not_eligible", "inactive", "requires_review", "approaching"].includes(q.waiting)) {
    and.push(trackerFilter(q.waiting as TrackerFilter, rules, today));
  }
  if (q.age === "eligible") and.push({ dateOfBirth: { $gt: ageCutoff(today, rules.benefitAgeLimit) } });
  if (q.age === "over") and.push({ dateOfBirth: { $lte: ageCutoff(today, rules.benefitAgeLimit) } });

  const filter = and.length ? { $and: and } : {};
  const [docs, total] = await Promise.all([
    Member.find(filter)
      .sort({ [list.sort]: list.dir, _id: -1 })
      .skip(list.skip)
      .limit(list.pageSize)
      .select("-notes -address -consents")
      .lean<IMember[]>(),
    Member.countDocuments(filter),
  ]);

  const ids = docs.map((d) => d._id);
  const payments = await paymentSummaries(ids);
  const nominees = opts.admin.permissions.includes("nominees:read")
    ? new Map((await Nominee.find({ memberId: { $in: ids } }).select("memberId name").lean()).map((n) => [n.memberId.toString(), n.name]))
    : null;

  const rows: MemberRow[] = docs.map((m) => {
    const t = trackWaitingPeriod(m, rules, today);
    return {
      id: m._id.toString(),
      applicationRef: m.applicationRef,
      membershipId: m.membershipId ?? null,
      fullName: m.fullName,
      mobile: m.mobile,
      submittedAt: m.submittedAt.toISOString(),
      effectiveDate: m.effectiveDate ?? null,
      status: m.status,
      statusLabel: MEMBER_STATUS_LABELS[m.status],
      payment: payments.get(m._id.toString()) ?? "none",
      waitingCompletes: t.completes,
      tracker: t.status,
      trackerLabel: TRACKER_LABELS[t.status],
      daysRemaining: t.daysRemaining,
      age: t.age,
      ageEligible: t.ageEligible,
      nomineeName: nominees ? (nominees.get(m._id.toString()) ?? null) : null,
      requiresReview: Boolean(m.requiresReview),
    };
  });
  return { rows, total, page: list.page, pageSize: list.pageSize, rules };
}

/** Counts per waiting-period tracker status (activated members only). */
export async function trackerCounts(rules: MembershipRules) {
  await connectDb();
  const today = todayInIndia();
  const keys: TrackerFilter[] = ["in_progress", "approaching", "completed", "not_eligible", "inactive", "requires_review"];
  const counts = await Promise.all(keys.map((k) => Member.countDocuments({ membershipId: { $type: "string" }, ...trackerFilter(k, rules, today) })));
  return Object.fromEntries(keys.map((k, i) => [k, counts[i]])) as Record<TrackerFilter, number>;
}
