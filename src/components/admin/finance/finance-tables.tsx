"use client";

import Link from "next/link";
import { createColumnHelper } from "@tanstack/react-table";
import { DataTable, tableFeaturesConfig, type AdminColumn } from "@/components/admin/data-table";
import { Badge, StatusBadge } from "@/components/admin/ui/badge";
import type { ListQuery } from "@/lib/admin/list";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { formatPaise } from "@/lib/money";
import { ReceiptActions } from "./donation-actions";

export type DonationRow = {
  id: string;
  reference: string;
  donorName: string | null;
  donatedOn: string;
  amountPaise: number;
  methodLabel: string;
  transactionRef: string | null;
  status: string;
  statusLabel: string;
  receipt: "issued" | "none" | "not_applicable";
  possibleDuplicate?: boolean;
};

const d = createColumnHelper<typeof tableFeaturesConfig, DonationRow>();
const donationColumns = [
  d.accessor("reference", {
    header: "Reference",
    cell: (i) => (
      <Link href={`/admin/donations/${i.row.original.id}`} className="font-mono text-xs font-semibold text-emerald-ink hover:underline">
        {i.getValue()}
      </Link>
    ),
  }),
  d.accessor("donorName", { header: "Donor", cell: (i) => i.getValue() ?? <span className="text-muted">Not provided</span> }),
  d.accessor("donatedOn", { header: "Date", cell: (i) => fmtDate(i.getValue()) }),
  d.accessor("amountPaise", { header: "Amount", cell: (i) => <span className="font-semibold tabular-nums">{formatPaise(i.getValue())}</span> }),
  d.accessor("methodLabel", { header: "Method" }),
  d.accessor("transactionRef", { header: "Transaction ref", cell: (i) => <span className="font-mono text-xs">{i.getValue() ?? "—"}</span> }),
  d.accessor("status", {
    header: "Verification",
    cell: (i) => (
      <span className="flex flex-wrap gap-1">
        <StatusBadge status={i.getValue()} label={i.row.original.statusLabel} />
        {i.row.original.possibleDuplicate && <Badge tone="warning">Possible duplicate</Badge>}
      </span>
    ),
  }),
  d.accessor("receipt", {
    header: "Receipt",
    cell: (i) =>
      i.getValue() === "issued" ? <Badge tone="success">Issued</Badge> : i.getValue() === "none" ? <Badge tone="warning">Not issued</Badge> : <span className="text-muted">—</span>,
  }),
] as AdminColumn<DonationRow>[];

export function DonationsTable(props: { rows: DonationRow[]; total: number; page: number; pageSize: number; query: ListQuery; caption?: string }) {
  return (
    <DataTable
      caption={props.caption ?? "Donations"}
      columns={donationColumns}
      data={props.rows}
      total={props.total}
      page={props.page}
      pageSize={props.pageSize}
      query={props.query}
      getRowKey={(r) => r.id}
      sortable={{ donatedOn: "donatedOn", amountPaise: "amountPaise", status: "status", reference: "createdAt" }}
    />
  );
}

export type ReceiptRow = {
  id: string;
  receiptNumber: string;
  donationId: string;
  donorName: string;
  amountPaise: number;
  issuedAt: string;
  status: string;
  emailStatus: string;
  hasEmail: boolean;
  issuedByName: string;
  replaces: string | null;
};

const r = createColumnHelper<typeof tableFeaturesConfig, ReceiptRow>();

export function ReceiptsTable(props: { rows: ReceiptRow[]; total: number; page: number; pageSize: number; query: ListQuery; canManage: boolean }) {
  const columns = [
    r.accessor("receiptNumber", {
      header: "Receipt no.",
      cell: (i) => (
        <a href={`/admin/api/receipts/${i.row.original.id}`} target="_blank" rel="noopener" className="font-mono text-xs font-semibold text-emerald-ink hover:underline">
          {i.getValue()}
          <span className="sr-only"> (PDF, opens in new tab)</span>
        </a>
      ),
    }),
    r.accessor("donorName", {
      header: "Donor",
      cell: (i) => (
        <Link href={`/admin/donations/${i.row.original.donationId}`} className="hover:underline">
          {i.getValue()}
        </Link>
      ),
    }),
    r.accessor("amountPaise", { header: "Amount", cell: (i) => <span className="tabular-nums">{formatPaise(i.getValue())}</span> }),
    r.accessor("issuedAt", { header: "Issued", cell: (i) => `${fmtDateTime(i.getValue())} · ${i.row.original.issuedByName}` }),
    r.accessor("status", {
      header: "Status",
      cell: (i) => (
        <span className="flex flex-col gap-1">
          <StatusBadge status={i.getValue()} label={i.getValue() === "issued" ? "Issued" : "Cancelled"} />
          {i.row.original.replaces && <span className="text-xs text-muted">Replaces {i.row.original.replaces}</span>}
        </span>
      ),
    }),
    r.accessor("emailStatus", { header: "Email", cell: (i) => <span className="text-xs capitalize">{i.getValue().replace(/_/g, " ")}</span> }),
    r.display({
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      cell: (i) => (props.canManage ? <ReceiptActions receiptId={i.row.original.id} status={i.row.original.status} hasEmail={i.row.original.hasEmail} /> : null),
    }),
  ] as AdminColumn<ReceiptRow>[];
  return (
    <DataTable
      caption="Donation receipts"
      columns={columns}
      data={props.rows}
      total={props.total}
      page={props.page}
      pageSize={props.pageSize}
      query={props.query}
      getRowKey={(row) => row.id}
      sortable={{ receiptNumber: "issuedAt", issuedAt: "issuedAt", amountPaise: "amountPaise" }}
    />
  );
}
