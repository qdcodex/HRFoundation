import { addMonthsClamped, daysInMonth, toIso, type CalendarDate } from "@/lib/waiting-period";
import type { MembershipRules } from "@/lib/settings";

/**
 * Database filters equivalent to the waiting-period and age calculations in eligibility.ts,
 * so list filters, counts and the per-row status always agree.
 */

/** Latest effective date whose waiting period is complete on `today` (eff <= cutoff ⇔ completed). */
export function completionCutoff(today: CalendarDate, months: number): string {
  const back = addMonthsClamped(today, -months);
  // If today is the last day of its month, every later day of the earlier month also completes today
  // (because those dates clamp to the month end).
  if (today.day === daysInMonth(today.year, today.month)) {
    return toIso({ year: back.year, month: back.month, day: daysInMonth(back.year, back.month) });
  }
  return toIso(back);
}

/** Members born after this date are under the age limit today (dateOfBirth > cutoff ⇔ age < limit). */
export function ageCutoff(today: CalendarDate, limit: number): string {
  return `${String(today.year - limit).padStart(4, "0")}-${String(today.month).padStart(2, "0")}-${String(today.day).padStart(2, "0")}`;
}

export function addDays(date: CalendarDate, n: number): CalendarDate {
  const d = new Date(Date.UTC(date.year, date.month - 1, date.day + n));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

export type TrackerFilter = "in_progress" | "completed" | "not_eligible" | "inactive" | "requires_review" | "approaching";

/** Mongo filter for a tracker status (applies to members who have been activated at least once). */
export function trackerFilter(status: TrackerFilter, rules: MembershipRules, today: CalendarDate): Record<string, unknown> {
  const cut = completionCutoff(today, rules.waitingPeriodMonths);
  const age = ageCutoff(today, rules.benefitAgeLimit);
  const healthy = { status: "active", requiresReview: { $ne: true }, dateOfBirth: { $gt: age }, effectiveDate: { $type: "string" } };
  switch (status) {
    case "requires_review":
      return { requiresReview: true };
    case "inactive":
      return { requiresReview: { $ne: true }, status: { $ne: "active" } };
    case "not_eligible":
      return { status: "active", requiresReview: { $ne: true }, dateOfBirth: { $lte: age } };
    case "completed":
      return { ...healthy, effectiveDate: { $type: "string", $lte: cut } };
    case "in_progress":
      return { ...healthy, effectiveDate: { $type: "string", $gt: cut } };
    case "approaching": {
      const soon = completionCutoff(addDays(today, rules.approachingDays), rules.waitingPeriodMonths);
      return { ...healthy, effectiveDate: { $type: "string", $gt: cut, $lte: soon } };
    }
  }
}
