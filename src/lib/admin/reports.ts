import "server-only";
import type { AdminContext } from "@/lib/auth/dal";
import type { Permission } from "@/lib/auth/permissions";
import { connectDb } from "@/lib/db/connect";
import { Claim, CLAIM_STATUS_LABELS } from "@/lib/db/models/claims";
import { Donation, DonationReceipt, DONATION_STATUS_LABELS } from "@/lib/db/models/finance";
import { Member, MEMBER_STATUS_LABELS, MembershipPayment, PAYMENT_METHOD_LABELS } from "@/lib/db/models/membership";
import { Enquiry, ENQUIRY_STATUS_LABELS } from "@/lib/db/models/system";
import { formatPaise } from "@/lib/money";
import { escapeRegex, istDayBoundary, type ListQuery } from "./list";
import { listMembers } from "./membership-queries";
import { listDonations } from "./finance-queries";

/**
 * Report definitions. Every report is built from database records, checks its own permission,
 * and never includes nominee or claimant contact details or supporting documents.
 */
export type ReportTable = { headers: string[]; rows: (string | number)[][] };
type ReportDef = { label: string; description: string; any: Permission[]; dated: boolean; build: (q: ListQuery, admin: AdminContext) => Promise<ReportTable> };

const MAX_ROWS = 10_000;

function dateRange(q: ListQuery) {
  const from = istDayBoundary(q.from);
  const to = istDayBoundary(q.to, true);
  return from || to ? { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) } : undefined;
}
function isoRange(q: ListQuery) {
  return q.from || q.to ? { ...(q.from ? { $gte: q.from } : {}), ...(q.to ? { $lte: q.to } : {}) } : undefined;
}
const rupees = (p: number | null | undefined) => (p === null || p === undefined ? "" : (p / 100).toFixed(2));
const day = (d: Date | null | undefined) => (d ? new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(d) : "");

export const REPORTS: Record<string, ReportDef> = {
  registrations: {
    label: "Membership registrations",
    description: "Applications received in the period, with current status (no contact or nominee details).",
    any: ["membership:export"],
    dated: true,
    async build(q) {
      await connectDb();
      const range = dateRange(q);
      const docs = await Member.find(range ? { submittedAt: range } : {}).sort({ submittedAt: 1 }).limit(MAX_ROWS).select("applicationRef membershipId fullName district submittedAt status source").lean();
      return {
        headers: ["Application ref", "Membership ID", "Name", "District", "Applied (IST)", "Status", "Source"],
        rows: docs.map((m) => [m.applicationRef, m.membershipId ?? "", m.fullName, m.district, day(m.submittedAt), MEMBER_STATUS_LABELS[m.status], m.source]),
      };
    },
  },
  members: {
    label: "Active memberships",
    description: "Members matching the Members page filters, with effective date and waiting-period status.",
    any: ["membership:export"],
    dated: false,
    async build(q, admin) {
      const data = await listMembers(q, { scope: "members", admin, pageSize: MAX_ROWS });
      return {
        headers: ["Membership ID", "Name", "Effective date", "Waiting period ends", "Waiting status", "Status", "Payment", "Age within limit"],
        rows: data.rows.map((r) => [r.membershipId ?? "", r.fullName, r.effectiveDate ?? "", r.waitingCompletes ?? "", r.trackerLabel, r.statusLabel, r.payment, r.ageEligible ? "Yes" : "No"]),
      };
    },
  },
  waiting: {
    label: "Waiting-period status",
    description: "Every activated member with the computed waiting-period status as of today.",
    any: ["membership:export"],
    dated: false,
    async build(q, admin) {
      const data = await listMembers(q, { scope: "tracker", admin, pageSize: MAX_ROWS });
      return {
        headers: ["Membership ID", "Name", "Effective date", "Completion date", "Days remaining", "Waiting status", "Membership status"],
        rows: data.rows.map((r) => [r.membershipId ?? "", r.fullName, r.effectiveDate ?? "", r.waitingCompletes ?? "", r.daysRemaining ?? "", r.trackerLabel, r.statusLabel]),
      };
    },
  },
  "membership-payments": {
    label: "Membership payment reconciliation",
    description: "Membership payments by payment date with verification status.",
    any: ["membership:payments", "finance:reports"],
    dated: true,
    async build(q) {
      await connectDb();
      const range = isoRange(q);
      const docs = await MembershipPayment.find(range ? { paidOn: range } : {}).sort({ paidOn: 1 }).limit(MAX_ROWS).lean();
      const members = new Map((await Member.find({ _id: { $in: docs.map((d) => d.memberId) } }).select("applicationRef membershipId fullName").lean()).map((m) => [m._id.toString(), m]));
      return {
        headers: ["Paid on", "Member", "Membership / application", "Amount (INR)", "Method", "Transaction ref", "Status"],
        rows: docs.map((p) => {
          const m = members.get(p.memberId.toString());
          return [p.paidOn, m?.fullName ?? "", m?.membershipId ?? m?.applicationRef ?? "", rupees(p.amountPaise), PAYMENT_METHOD_LABELS[p.method], p.transactionRef ?? "", p.status];
        }),
      };
    },
  },
  donations: {
    label: "Donations",
    description: "Donation records matching the Donations page filters.",
    any: ["finance:reports"],
    dated: true,
    async build(q) {
      const data = await listDonations({ ...q, page: "1" }, {});
      const all = data.total > data.rows.length ? await listAllDonations(q) : data.rows;
      return {
        headers: ["Reference", "Date", "Donor", "Amount (INR)", "Method", "Transaction ref", "Verification", "Receipt"],
        rows: all.map((d) => [d.reference, d.donatedOn, d.donorName ?? "", rupees(d.amountPaise), d.methodLabel, d.transactionRef ?? "", d.statusLabel, d.receipt === "issued" ? "Issued" : d.receipt === "none" ? "Not issued" : ""]),
      };
    },
  },
  "donations-monthly": {
    label: "Verified donations by month",
    description: "Only donations with status Verified, grouped by donation month.",
    any: ["finance:reports"],
    dated: true,
    async build(q) {
      await connectDb();
      const range = isoRange(q);
      const rows = await Donation.aggregate<{ _id: string; n: number; sum: number }>([
        { $match: { status: "verified", ...(range ? { donatedOn: range } : {}) } },
        { $group: { _id: { $substrBytes: ["$donatedOn", 0, 7] }, n: { $sum: 1 }, sum: { $sum: "$amountPaise" } } },
        { $sort: { _id: 1 } },
      ]);
      return { headers: ["Month", "Verified donations", "Verified total (INR)"], rows: rows.map((r) => [r._id, r.n, rupees(r.sum)]) };
    },
  },
  receipts: {
    label: "Donation receipt status",
    description: "Receipts issued in the period, including cancelled receipts.",
    any: ["finance:reports", "receipts:manage"],
    dated: true,
    async build(q) {
      await connectDb();
      const range = dateRange(q);
      const docs = await DonationReceipt.find(range ? { issuedAt: range } : {}).sort({ issuedAt: 1 }).limit(MAX_ROWS).lean();
      return {
        headers: ["Receipt no.", "Issued (IST)", "Donor", "Amount (INR)", "Donation ref", "Status", "Email"],
        rows: docs.map((r) => [r.receiptNumber, day(r.issuedAt), r.donorName, rupees(r.amountPaise), r.donationReference, r.status, r.emailStatus]),
      };
    },
  },
  claims: {
    label: "Death-benefit claims by status",
    description: "Claims submitted in the period with status and decision (no claimant details).",
    any: ["claims:read"],
    dated: true,
    async build(q) {
      await connectDb();
      const range = dateRange(q);
      const docs = await Claim.find(range ? { submittedAt: range } : {}).sort({ submittedAt: 1 }).limit(MAX_ROWS).select("reference membershipId memberName submittedAt status decision.outcome decision.approvedAmountPaise").lean();
      return {
        headers: ["Claim ref", "Membership ID", "Member", "Submitted (IST)", "Status", "Decision", "Approved amount (INR)"],
        rows: docs.map((c) => [c.reference, c.membershipId, c.memberName, day(c.submittedAt), CLAIM_STATUS_LABELS[c.status], c.decision?.outcome ?? "", rupees(c.decision?.approvedAmountPaise)]),
      };
    },
  },
  "claim-payments": {
    label: "Claim payments",
    description: "Claim payments recorded in the period.",
    any: ["finance:reports", "claims:payments"],
    dated: true,
    async build(q) {
      await connectDb();
      const range = isoRange(q);
      const docs = await Claim.find({ payment: { $ne: null }, ...(range ? { "payment.paidOn": range } : {}) }).sort({ "payment.paidOn": 1 }).limit(MAX_ROWS).select("reference membershipId payment").lean();
      return {
        headers: ["Claim ref", "Membership ID", "Paid on", "Amount (INR)", "Method", "Payment ref", "Recorded by"],
        rows: docs.map((c) => [c.reference, c.membershipId, c.payment!.paidOn, rupees(c.payment!.amountPaise), c.payment!.method, c.payment!.reference, c.payment!.recordedByName]),
      };
    },
  },
  enquiries: {
    label: "Website enquiries",
    description: "Enquiries matching the Enquiries page filters, with contact details for follow-up.",
    any: ["enquiries:export"],
    dated: true,
    async build(q) {
      await connectDb();
      const filter: Record<string, unknown> = {};
      const range = dateRange(q);
      if (range) filter.createdAt = range;
      if (q.status) filter.status = q.status;
      if (q.kind) filter.kind = q.kind;
      if (q.q) {
        const rx = new RegExp(escapeRegex(q.q), "i");
        filter.$or = [{ reference: rx }, { name: rx }, { email: rx }, { subject: rx }];
      }
      const docs = await Enquiry.find(filter).sort({ createdAt: 1 }).limit(MAX_ROWS).select("-notes").lean();
      return {
        headers: ["Reference", "Received (IST)", "Type", "Name", "Email", "Phone", "Subject", "Status"],
        rows: docs.map((e) => [e.reference, day(e.createdAt), e.kind, e.name, e.email ?? "", e.phone ?? "", e.subject, ENQUIRY_STATUS_LABELS[e.status]]),
      };
    },
  },
  "enquiry-volume": {
    label: "Website enquiry volumes",
    description: "Number of enquiries per month by type (no personal data).",
    any: ["enquiries:read"],
    dated: true,
    async build(q) {
      await connectDb();
      const range = dateRange(q);
      const rows = await Enquiry.aggregate<{ _id: { m: string; k: string }; n: number }>([
        ...(range ? [{ $match: { createdAt: range } }] : []),
        { $group: { _id: { m: { $dateToString: { format: "%Y-%m", date: "$createdAt", timezone: "Asia/Kolkata" } }, k: "$kind" }, n: { $sum: 1 } } },
        { $sort: { "_id.m": 1, "_id.k": 1 } },
      ]);
      return { headers: ["Month", "Type", "Enquiries"], rows: rows.map((r) => [r._id.m, r._id.k, r.n]) };
    },
  },
};

async function listAllDonations(q: ListQuery) {
  const out: Awaited<ReturnType<typeof listDonations>>["rows"] = [];
  for (let page = 1; out.length < MAX_ROWS; page++) {
    const batch = await listDonations({ ...q, page: String(page) });
    out.push(...batch.rows);
    if (batch.rows.length === 0 || out.length >= batch.total) break;
  }
  return out;
}

export function reportsFor(permissions: readonly string[]) {
  return Object.entries(REPORTS).filter(([, r]) => r.any.some((p) => permissions.includes(p)));
}

/** CSV with protection against spreadsheet formula injection. */
export function toCsv(t: ReportTable) {
  const cell = (v: string | number) => {
    let s = String(v ?? "");
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "﻿" + [t.headers, ...t.rows].map((r) => r.map(cell).join(",")).join("\r\n");
}

export { formatPaise, DONATION_STATUS_LABELS };
