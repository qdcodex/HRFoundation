"use client";

import Link from "next/link";
import { createColumnHelper } from "@tanstack/react-table";
import { DataTable, tableFeaturesConfig, type AdminColumn } from "@/components/admin/data-table";
import { StatusBadge } from "@/components/admin/ui/badge";
import type { ListQuery } from "@/lib/admin/list";
import { fmtDateTime } from "@/lib/format";

export type EnquiryRow = {
  id: string;
  reference: string;
  kind: string;
  name: string;
  email: string | null;
  phone: string | null;
  subject: string;
  createdAt: string;
  status: string;
  statusLabel: string;
  assignedToName: string | null;
};

const h = createColumnHelper<typeof tableFeaturesConfig, EnquiryRow>();
const columns = [
  h.accessor("reference", {
    header: "Enquiry",
    cell: (i) => (
      <Link href={`/admin/enquiries/${i.row.original.id}`} className="font-mono text-xs font-semibold text-emerald-ink hover:underline">
        {i.getValue()}
      </Link>
    ),
  }),
  h.accessor("name", { header: "Name", cell: (i) => <span className="font-semibold">{i.getValue()}</span> }),
  h.accessor("email", { header: "Email", cell: (i) => i.getValue() ?? "—" }),
  h.accessor("phone", { header: "Phone", cell: (i) => <span className="tabular-nums">{i.getValue() ?? "—"}</span> }),
  h.accessor("subject", { header: "Subject", cell: (i) => <span className="capitalize">{i.getValue()}</span> }),
  h.accessor("createdAt", { header: "Received", cell: (i) => fmtDateTime(i.getValue()) }),
  h.accessor("status", { header: "Status", cell: (i) => <StatusBadge status={i.getValue()} label={i.row.original.statusLabel} /> }),
  h.accessor("assignedToName", { header: "Assigned", cell: (i) => i.getValue() ?? <span className="text-muted">—</span> }),
] as AdminColumn<EnquiryRow>[];

export function EnquiriesTable(props: { rows: EnquiryRow[]; total: number; page: number; pageSize: number; query: ListQuery }) {
  return (
    <DataTable
      caption="Contact and volunteer enquiries"
      columns={columns}
      data={props.rows}
      total={props.total}
      page={props.page}
      pageSize={props.pageSize}
      query={props.query}
      getRowKey={(r) => r.id}
      sortable={{ createdAt: "createdAt", status: "status", name: "name" }}
    />
  );
}
