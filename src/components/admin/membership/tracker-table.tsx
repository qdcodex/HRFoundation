"use client";

import Link from "next/link";
import { createColumnHelper } from "@tanstack/react-table";
import { DataTable, tableFeaturesConfig, type AdminColumn } from "@/components/admin/data-table";
import { Badge, StatusBadge } from "@/components/admin/ui/badge";
import type { ListQuery } from "@/lib/admin/list";
import type { MemberRow } from "@/lib/admin/membership-queries";
import { fmtDate } from "@/lib/format";

const h = createColumnHelper<typeof tableFeaturesConfig, MemberRow>();

export function TrackerTable(props: { rows: MemberRow[]; total: number; page: number; pageSize: number; query: ListQuery; ageLimit: number }) {
  const columns = [
    h.accessor("membershipId", { header: "Membership ID", cell: (i) => <span className="font-mono text-xs">{i.getValue()}</span> }),
    h.accessor("fullName", {
      header: "Member",
      cell: (i) => (
        <Link href={`/admin/membership/members/${i.row.original.id}`} className="font-semibold text-forest hover:underline">
          {i.getValue()}
        </Link>
      ),
    }),
    h.accessor("effectiveDate", { header: "Effective / start", cell: (i) => fmtDate(i.getValue()) }),
    h.accessor("waitingCompletes", { header: "Expected completion", cell: (i) => fmtDate(i.getValue()) }),
    h.accessor("daysRemaining", { header: "Days left", cell: (i) => <span className="tabular-nums">{i.getValue() ?? "—"}</span> }),
    h.accessor("tracker", { header: "Waiting status", cell: (i) => <StatusBadge status={i.getValue()} label={i.row.original.trackerLabel} /> }),
    h.accessor("status", { header: "Membership", cell: (i) => <StatusBadge status={i.getValue()} label={i.row.original.statusLabel} /> }),
    h.accessor("age", {
      header: "Age",
      cell: (i) => (
        <span className="flex items-center gap-2 tabular-nums">
          {i.getValue() ?? "—"}
          <Badge tone={i.row.original.ageEligible ? "success" : "danger"}>{i.row.original.ageEligible ? `Under ${props.ageLimit}` : `${props.ageLimit}+`}</Badge>
        </span>
      ),
    }),
  ] as AdminColumn<MemberRow>[];
  return (
    <DataTable
      caption="Waiting-period tracker"
      columns={columns}
      data={props.rows}
      total={props.total}
      page={props.page}
      pageSize={props.pageSize}
      query={props.query}
      getRowKey={(r) => r.id}
      sortable={{ membershipId: "membershipId", fullName: "fullName", effectiveDate: "effectiveDate", waitingCompletes: "effectiveDate" }}
    />
  );
}
