"use client";

import Link from "next/link";
import { createColumnHelper } from "@tanstack/react-table";
import { DataTable, tableFeaturesConfig, type AdminColumn } from "@/components/admin/data-table";
import { StatusBadge } from "@/components/admin/ui/badge";
import type { ListQuery } from "@/lib/admin/list";
import { fmtDate } from "@/lib/format";
import { formatPaise } from "@/lib/money";
import { PaymentVerifyActions } from "./member-actions";

export type PaymentRow = {
  id: string;
  memberId: string;
  memberName: string;
  memberRef: string;
  amountPaise: number;
  method: string;
  methodLabel: string;
  transactionRef: string | null;
  paidOn: string;
  status: string;
  statusLabel: string;
  recordedBy: string;
};

const h = createColumnHelper<typeof tableFeaturesConfig, PaymentRow>();

export function PaymentsTable(props: { rows: PaymentRow[]; total: number; page: number; pageSize: number; query: ListQuery; canVerify: boolean }) {
  const columns = [
    h.accessor("paidOn", { header: "Paid on", cell: (i) => fmtDate(i.getValue()) }),
    h.accessor("memberName", {
      header: "Member",
      cell: (i) => (
        <Link href={`/admin/membership/members/${i.row.original.memberId}`} className="font-semibold text-forest hover:underline">
          {i.getValue()}
          <span className="block font-mono text-xs font-normal text-muted">{i.row.original.memberRef}</span>
        </Link>
      ),
    }),
    h.accessor("amountPaise", { header: "Amount", cell: (i) => <span className="font-semibold tabular-nums">{formatPaise(i.getValue())}</span> }),
    h.accessor("methodLabel", {
      header: "Method / reference",
      cell: (i) => (
        <>
          {i.getValue()}
          {i.row.original.transactionRef && <span className="block font-mono text-xs text-muted">{i.row.original.transactionRef}</span>}
        </>
      ),
    }),
    h.accessor("status", { header: "Status", cell: (i) => <StatusBadge status={i.getValue()} label={i.row.original.statusLabel} /> }),
    h.accessor("recordedBy", { header: "Recorded by" }),
    h.display({
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      cell: (i) =>
        props.canVerify && i.row.original.status === "verification_pending" ? (
          <PaymentVerifyActions
            paymentId={i.row.original.id}
            summary={`${formatPaise(i.row.original.amountPaise)} from ${i.row.original.memberName} via ${i.row.original.methodLabel}${i.row.original.transactionRef ? ` (${i.row.original.transactionRef})` : ""}`}
          />
        ) : null,
    }),
  ] as AdminColumn<PaymentRow>[];
  return (
    <DataTable
      caption="Membership payments"
      columns={columns}
      data={props.rows}
      total={props.total}
      page={props.page}
      pageSize={props.pageSize}
      query={props.query}
      getRowKey={(r) => r.id}
      sortable={{ paidOn: "paidOn", amountPaise: "amountPaise", status: "status" }}
    />
  );
}
