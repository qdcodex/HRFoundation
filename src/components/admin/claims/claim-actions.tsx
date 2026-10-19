"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import {
  addVerificationNote,
  assignClaim,
  closeClaim,
  decideClaim,
  markPaymentPending,
  recordClaimPayment,
  recordRecommendation,
  requestInformation,
  resolveInformation,
  startReview,
  uploadClaimDocument,
} from "@/app/admin/actions/claims";
import { ReasonDialog } from "@/components/admin/membership/member-actions";
import { useAction } from "@/components/admin/use-action";
import { Button } from "@/components/admin/ui/button";
import { ConfirmDialog, Dialog, DialogContent, DialogHeader, DialogTrigger } from "@/components/admin/ui/dialog";
import { Field, fieldA11y, Input, NativeSelect, Textarea } from "@/components/admin/ui/form";
import type { ActionResult } from "@/lib/actions";

type Perms = { review: boolean; decide: boolean; payments: boolean; documents: boolean };

export function ClaimWorkflow({
  claimId,
  status,
  perms,
  allPassed,
  maxAllowed,
  approvedAmount,
  reviewers,
  assignedTo,
  today,
}: {
  claimId: string;
  status: string;
  perms: Perms;
  allPassed: boolean;
  maxAllowed: string;
  approvedAmount: string | null;
  reviewers: { id: string; name: string }[];
  assignedTo: string | null;
  today: string;
}) {
  const { run, pending } = useAction();
  return (
    <div className="flex flex-wrap gap-2">
      {perms.review && status === "submitted" && (
        <Button disabled={pending} onClick={() => run(startReview, { claimId })}>
          Start review
        </Button>
      )}
      {perms.review && ["submitted", "under_review", "info_required", "approved", "payment_pending", "rejected"].includes(status) && reviewers.length > 0 && (
        <AssignDialog claimId={claimId} reviewers={reviewers} assignedTo={assignedTo} />
      )}
      {perms.review && ["submitted", "under_review"].includes(status) && (
        <ReasonDialog
          trigger={<Button variant="outline">Request information</Button>}
          title="Request additional information"
          description="Describe exactly which documents or details are needed. The claim moves to “Additional Information Required”."
          label="What is needed"
          confirmLabel="Send request"
          minLength={10}
          onSubmit={(message, r) => r(requestInformation, { claimId, message })}
        />
      )}
      {perms.review && status === "info_required" && (
        <ReasonDialog
          trigger={<Button variant="outline">Information received</Button>}
          title="Record information received"
          description="Note what was received. Upload any documents separately. The claim returns to Under Review."
          label="What was received"
          confirmLabel="Return to review"
          minLength={5}
          onSubmit={(note, r) => r(resolveInformation, { claimId, note })}
        />
      )}
      {perms.review && status === "under_review" && <RecommendDialog claimId={claimId} />}
      {perms.decide && status === "under_review" && <DecisionDialog claimId={claimId} allPassed={allPassed} maxAllowed={maxAllowed} />}
      {perms.payments && status === "approved" && (
        <ConfirmDialog
          trigger={<Button variant="outline">Mark payment pending</Button>}
          title="Mark payment as pending"
          description="Use when the payment has been initiated with the bank but not yet completed."
          confirmLabel="Mark pending"
          onConfirm={() => void run(markPaymentPending, { claimId })}
        />
      )}
      {perms.payments && ["approved", "payment_pending"].includes(status) && approvedAmount && <PaymentDialog claimId={claimId} approvedAmount={approvedAmount} today={today} />}
      {perms.review && ["rejected", "paid"].includes(status) && (
        <ReasonDialog
          trigger={<Button variant="ghost">Close claim</Button>}
          title="Close claim"
          description="Closing records that no further action is expected."
          label="Closing note"
          confirmLabel="Close claim"
          minLength={5}
          onSubmit={(reason, r) => r(closeClaim, { claimId, reason })}
        />
      )}
    </div>
  );
}

function AssignDialog({ claimId, reviewers, assignedTo }: { claimId: string; reviewers: { id: string; name: string }[]; assignedTo: string | null }) {
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState(assignedTo ?? reviewers[0]?.id ?? "");
  const { run, pending } = useAction();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">{assignedTo ? "Reassign" : "Assign"}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader title="Assign reviewer" description="Only active users with claim-review permission are listed." />
        <Field id="reviewer" label="Reviewer">
          <NativeSelect id="reviewer" value={userId} onChange={(e) => setUserId(e.target.value)}>
            {reviewers.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            disabled={pending || !userId}
            onClick={async () => {
              const r = await run(assignClaim, { claimId, userId });
              if (r.ok) setOpen(false);
            }}
          >
            Assign
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RecommendDialog({ claimId }: { claimId: string }) {
  const [open, setOpen] = useState(false);
  const [outcome, setOutcome] = useState("approve");
  const [note, setNote] = useState("");
  const { run, pending, fieldErrors } = useAction();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary">Recommend</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader title="Record recommendation" description="A recommendation informs the decision; it is not the decision." />
        <Field id="outcome" label="Recommendation">
          <NativeSelect id="outcome" value={outcome} onChange={(e) => setOutcome(e.target.value)}>
            <option value="approve">Recommend approval</option>
            <option value="reject">Recommend rejection</option>
          </NativeSelect>
        </Field>
        <Field id="rec-note" label="Basis for recommendation" error={fieldErrors.note}>
          <Textarea {...fieldA11y("rec-note", fieldErrors.note)} value={note} onChange={(e) => setNote(e.target.value)} rows={4} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            disabled={pending || note.trim().length < 10}
            onClick={async () => {
              const r = await run(recordRecommendation, { claimId, outcome, note });
              if (r.ok) setOpen(false);
            }}
          >
            Save recommendation
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DecisionDialog({ claimId, allPassed, maxAllowed }: { claimId: string; allPassed: boolean; maxAllowed: string }) {
  const [open, setOpen] = useState(false);
  const [outcome, setOutcome] = useState<"approved" | "rejected">(allPassed ? "approved" : "rejected");
  const [reason, setReason] = useState("");
  const [amount, setAmount] = useState("");
  const { run, pending, fieldErrors } = useAction();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Record decision</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader
          title="Record authorised decision"
          description="Eligibility is re-checked on the server when you save. Approval is refused unless every condition passes."
        />
        <Field id="decision" label="Decision">
          <NativeSelect id="decision" value={outcome} onChange={(e) => setOutcome(e.target.value as "approved" | "rejected")}>
            <option value="approved" disabled={!allPassed}>
              Approve{allPassed ? "" : " (blocked: conditions not met)"}
            </option>
            <option value="rejected">Reject</option>
          </NativeSelect>
        </Field>
        {outcome === "approved" && (
          <Field id="approvedAmount" label="Approved amount (₹)" hint={`Must not exceed ${maxAllowed}.`} error={fieldErrors.approvedAmount} required>
            <Input {...fieldA11y("approvedAmount", fieldErrors.approvedAmount, true)} value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" />
          </Field>
        )}
        <Field id="decision-reason" label={outcome === "approved" ? "Basis for approval" : "Reason for rejection"} required error={fieldErrors.reason}>
          <Textarea {...fieldA11y("decision-reason", fieldErrors.reason)} value={reason} onChange={(e) => setReason(e.target.value)} rows={4} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant={outcome === "rejected" ? "destructive" : "default"}
            disabled={pending || reason.trim().length < 10 || (outcome === "approved" && !amount)}
            onClick={async () => {
              const r = await run(decideClaim, outcome === "approved" ? { claimId, outcome, reason, approvedAmount: amount } : { claimId, outcome, reason });
              if (r.ok) setOpen(false);
            }}
          >
            {outcome === "approved" ? "Record approval" : "Record rejection"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PaymentDialog({ claimId, approvedAmount, today }: { claimId: string; approvedAmount: string; today: string }) {
  const [open, setOpen] = useState(false);
  const { run, pending, fieldErrors: fe } = useAction();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Record payment</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader title="Record claim payment" description="Record a payment already made through the bank. The dashboard does not move money." />
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const r = await run(recordClaimPayment, { ...Object.fromEntries(new FormData(e.currentTarget)), claimId });
            if (r.ok) setOpen(false);
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="cp-amount" label="Amount paid (₹)" required error={fe.amount}>
              <Input {...fieldA11y("cp-amount", fe.amount)} name="amount" defaultValue={approvedAmount} inputMode="decimal" />
            </Field>
            <Field id="cp-paidOn" label="Paid on" required error={fe.paidOn}>
              <Input {...fieldA11y("cp-paidOn", fe.paidOn)} name="paidOn" type="date" max={today} defaultValue={today} />
            </Field>
            <Field id="cp-method" label="Method" required>
              <NativeSelect id="cp-method" name="method" defaultValue="bank_transfer">
                <option value="bank_transfer">Bank transfer</option>
                <option value="cheque">Cheque</option>
                <option value="upi">UPI</option>
              </NativeSelect>
            </Field>
            <Field id="cp-reference" label="Bank / UTR / cheque reference" required error={fe.reference}>
              <Input {...fieldA11y("cp-reference", fe.reference)} name="reference" />
            </Field>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              Record payment
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ClaimNoteForm({ claimId }: { claimId: string }) {
  const [text, setText] = useState("");
  const { run, pending, fieldErrors } = useAction();
  return (
    <form
      className="space-y-2"
      onSubmit={async (e) => {
        e.preventDefault();
        const r = await run(addVerificationNote, { claimId, text });
        if (r.ok) setText("");
      }}
    >
      <Field id="vnote" label="Add verification note" error={fieldErrors.text}>
        <Textarea {...fieldA11y("vnote", fieldErrors.text)} value={text} onChange={(e) => setText(e.target.value)} rows={2} />
      </Field>
      <Button type="submit" size="sm" disabled={pending || text.trim().length < 3}>
        Add note
      </Button>
    </form>
  );
}

export function ClaimDocumentUpload({ claimId }: { claimId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const { run, pending, fieldErrors } = useAction();
  return (
    <form
      ref={formRef}
      className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
      onSubmit={async (e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        data.set("claimId", claimId);
        const r = await run((() => uploadClaimDocument(data)) as (i: unknown) => Promise<ActionResult>, null);
        if (r.ok) formRef.current?.reset();
      }}
    >
      <Field id="doc-kind" label="Document type" error={fieldErrors.kind}>
        <NativeSelect id="doc-kind" name="kind" defaultValue="">
          <option value="" disabled>
            Choose…
          </option>
          {["Death certificate", "Claimant identity proof", "Relationship proof", "Bank details", "Other"].map((k) => (
            <option key={k}>{k}</option>
          ))}
        </NativeSelect>
      </Field>
      <Field id="doc-file" label="File (PDF, JPG or PNG, max 10 MB)" error={fieldErrors.file}>
        <Input {...fieldA11y("doc-file", fieldErrors.file)} name="file" type="file" accept="application/pdf,image/jpeg,image/png" className="py-1.5" required />
      </Field>
      <Button type="submit" variant="secondary" disabled={pending}>
        <Upload aria-hidden /> {pending ? "Uploading…" : "Upload"}
      </Button>
    </form>
  );
}
