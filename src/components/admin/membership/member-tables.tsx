"use client";

import Link from "next/link";
import { createColumnHelper } from "@tanstack/react-table";
import { DataTable, tableFeaturesConfig, type AdminColumn } from "@/components/admin/data-table";
import { Badge, StatusBadge } from "@/components/admin/ui/badge";
import type { ListQuery } from "@/lib/admin/list";
import type { MemberRow } from "@/lib/admin/membership-queries";
import { PAYMENT_SUMMARY_LABELS } from "@/lib/admin/membership-labels";
import { fmtDate } from "@/lib/format";

const h = createColumnHelper<typeof tableFeaturesConfig, MemberRow>();

const nameCol = h.accessor("fullName", {
  header: "Member",
  cell: (info) => (
    <Link href={`/admin/membership/members/${info.row.original.id}`} className="font-semibold text-forest hover:underline">
      {info.getValue()}
      {info.row.original.requiresReview && (
        <Badge tone="warning" className="ml-2">
          Review
        </Badge>
      )}
    </Link>
  ),
});
const phoneCol = h.accessor("mobile", { header: "Phone", cell: (i) => <span className="tabular-nums">{i.getValue()}</span> });
const appliedCol = h.accessor("submittedAt", { header: "Applied", cell: (i) => fmtDate(i.getValue()) });
const paymentCol = h.accessor("payment", { header: "Payment", cell: (i) => <StatusBadge status={i.getValue() === "none" ? "pending" : i.getValue()} label={PAYMENT_SUMMARY_LABELS[i.getValue()]} /> });
const statusCol = h.accessor("status", { header: "Status", cell: (i) => <StatusBadge status={i.getValue()} label={i.row.original.statusLabel} /> });
const actionsCol = h.display({
  id: "actions",
  header: () => <span className="sr-only">Actions</span>,
  cell: (i) => (
    <Link href={`/admin/membership/members/${i.row.original.id}`} className="text-sm font-semibold text-emerald-ink hover:underline">
      {i.row.original.status === "pending_approval" ? "Review" : "View"}
      <span className="sr-only"> {i.row.original.fullName}</span>
    </Link>
  ),
});

const applicationColumns = [
  h.accessor("applicationRef", { header: "Application", cell: (i) => <span className="font-mono text-xs">{i.getValue()}</span> }),
  nameCol,
  phoneCol,
  appliedCol,
  paymentCol,
  statusCol,
  actionsCol,
] as AdminColumn<MemberRow>[];

export function ApplicationsTable(props: { rows: MemberRow[]; total: number; page: number; pageSize: number; query: ListQuery }) {
  return (
    <DataTable
      caption="Membership applications"
      columns={applicationColumns}
      data={props.rows}
      total={props.total}
      page={props.page}
      pageSize={props.pageSize}
      query={props.query}
      getRowKey={(r) => r.id}
      sortable={{ applicationRef: "submittedAt", fullName: "fullName", submittedAt: "submittedAt", status: "status" }}
    />
  );
}

export function MembersTable(props: { rows: MemberRow[]; total: number; page: number; pageSize: number; query: ListQuery; showNominee: boolean }) {
  const columns = [
    h.accessor("membershipId", { header: "Membership ID", cell: (i) => <span className="font-mono text-xs">{i.getValue() ?? "—"}</span> }),
    nameCol,
    phoneCol,
    appliedCol,
    h.accessor("effectiveDate", { header: "Effective", cell: (i) => fmtDate(i.getValue()) }),
    paymentCol,
    statusCol,
    h.accessor("waitingCompletes", {
      header: "Waiting ends",
      cell: (i) => (
        <div className="space-y-1">
          <div>{fmtDate(i.getValue())}</div>
          <StatusBadge status={i.row.original.tracker} label={i.row.original.trackerLabel} />
        </div>
      ),
    }),
    ...(props.showNominee ? [h.accessor("nomineeName", { header: "Nominee", cell: (i) => i.getValue() ?? "—" })] : []),
    actionsCol,
  ] as AdminColumn<MemberRow>[];
  return (
    <DataTable
      caption="Members"
      columns={columns}
      data={props.rows}
      total={props.total}
      page={props.page}
      pageSize={props.pageSize}
      query={props.query}
      getRowKey={(r) => r.id}
      sortable={{ membershipId: "membershipId", fullName: "fullName", submittedAt: "submittedAt", effectiveDate: "effectiveDate", status: "status", waitingCompletes: "effectiveDate" }}
    />
  );
}
