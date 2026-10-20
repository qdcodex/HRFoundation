"use client";

import Link from "next/link";
import { createColumnHelper } from "@tanstack/react-table";
import { DataTable, tableFeaturesConfig, type AdminColumn } from "@/components/admin/data-table";
import { StatusBadge } from "@/components/admin/ui/badge";
import type { ListQuery } from "@/lib/admin/list";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { formatPaise } from "@/lib/money";

export type ClaimRow = {
  id: string;
  reference: string;
  membershipId: string;
  memberName: string;
  claimantName: string | null;
  submittedAt: string;
  requestedAmountPaise: number | null;
  status: string;
  statusLabel: string;
  assignedToName: string | null;
  updatedAt: string;
  dateOfDeath: string;
  sla: string | null;
  overdue: boolean;
};

const h = createColumnHelper<typeof tableFeaturesConfig, ClaimRow>();

export function ClaimsTable(props: { rows: ClaimRow[]; total: number; page: number; pageSize: number; query: ListQuery; showClaimant: boolean }) {
  const columns = [
    h.accessor("reference", {
      header: "Claim",
      cell: (i) => (
        <Link href={`/admin/claims/${i.row.original.id}`} className="font-mono text-xs font-semibold text-emerald-ink hover:underline">
          {i.getValue()}
        </Link>
      ),
    }),
    h.accessor("membershipId", { header: "Membership ID", cell: (i) => <span className="font-mono text-xs">{i.getValue()}</span> }),
    h.accessor("memberName", { header: "Member" }),
    ...(props.showClaimant ? [h.accessor("claimantName", { header: "Claimant", cell: (i) => i.getValue() ?? "—" })] : []),
    h.accessor("submittedAt", { header: "Submitted", cell: (i) => fmtDate(i.getValue()) }),
    h.accessor("requestedAmountPaise", { header: "Requested", cell: (i) => (i.getValue() ? formatPaise(i.getValue()) : "—") }),
    h.accessor("status", { header: "Status", cell: (i) => <StatusBadge status={i.getValue()} label={i.row.original.statusLabel} /> }),
    h.accessor("sla", {
      header: "Target",
      cell: (i) => (i.getValue() ? <span className={i.row.original.overdue ? "font-semibold text-danger" : "text-muted"}>{i.getValue()}</span> : "—"),
    }),
    h.accessor("assignedToName", { header: "Reviewer", cell: (i) => i.getValue() ?? <span className="text-muted">Unassigned</span> }),
    h.accessor("updatedAt", { header: "Updated", cell: (i) => fmtDateTime(i.getValue()) }),
  ] as AdminColumn<ClaimRow>[];
  return (
    <DataTable
      caption="Death-benefit claims"
      columns={columns}
      data={props.rows}
      total={props.total}
      page={props.page}
      pageSize={props.pageSize}
      query={props.query}
      getRowKey={(r) => r.id}
      sortable={{ reference: "submittedAt", submittedAt: "submittedAt", status: "status", updatedAt: "updatedAt" }}
    />
  );
}
