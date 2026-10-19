import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

const control =
  "w-full rounded-lg border border-line bg-white px-3 text-sm text-charcoal shadow-xs transition-colors placeholder:text-muted/70 focus-visible:border-forest focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-gold/35 disabled:cursor-not-allowed disabled:bg-ivory disabled:opacity-70 aria-[invalid=true]:border-danger aria-[invalid=true]:ring-danger/20";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input data-slot="input" className={cn(control, "h-10", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea data-slot="textarea" className={cn(control, "min-h-24 py-2 leading-relaxed", className)} {...props} />;
}

export function NativeSelect({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <select
      data-slot="select"
      className={cn(
        control,
        "h-10 appearance-none bg-[length:1rem] bg-[right_0.7rem_center] bg-no-repeat pr-9",
        "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2355605a' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")]",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Label({ className, ...props }: ComponentProps<"label">) {
  return <label data-slot="label" className={cn("text-sm font-semibold text-charcoal", className)} {...props} />;
}

export function Checkbox({ className, ...props }: Omit<ComponentProps<"input">, "type">) {
  return <input type="checkbox" className={cn("size-4 rounded border-line accent-forest", className)} {...props} />;
}

/** Label + control + hint + error, with ids wired for screen readers. */
export function Field({
  id,
  label,
  hint,
  error,
  required,
  children,
  className,
}: {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id}>
        {label}
        {required && (
          <span aria-hidden className="ml-0.5 text-danger">
            *
          </span>
        )}
      </Label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function fieldA11y(id: string, error?: string, hint?: boolean) {
  return {
    id,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? `${id}-error` : hint ? `${id}-hint` : undefined,
  } as const;
}
