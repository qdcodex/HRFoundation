"use client";

import { useState, type FormEvent } from "react";
import { BadgeCheck, CreditCard, Download, Loader2, LockKeyhole } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";
import { FormStatus, TextField } from "./FormField";
import { payWithRazorpay } from "./razorpay-checkout";

type Paid = { paymentId: string; membershipId?: string; certificateUrl?: string };
type Status = { kind: "idle" } | { kind: "error"; message: string } | ({ kind: "done" } & Paid);

/** Shown after a successful online payment: the membership is active and the certificate is ready. */
export function MembershipWelcome({ paymentId, membershipId, certificateUrl }: Paid) {
  if (!membershipId || !certificateUrl) {
    return (
      <FormStatus
        state={{
          kind: "success",
          title: "Membership fee received — thank you.",
          body: (
            <p>
              Your payment (ID <strong className="font-mono">{paymentId}</strong>) has been confirmed. The foundation will complete your
              membership shortly and send your membership ID, login details and certificate.
            </p>
          ),
        }}
      />
    );
  }
  return (
    <div className="rounded-[1.75rem] border border-emerald/30 bg-sage p-6 sm:p-8" role="status" aria-live="polite">
      <p className="flex items-center gap-2 font-display text-xl font-bold text-forest">
        <BadgeCheck aria-hidden className="size-7 text-emerald" /> Welcome — your membership is active!
      </p>
      <dl className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-white p-4 ring-1 ring-line">
          <dt className="text-xs font-semibold tracking-wide text-muted uppercase">Membership ID</dt>
          <dd className="mt-1 font-mono text-lg font-bold text-forest">{membershipId}</dd>
        </div>
        <div className="rounded-2xl bg-white p-4 ring-1 ring-line">
          <dt className="text-xs font-semibold tracking-wide text-muted uppercase">Payment ID</dt>
          <dd className="mt-1 font-mono text-sm text-charcoal">{paymentId}</dd>
        </div>
      </dl>
      <a href={certificateUrl} target="_blank" rel="noopener" className={buttonClasses("primary", "lg", "mt-6 w-full sm:w-auto")}>
        <Download aria-hidden className="size-4" /> View &amp; download membership certificate
      </a>
      <p className="mt-4 text-sm leading-relaxed text-charcoal">
        Your certificate and member login details have also been sent to your email. Use them to sign in to the{" "}
        <a href="/member/login" className="text-emerald-ink underline underline-offset-2">
          member portal
        </a>{" "}
        at any time — and share them with your nominee. Your waiting period starts today.
      </p>
    </div>
  );
}

/** Makes it clear the payment is handled by Razorpay and which methods are accepted. */
function SecuredByRazorpay() {
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
      <span className="inline-flex items-center gap-1 font-semibold text-forest">
        <LockKeyhole aria-hidden className="size-3.5" /> Secured by Razorpay
      </span>
      <span aria-hidden>·</span>
      <span>UPI, debit &amp; credit cards, net banking and wallets</span>
    </p>
  );
}

/** One-click payment right after applying (reference and mobile are already known). */
export function PayMembershipFeeButton({ applicationRef, mobile, feeLabel }: { applicationRef: string; mobile: string; feeLabel: string }) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  if (status.kind === "done") return <MembershipWelcome {...status} />;
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
          if (r.status === "paid") setStatus({ kind: "done", paymentId: r.paymentId, membershipId: r.membershipId, certificateUrl: r.certificateUrl });
          else if (r.status === "error" || r.status === "invalid") setStatus({ kind: "error", message: r.message });
        }}
      >
        {busy ? <Loader2 aria-hidden className="size-4 animate-spin" /> : <CreditCard aria-hidden className="size-4" />}
        {busy ? "Opening Razorpay…" : `Pay ${feeLabel} with Razorpay`}
      </button>
      <SecuredByRazorpay />
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
    if (r.status === "paid") setStatus({ kind: "done", paymentId: r.paymentId, membershipId: r.membershipId, certificateUrl: r.certificateUrl });
    else if (r.status === "invalid") {
      setErrors(r.errors);
      setStatus({ kind: "error", message: r.message });
    } else if (r.status === "error") setStatus({ kind: "error", message: r.message });
  }

  if (status.kind === "done") return <MembershipWelcome {...status} />;
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
        {busy ? "Opening Razorpay…" : `Pay ${feeLabel} with Razorpay`}
      </button>
      <SecuredByRazorpay />
    </form>
  );
}
