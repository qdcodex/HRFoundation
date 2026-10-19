"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { changeDonationStatus, issueReceipt, cancelReceipt, recordDonation, resendReceiptEmail, updateDonorDetails, verifyDonation } from "@/app/admin/actions/finance";
import { ReasonDialog } from "@/components/admin/membership/member-actions";
import { useAction } from "@/components/admin/use-action";
import { Button } from "@/components/admin/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/admin/ui/card";
import { ConfirmDialog, Dialog, DialogContent, DialogHeader, DialogTrigger } from "@/components/admin/ui/dialog";
import { Checkbox, Field, fieldA11y, Input, NativeSelect, Textarea } from "@/components/admin/ui/form";

export function RecordDonationForm({ today }: { today: string }) {
  const router = useRouter();
  const { run, pending, fieldErrors: fe } = useAction<{ id: string }>();
  const f = (name: string) => ({ ...fieldA11y(name, fe[name]), name });
  return (
    <form
      noValidate
      className="space-y-6"
      onSubmit={async (e) => {
        e.preventDefault();
        await run(recordDonation, Object.fromEntries(new FormData(e.currentTarget)), { onSuccess: (r) => r.data && router.push(`/admin/donations/${r.data.id}`) });
      }}
    >
      <Card>
        <CardHeader>
          <CardTitle>Payment</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field id="amount" label="Amount (₹)" required error={fe.amount}>
            <Input {...f("amount")} inputMode="decimal" required />
          </Field>
          <Field id="donatedOn" label="Date received" required error={fe.donatedOn}>
            <Input {...f("donatedOn")} type="date" max={today} defaultValue={today} required />
          </Field>
          <Field id="method" label="Method" required error={fe.method}>
            <NativeSelect {...f("method")} defaultValue="upi">
              <option value="upi">UPI</option>
              <option value="bank_transfer">Bank transfer</option>
              <option value="cheque">Cheque</option>
              <option value="cash">Cash</option>
            </NativeSelect>
          </Field>
          <Field id="transactionRef" label="UTR / transaction / cheque no." hint="Required except for cash. Must be unique." error={fe.transactionRef}>
            <Input {...fieldA11y("transactionRef", fe.transactionRef, true)} name="transactionRef" autoComplete="off" />
          </Field>
          <Field id="purpose" label="Purpose (optional)" error={fe.purpose} className="md:col-span-2">
            <Input {...f("purpose")} placeholder="e.g. General support" />
          </Field>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Donor (optional — required later for a receipt)</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field id="donorName" label="Name" error={fe.donorName}>
            <Input {...f("donorName")} />
          </Field>
          <Field id="donorPhone" label="Mobile" error={fe.donorPhone}>
            <Input {...f("donorPhone")} inputMode="tel" />
          </Field>
          <Field id="donorEmail" label="Email" error={fe.donorEmail}>
            <Input {...f("donorEmail")} type="email" />
          </Field>
          <Field id="donorAddress" label="Address (for receipt)" error={fe.donorAddress}>
            <Input {...f("donorAddress")} />
          </Field>
        </CardContent>
      </Card>
      <p className="text-sm text-muted">The donation is saved as “Verification Pending”. Payment screenshots are not proof — verify against the bank/UPI statement.</p>
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Saving…" : "Record donation"}
      </Button>
    </form>
  );
}

export function DonationActions({
  donationId,
  status,
  canManage,
  canReceipt,
  hasIssuedReceipt,
  hasDonorName,
  donor,
}: {
  donationId: string;
  status: string;
  canManage: boolean;
  canReceipt: boolean;
  hasIssuedReceipt: boolean;
  hasDonorName: boolean;
  donor: { donorName: string; donorEmail: string; donorPhone: string; donorAddress: string; purpose: string };
}) {
  const [confirmed, setConfirmed] = useState(false);
  const [note, setNote] = useState("");
  const [sendEmail, setSendEmail] = useState(Boolean(donor.donorEmail));
  const { run, pending } = useAction();
  return (
    <div className="flex flex-wrap gap-2">
      {canManage && ["pending", "verification_pending"].includes(status) && (
        <>
          <ConfirmDialog
            trigger={<Button disabled={pending}>Verify</Button>}
            title="Verify donation"
            description="Only verified donations are counted in totals and can receive a receipt."
            confirmLabel="Mark as verified"
            disabled={!confirmed}
            onConfirm={() => void run(verifyDonation, { donationId, confirmed, note })}
          >
            <label className="flex items-start gap-2 text-sm">
              <Checkbox checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-0.5" />I found this credit in the foundation&apos;s bank or UPI statement.
            </label>
            <Field id="verify-note" label="Reconciliation note (optional)">
              <Input id="verify-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Matched statement dated 19 Oct" />
            </Field>
          </ConfirmDialog>
          <ReasonDialog
            trigger={<Button variant="outline">Mark failed</Button>}
            title="Mark donation as failed"
            description="Use when the credit was not received."
            confirmLabel="Mark failed"
            destructive
            minLength={5}
            onSubmit={(reason, r) => r(changeDonationStatus, { donationId, to: "failed", reason })}
          />
          <ReasonDialog
            trigger={<Button variant="ghost">Cancel record</Button>}
            title="Cancel donation record"
            description="Use for records entered in error."
            confirmLabel="Cancel record"
            destructive
            minLength={5}
            onSubmit={(reason, r) => r(changeDonationStatus, { donationId, to: "cancelled", reason })}
          />
        </>
      )}
      {canManage && status === "verified" && !hasIssuedReceipt && (
        <ReasonDialog
          trigger={<Button variant="ghost">Record refund</Button>}
          title="Record refund"
          description="Record a refund already made through the bank."
          confirmLabel="Record refund"
          destructive
          minLength={5}
          onSubmit={(reason, r) => r(changeDonationStatus, { donationId, to: "refunded", reason })}
        />
      )}
      {canReceipt && status === "verified" && !hasIssuedReceipt && (
        <ConfirmDialog
          trigger={<Button disabled={!hasDonorName}>{hasDonorName ? "Issue receipt" : "Issue receipt (add donor name first)"}</Button>}
          title="Issue donation receipt"
          description="A unique receipt number is assigned. Receipt details are fixed at issue; corrections need cancellation and re-issue."
          confirmLabel="Issue receipt"
          onConfirm={() => void run(issueReceipt, { donationId, sendEmail })}
        >
          {donor.donorEmail && (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} /> Email the receipt notification to {donor.donorEmail}
            </label>
          )}
        </ConfirmDialog>
      )}
      {canManage && <DonorEditor donationId={donationId} donor={donor} />}
    </div>
  );
}

function DonorEditor({ donationId, donor }: { donationId: string; donor: Record<string, string> }) {
  const [open, setOpen] = useState(false);
  const { run, pending, fieldErrors: fe } = useAction();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Edit donor details</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader title="Donor details" description="Changes are recorded in the audit log." />
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            const r = await run(updateDonorDetails, { ...Object.fromEntries(new FormData(e.currentTarget)), donationId });
            if (r.ok) setOpen(false);
          }}
        >
          {(
            [
              ["donorName", "Name"],
              ["donorPhone", "Mobile"],
              ["donorEmail", "Email"],
              ["donorAddress", "Address"],
              ["purpose", "Purpose"],
            ] as const
          ).map(([k, l]) => (
            <Field key={k} id={`d-${k}`} label={l} error={fe[k]}>
              <Input {...fieldA11y(`d-${k}`, fe[k])} name={k} defaultValue={donor[k]} />
            </Field>
          ))}
          <Field id="d-reason" label="Reason for change" required error={fe.reason}>
            <Textarea {...fieldA11y("d-reason", fe.reason)} name="reason" rows={2} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              Save
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ReceiptActions({ receiptId, status, hasEmail }: { receiptId: string; status: string; hasEmail: boolean }) {
  const { run, pending } = useAction();
  if (status !== "issued") return null;
  return (
    <div className="flex flex-wrap gap-2">
      {hasEmail && (
        <Button size="sm" variant="outline" disabled={pending} onClick={() => run(resendReceiptEmail, { receiptId })}>
          Email
        </Button>
      )}
      <ReasonDialog
        trigger={
          <Button size="sm" variant="outline">
            Correct (re-issue)
          </Button>
        }
        title="Cancel and re-issue receipt"
        description="The current receipt is cancelled and a new receipt number is issued with the donation's current details."
        confirmLabel="Cancel & re-issue"
        minLength={5}
        onSubmit={(reason, r) => r(cancelReceipt, { receiptId, reason, reissue: true })}
      />
      <ReasonDialog
        trigger={
          <Button size="sm" variant="ghost">
            Cancel
          </Button>
        }
        title="Cancel receipt"
        description="The receipt stays on record, marked cancelled."
        confirmLabel="Cancel receipt"
        destructive
        minLength={5}
        onSubmit={(reason, r) => r(cancelReceipt, { receiptId, reason, reissue: false })}
      />
    </div>
  );
}
