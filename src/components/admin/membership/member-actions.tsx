"use client";

import { useState } from "react";
import { BadgeCheck, Ban, Flag, PauseCircle, PlayCircle, Plus, XCircle } from "lucide-react";
import {
  addMemberNote,
  changeMemberStatus,
  decideApplication,
  recordMembershipPayment,
  rejectMembershipPayment,
  setReviewFlag,
  updateNominee,
  verifyMembershipPayment,
} from "@/app/admin/actions/membership";
import { useAction } from "@/components/admin/use-action";
import { Button } from "@/components/admin/ui/button";
import { ConfirmDialog, Dialog, DialogContent, DialogHeader, DialogTrigger } from "@/components/admin/ui/dialog";
import { Checkbox, Field, fieldA11y, Input, NativeSelect, Textarea } from "@/components/admin/ui/form";

/* ---------- Status & decision actions ---------- */

export function MemberActions({
  memberId,
  status,
  requiresReview,
  canManage,
  canPay,
  today,
  minEffectiveDate,
}: {
  memberId: string;
  status: string;
  requiresReview: boolean;
  canManage: boolean;
  canPay: boolean;
  today: string;
  minEffectiveDate: string | null;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {canPay && !["rejected", "draft"].includes(status) && <RecordPaymentDialog memberId={memberId} today={today} />}
      {canManage && status === "pending_approval" && <ApproveDialog memberId={memberId} today={today} minDate={minEffectiveDate} />}
      {canManage && ["draft", "pending_payment", "payment_verification", "pending_approval"].includes(status) && (
        <ReasonDialog
          trigger={
            <Button variant="outline">
              <XCircle aria-hidden /> Reject application
            </Button>
          }
          title="Reject application"
          description="The applicant will not become a member. The reason is kept in the internal record."
          confirmLabel="Reject application"
          destructive
          minLength={10}
          onSubmit={(reason, run) => run(decideApplication, { memberId, decision: "reject", reason })}
        />
      )}
      {canManage && status === "active" && (
        <ReasonDialog
          trigger={
            <Button variant="outline">
              <PauseCircle aria-hidden /> Suspend
            </Button>
          }
          title="Suspend membership"
          description="A suspended membership is not active for eligibility purposes."
          confirmLabel="Suspend"
          destructive
          minLength={10}
          onSubmit={(reason, run) => run(changeMemberStatus, { memberId, action: "suspend", reason })}
        />
      )}
      {canManage && status === "suspended" && (
        <ReasonDialog
          trigger={
            <Button variant="outline">
              <PlayCircle aria-hidden /> Reinstate
            </Button>
          }
          title="Reinstate membership"
          description="Explain why the membership is being reinstated. Consider whether the waiting period needs review under the approved rules."
          confirmLabel="Reinstate"
          minLength={10}
          onSubmit={(reason, run) => run(changeMemberStatus, { memberId, action: "reinstate", reason })}
        />
      )}
      {canManage &&
        (requiresReview ? (
          <ReasonDialog
            trigger={
              <Button variant="ghost">
                <Flag aria-hidden /> Clear review flag
              </Button>
            }
            title="Clear review flag"
            description="Confirm the issue has been resolved."
            confirmLabel="Clear flag"
            minLength={0}
            onSubmit={(reason, run) => run(setReviewFlag, { memberId, flag: false, reason })}
          />
        ) : (
          <ReasonDialog
            trigger={
              <Button variant="ghost">
                <Flag aria-hidden /> Flag for review
              </Button>
            }
            title="Flag member for review"
            description="Flagged members show as “Requires Review” in the waiting-period tracker and cannot pass claim eligibility checks."
            confirmLabel="Flag for review"
            minLength={5}
            onSubmit={(reason, run) => run(setReviewFlag, { memberId, flag: true, reason })}
          />
        ))}
    </div>
  );
}

type Runner = ReturnType<typeof useAction>["run"];

export function ReasonDialog({
  trigger,
  title,
  description,
  confirmLabel,
  destructive,
  minLength,
  label = "Reason",
  onSubmit,
}: {
  trigger: React.ReactNode;
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  minLength: number;
  label?: string;
  onSubmit: (reason: string, run: Runner) => Promise<{ ok: boolean }>;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const { run, pending, fieldErrors } = useAction();
  const tooShort = reason.trim().length < minLength;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader title={title} description={description} />
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const r = await onSubmit(reason.trim(), run);
            if (r.ok) {
              setOpen(false);
              setReason("");
            }
          }}
        >
          <Field id="reason" label={label} hint={minLength ? `At least ${minLength} characters.` : undefined} error={fieldErrors.reason}>
            <Textarea {...fieldA11y("reason", fieldErrors.reason, Boolean(minLength))} value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant={destructive ? "destructive" : "default"} disabled={pending || tooShort}>
              {pending ? "Saving…" : confirmLabel}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ApproveDialog({ memberId, today, minDate }: { memberId: string; today: string; minDate: string | null }) {
  const [open, setOpen] = useState(false);
  const [effectiveDate, setEffectiveDate] = useState(today);
  const [note, setNote] = useState("");
  const { run, pending, fieldErrors } = useAction();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <BadgeCheck aria-hidden /> Approve & activate
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader
          title="Approve and activate membership"
          description="This assigns a permanent membership ID and starts the waiting period from the effective date. It cannot be undone (a membership can later be suspended)."
        />
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const r = await run(decideApplication, { memberId, decision: "approve", effectiveDate, reason: note });
            if (r.ok) setOpen(false);
          }}
        >
          <Field id="effectiveDate" label="Effective membership date" required hint={minDate ? `Between ${minDate} (verified payment) and today.` : undefined} error={fieldErrors.effectiveDate}>
            <Input
              {...fieldA11y("effectiveDate", fieldErrors.effectiveDate, true)}
              type="date"
              value={effectiveDate}
              min={minDate ?? undefined}
              max={today}
              onChange={(e) => setEffectiveDate(e.target.value)}
              required
            />
          </Field>
          <Field id="note" label="Internal note (optional)">
            <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || !effectiveDate}>
              {pending ? "Activating…" : "Activate membership"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RecordPaymentDialog({ memberId, today }: { memberId: string; today: string }) {
  const [open, setOpen] = useState(false);
  const { run, pending, fieldErrors } = useAction();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary">
          <Plus aria-hidden /> Record payment
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader title="Record membership payment" description="Recorded payments stay “verification pending” until someone confirms the credit in the bank or UPI statement." />
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const f = Object.fromEntries(new FormData(e.currentTarget));
            const r = await run(recordMembershipPayment, { ...f, memberId });
            if (r.ok) setOpen(false);
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="amount" label="Amount (₹)" required error={fieldErrors.amount}>
              <Input {...fieldA11y("amount", fieldErrors.amount)} name="amount" inputMode="decimal" placeholder="e.g. 500" required />
            </Field>
            <Field id="paidOn" label="Paid on" required error={fieldErrors.paidOn}>
              <Input {...fieldA11y("paidOn", fieldErrors.paidOn)} name="paidOn" type="date" max={today} defaultValue={today} required />
            </Field>
            <Field id="method" label="Method" required error={fieldErrors.method}>
              <NativeSelect {...fieldA11y("method", fieldErrors.method)} name="method" defaultValue="upi">
                <option value="upi">UPI</option>
                <option value="bank_transfer">Bank transfer</option>
                <option value="cheque">Cheque</option>
                <option value="cash">Cash</option>
              </NativeSelect>
            </Field>
            <Field id="transactionRef" label="Transaction / UTR / cheque no." error={fieldErrors.transactionRef} hint="Required except for cash.">
              <Input {...fieldA11y("transactionRef", fieldErrors.transactionRef, true)} name="transactionRef" autoComplete="off" />
            </Field>
          </div>
          <Field id="note" label="Note (optional)">
            <Textarea id="note" name="note" rows={2} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Record payment"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Payment verification ---------- */

export function PaymentVerifyActions({ paymentId, summary }: { paymentId: string; summary: string }) {
  const [confirmed, setConfirmed] = useState(false);
  const { run, pending } = useAction();
  return (
    <div className="flex flex-wrap gap-2">
      <ConfirmDialog
        trigger={
          <Button size="sm" disabled={pending}>
            Verify
          </Button>
        }
        title="Verify payment"
        description={`${summary}. Verify only after confirming the credit in the foundation's bank or UPI statement. Screenshots are not proof of payment.`}
        confirmLabel="Mark as verified"
        disabled={!confirmed}
        onConfirm={() => void run(verifyMembershipPayment, { paymentId, confirmed })}
      >
        <label className="flex items-start gap-2 text-sm">
          <Checkbox checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-0.5" />I have confirmed this credit in the
          foundation&apos;s bank/UPI statement.
        </label>
      </ConfirmDialog>
      <ReasonDialog
        trigger={
          <Button size="sm" variant="outline" disabled={pending}>
            <Ban aria-hidden /> Reject
          </Button>
        }
        title="Reject payment record"
        description="Use when the credit cannot be found or the details are wrong. The transaction reference is released so a corrected record can be entered."
        confirmLabel="Reject payment"
        destructive
        minLength={5}
        onSubmit={(reason, r) => r(rejectMembershipPayment, { paymentId, reason })}
      />
    </div>
  );
}

/* ---------- Notes & nominee ---------- */

export function NoteForm({ memberId }: { memberId: string }) {
  const [text, setText] = useState("");
  const { run, pending, fieldErrors } = useAction();
  return (
    <form
      className="space-y-2"
      onSubmit={async (e) => {
        e.preventDefault();
        const r = await run(addMemberNote, { memberId, text });
        if (r.ok) setText("");
      }}
    >
      <Field id="note-text" label="Add internal note" error={fieldErrors.text}>
        <Textarea {...fieldA11y("note-text", fieldErrors.text)} value={text} onChange={(e) => setText(e.target.value)} rows={2} />
      </Field>
      <Button type="submit" size="sm" disabled={pending || text.trim().length < 2}>
        {pending ? "Saving…" : "Add note"}
      </Button>
    </form>
  );
}

export function NomineeEditor({
  memberId,
  nominee,
}: {
  memberId: string;
  nominee: { name: string; relationship: string; relationshipOther?: string; mobile: string } | null;
}) {
  const [open, setOpen] = useState(false);
  const [relationship, setRelationship] = useState(nominee?.relationship ?? "spouse");
  const { run, pending, fieldErrors } = useAction();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          {nominee ? "Edit nominee" : "Add nominee"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader title="Nominee details" description="Changes are recorded in the audit log. Record the member's instruction as the reason." />
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const f = Object.fromEntries(new FormData(e.currentTarget));
            const r = await run(updateNominee, { ...f, memberId });
            if (r.ok) setOpen(false);
          }}
        >
          <Field id="n-name" label="Nominee name" required error={fieldErrors.name}>
            <Input {...fieldA11y("n-name", fieldErrors.name)} name="name" defaultValue={nominee?.name} required />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="n-rel" label="Relationship" required error={fieldErrors.relationship}>
              <NativeSelect {...fieldA11y("n-rel", fieldErrors.relationship)} name="relationship" value={relationship} onChange={(e) => setRelationship(e.target.value)}>
                {["spouse", "son", "daughter", "father", "mother", "brother", "sister", "other"].map((r) => (
                  <option key={r} value={r}>
                    {r[0].toUpperCase() + r.slice(1)}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field id="n-mobile" label="Mobile" required error={fieldErrors.mobile}>
              <Input {...fieldA11y("n-mobile", fieldErrors.mobile)} name="mobile" inputMode="tel" defaultValue={nominee?.mobile} required />
            </Field>
          </div>
          {relationship === "other" && (
            <Field id="n-other" label="Describe relationship" error={fieldErrors.relationshipOther}>
              <Input {...fieldA11y("n-other", fieldErrors.relationshipOther)} name="relationshipOther" defaultValue={nominee?.relationshipOther} />
            </Field>
          )}
          <Field id="n-reason" label="Reason for change" required error={fieldErrors.reason}>
            <Textarea {...fieldA11y("n-reason", fieldErrors.reason)} name="reason" rows={2} required />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save nominee"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
