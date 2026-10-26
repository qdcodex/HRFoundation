"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import type { z } from "zod";
import { Info, Loader2, Send } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";
import type { MembershipView } from "@/lib/membership-view";
import { membershipSchema } from "@/lib/validation";
import { ageOn, parseIsoDate, todayInIndia } from "@/lib/waiting-period";
import { CheckboxField, FormStatus, Honeypot, SelectField, TextAreaField, TextField } from "./FormField";
import { MembershipWelcome, PayMembershipFeeButton } from "./PayMembershipFee";
import { payWithRazorpay } from "./razorpay-checkout";
import { useFormSubmit } from "./useFormSubmit";

type Input = z.input<typeof membershipSchema>;
type Output = z.output<typeof membershipSchema>;

const relationships = ["spouse", "son", "daughter", "father", "mother", "brother", "sister", "other"].map((r) => ({
  value: r,
  label: r.charAt(0).toUpperCase() + r.slice(1),
}));

function Section({ step, title, description, children }: { step: number; title: string; description?: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-[1.75rem] border border-line bg-white p-6 sm:p-8">
      <legend className="sr-only">{title}</legend>
      <div className="mb-6 flex items-start gap-4">
        <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-forest font-display text-sm font-bold text-gold">
          {step}
        </span>
        <div>
          <p aria-hidden className="font-display text-xl font-bold text-forest">
            {title}
          </p>
          {description && <p className="mt-1 text-sm leading-relaxed text-muted">{description}</p>}
        </div>
      </div>
      <div className="space-y-6">{children}</div>
    </fieldset>
  );
}

export function MembershipRegistrationForm({ m, onlinePayment = false }: { m: MembershipView; onlinePayment?: boolean }) {
  const [paidMobile, setPaidMobile] = useState("");
  const [payment, setPayment] = useState<
    | { kind: "none" }
    | { kind: "paying" }
    | { kind: "paid"; paymentId: string; membershipId?: string; certificateUrl?: string }
    | { kind: "unpaid"; message: string | null }
  >({ kind: "none" });
  const {
    register,
    handleSubmit,
    reset,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm<Input, unknown, Output>({
    resolver: zodResolver(membershipSchema),
    defaultValues: {
      fullName: "",
      dateOfBirth: "",
      mobile: "",
      email: "",
      address: "",
      district: "",
      pinCode: "",
      nomineeName: "",
      nomineeRelationship: undefined,
      nomineeRelationshipOther: "",
      nomineeMobile: "",
      website: "",
    },
  });
  const { state, submit } = useFormSubmit<Input>("/api/membership", setError);

  const dob = parseIsoDate(useWatch({ control, name: "dateOfBirth" }) ?? "");
  const age = dob ? ageOn(dob, todayInIndia()) : null;
  const relationship = useWatch({ control, name: "nomineeRelationship" });

  const payOnline = onlinePayment && Boolean(m.feeLabel);

  const onSubmit = handleSubmit(async (values) => {
    const created = await submit(values);
    if (!created) return;
    setPaidMobile(values.mobile);
    reset();
    window.scrollTo({ top: document.getElementById("register")?.offsetTop ?? 0, behavior: "smooth" });
    if (!payOnline) return;
    // Go straight to Razorpay; the membership is activated as soon as the payment is confirmed.
    setPayment({ kind: "paying" });
    const r = await payWithRazorpay({ kind: "membership", applicationRef: created.reference, mobile: values.mobile });
    if (r.status === "paid") setPayment({ kind: "paid", paymentId: r.paymentId, membershipId: r.membershipId, certificateUrl: r.certificateUrl });
    else setPayment({ kind: "unpaid", message: r.status === "error" || r.status === "invalid" ? r.message : null });
  });

  if (!m.registrationOpen) {
    return <FormStatus state={{ kind: "error", message: "Membership applications are not open at the moment. Please check back later." }} />;
  }

  if (state.kind === "success" && payment.kind === "paid") return <MembershipWelcome {...payment} />;

  if (state.kind === "success" && payment.kind === "paying") {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-line bg-white p-6 text-charcoal" role="status" aria-live="polite">
        <Loader2 aria-hidden className="size-5 animate-spin text-forest" />
        Opening secure payment for {m.feeLabel}…
      </div>
    );
  }

  if (state.kind === "success" && payment.kind === "unpaid") {
    return (
      <div className="space-y-4 rounded-2xl border border-gold/40 bg-gold-soft/30 p-6" role="status" aria-live="polite">
        <p className="font-display text-lg font-bold text-forest">Complete your payment to activate your membership</p>
        <p className="text-charcoal">
          {payment.message ?? "The payment was not completed."} Your details are saved (reference{" "}
          <strong className="font-mono">{state.reference}</strong>) — pay now and your membership and certificate are issued straight away.
        </p>
        <PayMembershipFeeButton applicationRef={state.reference} mobile={paidMobile} feeLabel={m.feeLabel!} />
      </div>
    );
  }

  if (state.kind === "success") {
    return (
      <FormStatus
        state={{
          kind: "success",
          title: "Application received",
          body: (
            <div className="space-y-3">
              <p>
                Your application reference is <strong className="font-mono">{state.reference}</strong>. Please keep it safe.
              </p>
              <p>
                This is <strong>not</strong> a membership ID and your membership is <strong>not yet active</strong>.{" "}
                {onlinePayment && m.feeLabel
                  ? "Pay the membership fee online now, or the foundation will contact you about other ways to pay."
                  : "The foundation will contact you about the membership fee, payment and approval."}{" "}
                A membership ID and effective date are issued only after activation, and the {m.waitingPeriodMonths}-month
                waiting period starts from that date.
              </p>
              {onlinePayment && m.feeLabel && paidMobile && (
                <PayMembershipFeeButton applicationRef={state.reference} mobile={paidMobile} feeLabel={m.feeLabel} />
              )}
              {!state.delivered && (
                <p className="text-sm text-muted">Development mode: email delivery is not configured, so no email was sent.</p>
              )}
            </div>
          ),
        }}
      />
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="relative space-y-6">
      <p className="text-sm text-muted">
        Fields marked <span className="text-danger">*</span> are required. We collect only the details needed to process your
        application.
      </p>
      <Honeypot {...register("website")} />

      <Section step={1} title="Your details">
        <TextField label="Full name (as on your ID)" autoComplete="name" error={errors.fullName?.message} {...register("fullName")} />
        <div className="grid gap-6 sm:grid-cols-2">
          <TextField label="Date of birth" type="date" autoComplete="bday" error={errors.dateOfBirth?.message} {...register("dateOfBirth")} />
          <TextField label="Mobile number" type="tel" inputMode="tel" autoComplete="tel-national" error={errors.mobile?.message} {...register("mobile")} />
        </div>
        {age !== null && age >= m.benefitAgeLimit && age <= 120 && (
          <p className="flex gap-3 rounded-xl border border-gold/40 bg-gold-soft/30 px-4 py-3 text-sm leading-relaxed" role="note">
            <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-gold-ink" />
            Under the proposed rules, the death-benefit provision applies only to members under {m.benefitAgeLimit}. You
            may still apply for membership; the foundation will explain what applies to you.
          </p>
        )}
        <TextField label="Email address" type="email" autoComplete="email" optional error={errors.email?.message} {...register("email")} />
      </Section>

      <Section step={2} title="Residential address">
        <TextAreaField label="Address" rows={3} autoComplete="street-address" error={errors.address?.message} {...register("address")} />
        <div className="grid gap-6 sm:grid-cols-2">
          <TextField label="District" autoComplete="address-level2" error={errors.district?.message} {...register("district")} />
          <TextField label="PIN code" inputMode="numeric" autoComplete="postal-code" maxLength={6} error={errors.pinCode?.message} {...register("pinCode")} />
        </div>
      </Section>

      <Section
        step={3}
        title="Nominee"
        description="The person who may submit a claim on your behalf. Nominee details are kept private and are never published."
      >
        <TextField label="Nominee's full name" error={errors.nomineeName?.message} {...register("nomineeName")} />
        <div className="grid gap-6 sm:grid-cols-2">
          <SelectField
            label="Relationship to you"
            options={relationships}
            placeholder="Choose relationship"
            error={errors.nomineeRelationship?.message}
            {...register("nomineeRelationship")}
          />
          <TextField label="Nominee's mobile number" type="tel" inputMode="tel" error={errors.nomineeMobile?.message} {...register("nomineeMobile")} />
        </div>
        {relationship === "other" && (
          <TextField label="Please describe the relationship" error={errors.nomineeRelationshipOther?.message} {...register("nomineeRelationshipOther")} />
        )}
      </Section>

      <Section step={4} title="Declarations">
        <CheckboxField
          label={
            <>
              I have read and accept the{" "}
              <Link href="/membership/terms" target="_blank" className="text-emerald-ink underline underline-offset-2">
                membership terms and disclaimer
                <span className="sr-only"> (opens in a new tab)</span>
              </Link>{" "}
              ({m.termsVersion}).
            </>
          }
          error={errors.acceptTerms?.message}
          {...register("acceptTerms")}
        />
        <CheckboxField
          label={`I understand that the death-benefit provision of up to ${m.maxBenefit} is a proposed scheme, is not insurance, and is not a guaranteed payment.`}
          error={errors.acknowledgeProposed?.message}
          {...register("acknowledgeProposed")}
        />
        <CheckboxField
          label={
            <>
              I consent to H R Foundation using my details to process this application, as described in the{" "}
              <Link href="/privacy-policy" target="_blank" className="text-emerald-ink underline underline-offset-2">
                privacy policy
                <span className="sr-only"> (opens in a new tab)</span>
              </Link>
              .
            </>
          }
          error={errors.consentData?.message}
          {...register("consentData")}
        />
        <CheckboxField
          label="My nominee has agreed to their details being shared with the foundation for this purpose."
          error={errors.nomineeConsent?.message}
          {...register("nomineeConsent")}
        />
      </Section>

      <FormStatus state={state.kind === "error" ? state : { kind: "idle" }} />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <button type="submit" disabled={isSubmitting} className={buttonClasses("primary", "lg", "w-full sm:w-auto")}>
          {isSubmitting ? <Loader2 aria-hidden className="size-4 animate-spin" /> : <Send aria-hidden className="size-4" />}
          {isSubmitting ? "Submitting…" : payOnline ? `Continue to pay ${m.feeLabel}` : "Submit application"}
        </button>
        <p className="text-sm text-muted">
          {payOnline
            ? "You will pay securely with Razorpay (UPI, cards, net banking or wallets). Your membership and certificate are issued as soon as the payment succeeds."
            : "No payment is taken online. The foundation will contact you about the next steps."}
        </p>
      </div>
    </form>
  );
}
