"use client";

import Link from "next/link";
import { createColumnHelper } from "@tanstack/react-table";
import { DataTable, tableFeaturesConfig, type AdminColumn } from "@/components/admin/data-table";
import { StatusBadge } from "@/components/admin/ui/badge";
import type { ListQuery } from "@/lib/admin/list";
import { fmtDateTime } from "@/lib/format";

export type NomineeRow = {
  id: string;
  name: string;
  relationship: string;
  mobile: string;
  memberId: string;
  memberName: string;
  memberRef: string;
  memberStatus: string;
  memberStatusLabel: string;
  updatedAt: string;
};

const h = createColumnHelper<typeof tableFeaturesConfig, NomineeRow>();
const columns = [
  h.accessor("name", { header: "Nominee", cell: (i) => <span className="font-semibold">{i.getValue()}</span> }),
  h.accessor("relationship", { header: "Relationship", cell: (i) => <span className="capitalize">{i.getValue()}</span> }),
  h.accessor("mobile", { header: "Mobile", cell: (i) => <span className="tabular-nums">{i.getValue()}</span> }),
  h.accessor("memberName", {
    header: "Member",
    cell: (i) => (
      <Link href={`/admin/membership/members/${i.row.original.memberId}`} className="text-forest hover:underline">
        {i.getValue()}
        <span className="block font-mono text-xs text-muted">{i.row.original.memberRef}</span>
      </Link>
    ),
  }),
  h.accessor("memberStatus", { header: "Membership", cell: (i) => <StatusBadge status={i.getValue()} label={i.row.original.memberStatusLabel} /> }),
  h.accessor("updatedAt", { header: "Last updated", cell: (i) => fmtDateTime(i.getValue()) }),
] as AdminColumn<NomineeRow>[];

export function NomineesTable(props: { rows: NomineeRow[]; total: number; page: number; pageSize: number; query: ListQuery }) {
  return (
    <DataTable
      caption="Nominees"
      columns={columns}
      data={props.rows}
      total={props.total}
      page={props.page}
      pageSize={props.pageSize}
      query={props.query}
      getRowKey={(r) => r.id}
      sortable={{ name: "name", updatedAt: "updatedAt" }}
    />
  );
}
