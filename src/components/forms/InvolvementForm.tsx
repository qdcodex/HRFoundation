"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useForm, useWatch } from "react-hook-form";
import type { z } from "zod";
import { Loader2, Send } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";
import { involvementSchema } from "@/lib/validation";
import { CheckboxField, FieldError, FormStatus, Honeypot, SelectField, TextAreaField, TextField } from "./FormField";
import { useFormSubmit } from "./useFormSubmit";

type Input = z.input<typeof involvementSchema>;
type Output = z.output<typeof involvementSchema>;

const interestOptions = [
  { value: "education", label: "Education" },
  { value: "medical", label: "Medical relief" },
  { value: "community", label: "Community welfare" },
  { value: "events", label: "Events & outreach" },
  { value: "skills", label: "Professional skills" },
] as const;

export function InvolvementForm() {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm<Input, unknown, Output>({
    resolver: zodResolver(involvementSchema),
    defaultValues: { type: undefined, name: "", organisation: "", phone: "", email: "", city: "", interests: [], message: "", website: "" },
  });
  const { state, submit } = useFormSubmit<Input>("/api/get-involved", setError);
  const type = useWatch({ control, name: "type" });

  const onSubmit = handleSubmit(async (values) => {
    if (await submit(values)) reset();
  });

  if (state.kind === "success") {
    return (
      <FormStatus
        state={{
          kind: "success",
          title: "Thank you for offering your support.",
          body: (
            <>
              <p>
                We have received your enquiry (reference <strong className="font-mono">{state.reference}</strong>). A member of
                the foundation will contact you when there is an opportunity that matches your interests.
              </p>
              {!state.delivered && (
                <p className="mt-2 text-sm text-muted">Development mode: email delivery is not configured, so no email was sent.</p>
              )}
            </>
          ),
        }}
      />
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="relative space-y-6">
      <p className="text-sm text-muted">
        Fields marked <span className="text-danger">*</span> are required.
      </p>
      <Honeypot {...register("website")} />
      <SelectField
        label="How would you like to help?"
        placeholder="Choose one"
        options={[
          { value: "volunteer", label: "Volunteer my time" },
          { value: "partnership", label: "Partner as an organisation" },
          { value: "other", label: "Another kind of support" },
        ]}
        error={errors.type?.message}
        {...register("type")}
      />
      <div className="grid gap-6 sm:grid-cols-2">
        <TextField label="Your name" autoComplete="name" error={errors.name?.message} {...register("name")} />
        <TextField
          label="Organisation"
          autoComplete="organization"
          optional={type !== "partnership"}
          hint={type === "partnership" ? "The organisation you represent" : undefined}
          error={errors.organisation?.message}
          {...register("organisation")}
        />
        <TextField label="Mobile number" type="tel" inputMode="tel" autoComplete="tel-national" error={errors.phone?.message} {...register("phone")} />
        <TextField label="Email address" type="email" autoComplete="email" optional error={errors.email?.message} {...register("email")} />
      </div>
      <TextField label="Town or city" autoComplete="address-level2" error={errors.city?.message} {...register("city")} />

      <fieldset>
        <legend className="mb-3 font-display text-[0.95rem] font-semibold text-forest">
          Areas of interest <span className="font-sans text-xs font-normal text-muted">(optional)</span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {interestOptions.map((o) => (
            <label
              key={o.value}
              className="cursor-pointer rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-charcoal transition-colors has-checked:border-forest has-checked:bg-forest has-checked:text-ivory has-focus-visible:ring-3 has-focus-visible:ring-gold/50"
            >
              <input type="checkbox" value={o.value} className="sr-only" {...register("interests")} />
              {o.label}
            </label>
          ))}
        </div>
        <FieldError id="interests-error" message={errors.interests?.message} />
      </fieldset>

      <TextAreaField
        label="Tell us a little about yourself"
        hint="For example, your skills, availability, or the partnership you have in mind."
        error={errors.message?.message}
        {...register("message")}
      />
      <CheckboxField
        label={
          <>
            I agree that H R Foundation may contact me about this enquiry, as described in the{" "}
            <Link href="/privacy-policy" className="text-emerald-ink underline underline-offset-2">
              privacy policy
            </Link>
            .
          </>
        }
        error={errors.consent?.message}
        {...register("consent")}
      />
      <FormStatus state={state.kind === "error" ? state : { kind: "idle" }} />
      <button type="submit" disabled={isSubmitting} className={buttonClasses("primary", "lg", "w-full sm:w-auto")}>
        {isSubmitting ? <Loader2 aria-hidden className="size-4 animate-spin" /> : <Send aria-hidden className="size-4" />}
        {isSubmitting ? "Sending…" : "Send enquiry"}
      </button>
    </form>
  );
}
