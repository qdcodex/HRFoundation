"use client";

import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const control =
  "block w-full rounded-xl border bg-white px-4 py-3 text-base text-charcoal placeholder:text-muted/70 transition-colors focus:border-forest focus:outline-none focus:ring-3 focus:ring-gold/40 aria-[invalid=true]:border-danger aria-[invalid=true]:ring-danger/20";

type Base = { label: string; error?: string; hint?: ReactNode; optional?: boolean; className?: string };

function FieldShell({
  id,
  label,
  error,
  hint,
  optional,
  className,
  children,
}: Base & { id: string; children: ReactNode }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-2 flex items-baseline justify-between gap-3 font-display text-[0.95rem] font-semibold text-forest">
        <span>
          {label}
          {!optional && (
            <span aria-hidden className="ml-0.5 text-danger">
              *
            </span>
          )}
        </span>
        {optional && <span className="font-sans text-xs font-normal text-muted">Optional</span>}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-2 text-sm text-muted">
          {hint}
        </p>
      )}
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-2 flex items-start gap-1.5 text-sm font-medium text-danger">
      <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
      {message}
    </p>
  );
}

function describedBy(id: string, error?: string, hint?: ReactNode) {
  return error ? `${id}-error` : hint ? `${id}-hint` : undefined;
}

export const TextField = forwardRef<HTMLInputElement, Base & InputHTMLAttributes<HTMLInputElement>>(function TextField(
  { label, error, hint, optional, className, id: idProp, ...props },
  ref,
) {
  const generated = useId();
  const id = idProp ?? generated;
  return (
    <FieldShell id={id} label={label} error={error} hint={hint} optional={optional} className={className}>
      <input
        ref={ref}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        aria-required={!optional || undefined}
        className={cn(control, "border-line")}
        {...props}
      />
    </FieldShell>
  );
});

export const TextAreaField = forwardRef<HTMLTextAreaElement, Base & TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function TextAreaField({ label, error, hint, optional, className, id: idProp, ...props }, ref) {
    const generated = useId();
    const id = idProp ?? generated;
    return (
      <FieldShell id={id} label={label} error={error} hint={hint} optional={optional} className={className}>
        <textarea
          ref={ref}
          id={id}
          rows={5}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, error, hint)}
          aria-required={!optional || undefined}
          className={cn(control, "min-h-32 border-line")}
          {...props}
        />
      </FieldShell>
    );
  },
);

export const SelectField = forwardRef<
  HTMLSelectElement,
  Base & SelectHTMLAttributes<HTMLSelectElement> & { options: { value: string; label: string }[]; placeholder?: string }
>(function SelectField({ label, error, hint, optional, className, id: idProp, options, placeholder = "Select…", ...props }, ref) {
  const generated = useId();
  const id = idProp ?? generated;
  return (
    <FieldShell id={id} label={label} error={error} hint={hint} optional={optional} className={className}>
      <select
        ref={ref}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        aria-required={!optional || undefined}
        className={cn(control, "appearance-none border-line bg-[length:1.1rem] bg-[right_1rem_center] bg-no-repeat pr-10")}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23153d32' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
        }}
        {...props}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
});

export const CheckboxField = forwardRef<HTMLInputElement, { label: ReactNode; error?: string; className?: string } & InputHTMLAttributes<HTMLInputElement>>(
  function CheckboxField({ label, error, className, id: idProp, ...props }, ref) {
    const generated = useId();
    const id = idProp ?? generated;
    return (
      <div className={className}>
        <div className="flex gap-3">
          <input
            ref={ref}
            id={id}
            type="checkbox"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-error` : undefined}
            className="mt-0.5 size-5 shrink-0 rounded border-line accent-forest"
            {...props}
          />
          <label htmlFor={id} className="text-[0.95rem] leading-relaxed text-charcoal">
            {label}
          </label>
        </div>
        <div className="pl-8">
          <FieldError id={`${id}-error`} message={error} />
        </div>
      </div>
    );
  },
);

/** Live region announcing submission results. */
export function FormStatus({ state }: { state: { kind: "idle" } | { kind: "error"; message: string } | { kind: "success"; title: string; body: ReactNode } }) {
  return (
    <div aria-live="polite" role="status">
      {state.kind === "error" && (
        <div className="flex gap-3 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          <AlertCircle aria-hidden className="mt-0.5 size-5 shrink-0" />
          <p className="font-medium">{state.message}</p>
        </div>
      )}
      {state.kind === "success" && (
        <div className="rounded-2xl border border-emerald/30 bg-sage p-6">
          <p className="flex items-center gap-2 font-display text-lg font-bold text-forest">
            <CheckCircle2 aria-hidden className="size-6 text-emerald" />
            {state.title}
          </p>
          <div className="mt-2 leading-relaxed text-charcoal">{state.body}</div>
        </div>
      )}
    </div>
  );
}

/** Honeypot input: hidden from people and assistive technology; bots tend to fill it. */
export const Honeypot = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Honeypot(props, ref) {
  return (
    <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
      <label>
        Website
        <input ref={ref} type="text" tabIndex={-1} autoComplete="off" {...props} />
      </label>
    </div>
  );
});
