"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { CreditCard, Loader2 } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { CheckboxField, FormStatus, TextField } from "./FormField";
import { payWithRazorpay } from "./razorpay-checkout";

/** Card / net-banking / UPI / wallet donation through Razorpay Checkout. */
export function OnlineDonationForm({ presets, min, max, testMode }: { presets: readonly number[]; min: number; max: number; testMode: boolean }) {
  const [amount, setAmount] = useState<string>(String(presets[1] ?? presets[0] ?? ""));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ kind: "idle" } | { kind: "error"; message: string } | { kind: "done"; reference: string | null; paymentId: string; amount: number }>({ kind: "idle" });

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const request = {
      kind: "donation",
      name: String(data.get("name") ?? ""),
      email: String(data.get("email") ?? ""),
      phone: String(data.get("phone") ?? ""),
      purpose: String(data.get("purpose") ?? ""),
      amount: Number(amount),
      consent: data.get("consent") === "on",
    };
    setBusy(true);
    setErrors({});
    setStatus({ kind: "idle" });
    const result = await payWithRazorpay(request);
    setBusy(false);
    if (result.status === "paid") setStatus({ kind: "done", reference: result.reference, paymentId: result.paymentId, amount: Number(amount) });
    else if (result.status === "invalid") {
      setErrors(result.errors);
      setStatus({ kind: "error", message: result.message });
    } else if (result.status === "error") setStatus({ kind: "error", message: result.message });
  }

  if (status.kind === "done") {
    return (
      <FormStatus
        state={{
          kind: "success",
          title: "Thank you — your donation has been received.",
          body: (
            <>
              <p>
                We received ₹{status.amount.toLocaleString("en-IN")}.{" "}
                {status.reference ? (
                  <>
                    Your donation reference is <strong className="font-mono">{status.reference}</strong>.
                  </>
                ) : (
                  <>Your payment ID is <strong className="font-mono">{status.paymentId}</strong>.</>
                )}{" "}
                A confirmation has been sent to your email.
              </p>
              <p className="mt-2 text-sm text-muted">
                Need a receipt? <Link href="/contact" className="text-emerald-ink underline underline-offset-2">Contact us</Link> with this reference.
              </p>
            </>
          ),
        }}
      />
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      {testMode && (
        <p className="rounded-xl border border-gold/40 bg-gold-soft/40 px-4 py-2 text-sm font-medium text-gold-ink">
          Test mode — no real money will be taken.
        </p>
      )}
      <fieldset>
        <legend className="mb-2 font-display text-[0.95rem] font-semibold text-forest">Amount (₹)</legend>
        <div className="flex flex-wrap gap-2">
          {presets.map((p) => (
            <button
              key={p}
              type="button"
              aria-pressed={amount === String(p)}
              onClick={() => setAmount(String(p))}
              className={cn(
                "h-11 rounded-full border px-5 font-display text-sm font-semibold transition-colors",
                amount === String(p) ? "border-forest bg-forest text-ivory" : "border-line bg-white text-forest hover:border-forest",
              )}
            >
              ₹{p.toLocaleString("en-IN")}
            </button>
          ))}
        </div>
        <TextField
          label="Or enter an amount"
          name="amountCustom"
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          step={1}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          error={errors.amount}
          className="mt-4 max-w-xs"
        />
      </fieldset>
      <div className="grid gap-6 sm:grid-cols-2">
        <TextField label="Your name" name="name" autoComplete="name" error={errors.name} required />
        <TextField label="Email address" name="email" type="email" autoComplete="email" hint="We send your confirmation here." error={errors.email} required />
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        <TextField label="Mobile number" name="phone" type="tel" inputMode="tel" autoComplete="tel-national" optional error={errors.phone} />
        <TextField label="Purpose" name="purpose" optional hint="For example: education support" error={errors.purpose} />
      </div>
      <CheckboxField
        name="consent"
        label={
          <>
            I am making a voluntary donation and agree that H R Foundation may use these details to record it and contact me, as described in the{" "}
            <Link href="/privacy-policy" className="text-emerald-ink underline underline-offset-2">
              privacy policy
            </Link>
            .
          </>
        }
        error={errors.consent}
      />
      <FormStatus state={status.kind === "error" ? status : { kind: "idle" }} />
      <button type="submit" disabled={busy} className={buttonClasses("primary", "lg", "w-full sm:w-auto")}>
        {busy ? <Loader2 aria-hidden className="size-4 animate-spin" /> : <CreditCard aria-hidden className="size-4" />}
        {busy ? "Opening secure payment…" : `Donate${Number(amount) > 0 ? ` ₹${Number(amount).toLocaleString("en-IN")}` : ""} online`}
      </button>
      <p className="text-xs text-muted">Payments are processed securely by Razorpay. Card, net banking, UPI and wallets are accepted.</p>
    </form>
  );
}
