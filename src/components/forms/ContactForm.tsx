"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { Loader2, Send } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";
import { contactSchema } from "@/lib/validation";
import { CheckboxField, FormStatus, Honeypot, SelectField, TextAreaField, TextField } from "./FormField";
import { useFormSubmit } from "./useFormSubmit";

type Input = z.input<typeof contactSchema>;
type Output = z.output<typeof contactSchema>;

const subjects = [
  { value: "general", label: "General enquiry" },
  { value: "education", label: "Education support" },
  { value: "medical", label: "Medical relief" },
  { value: "membership", label: "Membership" },
  { value: "donation", label: "Donation or receipt" },
  { value: "documents", label: "Request a document" },
  { value: "other", label: "Something else" },
];

export function ContactForm() {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Input, unknown, Output>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: "", phone: "", email: "", subject: undefined, message: "", website: "" },
  });
  const { state, submit } = useFormSubmit<Input>("/api/contact", setError);

  const onSubmit = handleSubmit(async (values) => {
    if (await submit(values)) reset();
  });

  if (state.kind === "success") {
    return (
      <FormStatus
        state={{
          kind: "success",
          title: "Thank you — your message has been sent.",
          body: (
            <>
              <p>
                Your reference is <strong className="font-mono">{state.reference}</strong>. Please keep it if you contact us again
                about this message.
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
    <form onSubmit={onSubmit} noValidate className="relative space-y-6" aria-describedby="contact-required-note">
      <p id="contact-required-note" className="text-sm text-muted">
        Fields marked <span className="text-danger">*</span> are required.
      </p>
      <Honeypot {...register("website")} />
      <TextField label="Your name" autoComplete="name" error={errors.name?.message} {...register("name")} />
      <div className="grid gap-6 sm:grid-cols-2">
        <TextField
          label="Mobile number"
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          optional
          hint="10-digit Indian mobile number"
          error={errors.phone?.message}
          {...register("phone")}
        />
        <TextField label="Email address" type="email" autoComplete="email" optional error={errors.email?.message} {...register("email")} />
      </div>
      <SelectField label="Subject" options={subjects} placeholder="Choose a subject" error={errors.subject?.message} {...register("subject")} />
      <TextAreaField
        label="Your message"
        hint="Please do not include medical records, bank details or identity numbers."
        error={errors.message?.message}
        {...register("message")}
      />
      <CheckboxField
        label={
          <>
            I agree that H R Foundation may use these details to reply to my enquiry, as described in the{" "}
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
        {isSubmitting ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
