"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { FileUp, Loader2 } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";
import { CheckboxField, FormStatus, Honeypot, TextField } from "./FormField";

type State =
  | { kind: "idle" }
  | { kind: "error"; message: string }
  | { kind: "success"; reference: string; targetDays: number };

const MAX_BYTES = 10 * 1024 * 1024;

/**
 * Nominee's online death-benefit claim. Sent as multipart form data because it carries the
 * death certificate. The server matches the membership ID with the nominee's mobile number.
 */
export function ClaimForm({ targetDays }: { targetDays: number }) {
  const [state, setState] = useState<State>({ kind: "idle" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);

    const file = data.get("certificate");
    if (file instanceof File && file.size > MAX_BYTES) {
      setErrors({ certificate: "File is too large (max 10 MB)." });
      setState({ kind: "error", message: "Please check the highlighted fields." });
      return;
    }

    setBusy(true);
    setErrors({});
    setState({ kind: "idle" });
    try {
      const res = await fetch("/api/claims", { method: "POST", body: data });
      const body = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
        reference?: string;
        targetDays?: number;
        errors?: Record<string, string>;
      };
      if (res.ok && body.ok) {
        form.reset();
        setState({ kind: "success", reference: body.reference ?? "", targetDays: body.targetDays ?? targetDays });
      } else {
        setErrors(body.errors ?? {});
        setState({ kind: "error", message: body.message ?? "Something went wrong. Please try again." });
      }
    } catch {
      setState({ kind: "error", message: "We could not reach the server. Please check your connection and try again." });
    } finally {
      setBusy(false);
    }
  }

  if (state.kind === "success") {
    return (
      <FormStatus
        state={{
          kind: "success",
          title: "Your claim and the death certificate have been received.",
          body: (
            <>
              <p>
                Your claim reference is <strong className="font-mono">{state.reference}</strong>. Please keep it for any follow-up.
              </p>
              <p className="mt-2">
                The foundation will verify the certificate and the membership, and will contact you on the nominee&apos;s mobile
                number to collect the bank details for payment. We aim to complete the process within {state.targetDays} days of
                receiving complete documents.
              </p>
            </>
          ),
        }}
      />
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="relative space-y-6" aria-describedby="claim-required-note">
      <p id="claim-required-note" className="text-sm text-muted">
        Fields marked <span className="text-danger">*</span> are required. Please do not enter bank details here — we will
        collect them securely during verification.
      </p>
      <Honeypot name="website" />
      <div className="grid gap-6 sm:grid-cols-2">
        <TextField
          label="Membership ID of the member"
          name="membershipId"
          autoComplete="off"
          hint="For example HRF-M-2026-00001"
          error={errors.membershipId}
          required
        />
        <TextField
          label="Nominee's mobile number"
          name="nomineeMobile"
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          hint="The number given for the nominee at registration"
          error={errors.nomineeMobile}
          required
        />
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        <TextField label="Your full name" name="claimantName" autoComplete="name" error={errors.claimantName} required />
        <TextField label="Email address" name="claimantEmail" type="email" autoComplete="email" optional error={errors.claimantEmail} />
      </div>
      <TextField label="Date of death" name="dateOfDeath" type="date" error={errors.dateOfDeath} required />
      <TextField
        label="Death certificate"
        name="certificate"
        type="file"
        accept="application/pdf,image/jpeg,image/png"
        hint="PDF, JPG or PNG, up to 10 MB. A clear photo of the official certificate is fine."
        error={errors.certificate}
        className="[&_input]:cursor-pointer"
        required
      />
      <CheckboxField
        name="consent"
        label={
          <>
            I am the nominee, the details above are true, and I agree that H R Foundation may use them to verify and process
            this claim, as described in the{" "}
            <Link href="/privacy-policy" className="text-emerald-ink underline underline-offset-2">
              privacy policy
            </Link>
            .
          </>
        }
        error={errors.consent}
      />
      <FormStatus state={state.kind === "error" ? state : { kind: "idle" }} />
      <button type="submit" disabled={busy} className={buttonClasses("primary", "lg", "w-full sm:w-auto")}>
        {busy ? <Loader2 aria-hidden className="size-4 animate-spin" /> : <FileUp aria-hidden className="size-4" />}
        {busy ? "Submitting…" : "Submit claim"}
      </button>
    </form>
  );
}
