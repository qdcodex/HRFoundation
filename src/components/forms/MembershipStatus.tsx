"use client";

import { useId, useState } from "react";
import { CalendarCheck2, Hourglass } from "lucide-react";
import { formatLong, getWaitingPeriodStatus, parseIsoDate, todayInIndia, type WaitingPeriodResult } from "@/lib/waiting-period";
import { buttonClasses } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

/**
 * Waiting-period status display + calculator.
 * Members enter the effective date shown on their membership confirmation.
 * Calculation runs entirely in the browser; nothing is sent to the server.
 */
export function MembershipStatus({ waitingPeriodMonths }: { waitingPeriodMonths: number }) {
  const id = useId();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<WaitingPeriodResult | null>(null);

  function check(e: React.FormEvent) {
    e.preventDefault();
    const date = parseIsoDate(value);
    if (!date) {
      setError("Enter a valid effective membership date.");
      setResult(null);
      return;
    }
    setError(null);
    setResult(getWaitingPeriodStatus(date, todayInIndia(), waitingPeriodMonths));
  }

  return (
    <div className="rounded-[2rem] bg-forest p-6 text-ivory sm:p-10">
      <form onSubmit={check} noValidate className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor={id} className="mb-2 block font-display font-semibold">
            Effective membership date
          </label>
          <input
            id={id}
            type="date"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-error` : `${id}-hint`}
            className="block w-full rounded-xl border border-ivory/25 bg-forest-deep px-4 py-3 text-ivory [color-scheme:dark] focus:border-gold focus:outline-none focus:ring-3 focus:ring-gold/40"
          />
        </div>
        <button type="submit" className={buttonClasses("gold", "lg")}>
          Check status
        </button>
      </form>
      {error ? (
        <p id={`${id}-error`} className="mt-3 text-sm font-medium text-gold-soft">
          {error}
        </p>
      ) : (
        <p id={`${id}-hint`} className="mt-3 text-sm text-ivory/65">
          Shown on your membership confirmation after activation. Nothing you enter here is sent anywhere.
        </p>
      )}

      <div aria-live="polite">
        {result && (
          <div
            className={cn(
              "mt-8 flex gap-4 rounded-2xl p-6",
              result.state === "completed" ? "bg-sage text-forest" : "bg-ivory/10 text-ivory",
            )}
          >
            {result.state === "completed" ? (
              <CalendarCheck2 aria-hidden className="size-7 shrink-0 text-emerald" />
            ) : (
              <Hourglass aria-hidden className="size-7 shrink-0 text-gold" />
            )}
            <div>
              <p className="font-display text-xl font-bold">
                {result.state === "completed" && "Waiting Period Completed — Eligible for Consideration"}
                {result.state === "in-progress" && "Waiting Period in Progress"}
                {result.state === "not-started" && "Membership not yet effective"}
              </p>
              <p className={cn("mt-2 leading-relaxed", result.state === "completed" ? "text-charcoal" : "text-ivory/80")}>
                Effective date: {formatLong(result.effective)}. The {waitingPeriodMonths}-month waiting period{" "}
                {result.state === "completed" ? "was completed on" : "completes on"} <strong>{formatLong(result.completes)}</strong>
                {result.state !== "completed" && <> ({result.daysRemaining} days from today)</>}.
              </p>
              <p className={cn("mt-2 text-sm", result.state === "completed" ? "text-muted" : "text-ivory/65")}>
                {result.state === "completed"
                  ? "This does not guarantee any payment. All other conditions — active membership, age, claim submission and verification, and the approved terms — still apply."
                  : "Membership must remain active throughout the waiting period."}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
