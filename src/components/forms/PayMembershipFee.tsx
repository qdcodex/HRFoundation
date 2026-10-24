"use client";

import { useState, type FormEvent } from "react";
import { CreditCard, Loader2 } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";
import { FormStatus, TextField } from "./FormField";
import { payWithRazorpay } from "./razorpay-checkout";

type Status = { kind: "idle" } | { kind: "error"; message: string } | { kind: "done"; paymentId: string };

function Paid({ paymentId }: { paymentId: string }) {
  return (
    <FormStatus
      state={{
        kind: "success",
        title: "Membership fee received — thank you.",
        body: (
          <p>
            Your payment (ID <strong className="font-mono">{paymentId}</strong>) has been confirmed and your application is now with the
            foundation for approval. You will receive your membership ID, login details and certificate once it is approved.
          </p>
        ),
      }}
    />
  );
}

/** One-click payment right after applying (reference and mobile are already known). */
export function PayMembershipFeeButton({ applicationRef, mobile, feeLabel }: { applicationRef: string; mobile: string; feeLabel: string }) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  if (status.kind === "done") return <Paid paymentId={status.paymentId} />;
  return (
    <div className="space-y-3">
      <button
        type="button"
        disabled={busy}
        className={buttonClasses("primary", "lg", "w-full sm:w-auto")}
        onClick={async () => {
          setBusy(true);
          setStatus({ kind: "idle" });
          const r = await payWithRazorpay({ kind: "membership", applicationRef, mobile });
          setBusy(false);
          if (r.status === "paid") setStatus({ kind: "done", paymentId: r.paymentId });
          else if (r.status === "error" || r.status === "invalid") setStatus({ kind: "error", message: r.message });
        }}
      >
        {busy ? <Loader2 aria-hidden className="size-4 animate-spin" /> : <CreditCard aria-hidden className="size-4" />}
        {busy ? "Opening secure payment…" : `Pay ${feeLabel} online now`}
      </button>
      <FormStatus state={status.kind === "error" ? status : { kind: "idle" }} />
    </div>
  );
}

/** For applicants paying later: enter the application reference and mobile number. */
export function PayMembershipFeeForm({ feeLabel, testMode }: { feeLabel: string; testMode: boolean }) {
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setErrors({});
    setStatus({ kind: "idle" });
    const r = await payWithRazorpay({ kind: "membership", applicationRef: String(data.get("applicationRef") ?? ""), mobile: String(data.get("mobile") ?? "") });
    setBusy(false);
    if (r.status === "paid") setStatus({ kind: "done", paymentId: r.paymentId });
    else if (r.status === "invalid") {
      setErrors(r.errors);
      setStatus({ kind: "error", message: r.message });
    } else if (r.status === "error") setStatus({ kind: "error", message: r.message });
  }

  if (status.kind === "done") return <Paid paymentId={status.paymentId} />;
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      {testMode && (
        <p className="rounded-xl border border-gold/40 bg-gold-soft/40 px-4 py-2 text-sm font-medium text-gold-ink">Test mode — no real money will be taken.</p>
      )}
      <div className="grid gap-6 sm:grid-cols-2">
        <TextField label="Application reference" name="applicationRef" autoCapitalize="characters" hint="Shown when you applied, e.g. HRF-MA-20261024-ABC123" error={errors.applicationRef} required />
        <TextField label="Mobile number" name="mobile" type="tel" inputMode="tel" autoComplete="tel-national" hint="The number on your application" error={errors.mobile} required />
      </div>
      <FormStatus state={status.kind === "error" ? status : { kind: "idle" }} />
      <button type="submit" disabled={busy} className={buttonClasses("primary", "lg", "w-full sm:w-auto")}>
        {busy ? <Loader2 aria-hidden className="size-4 animate-spin" /> : <CreditCard aria-hidden className="size-4" />}
        {busy ? "Opening secure payment…" : `Pay ${feeLabel} online`}
      </button>
    </form>
  );
}
