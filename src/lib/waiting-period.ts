/**
 * Six-month waiting-period logic.
 *
 * Rule implemented (CLIENT TO CONFIRM against the approved scheme rules):
 *  - The waiting period starts on the member's effective membership date.
 *  - It completes on the same calendar day N months later. If that day does not exist
 *    (e.g. 31 August + 6 months), the last day of the target month is used (28/29 February).
 *  - On or after the completion date the member is "Eligible for consideration",
 *    which is NOT a guarantee of any payment — all other conditions still apply.
 *
 * Dates are handled as calendar dates (YYYY-MM-DD) in UTC to avoid timezone drift.
 */

export type CalendarDate = { year: number; month: number; day: number }; // month: 1-12

export function parseIsoDate(value: string): CalendarDate | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) return null;
  return { year, month, day };
}

export function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function addMonthsClamped(date: CalendarDate, months: number): CalendarDate {
  const zeroBased = date.month - 1 + months;
  const year = date.year + Math.floor(zeroBased / 12);
  const month = (((zeroBased % 12) + 12) % 12) + 1;
  const day = Math.min(date.day, daysInMonth(year, month));
  return { year, month, day };
}

export function compareDates(a: CalendarDate, b: CalendarDate) {
  return a.year - b.year || a.month - b.month || a.day - b.day;
}

export function toIso(date: CalendarDate) {
  return `${date.year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;
}

export function formatLong(date: CalendarDate) {
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(date.year, date.month - 1, date.day)),
  );
}

function toUtcMs(date: CalendarDate) {
  return Date.UTC(date.year, date.month - 1, date.day);
}

export type WaitingPeriodResult =
  | { state: "not-started"; effective: CalendarDate; completes: CalendarDate; daysRemaining: number }
  | { state: "in-progress"; effective: CalendarDate; completes: CalendarDate; daysRemaining: number }
  | { state: "completed"; effective: CalendarDate; completes: CalendarDate; daysRemaining: 0 };

export function getWaitingPeriodStatus(
  effective: CalendarDate,
  today: CalendarDate,
  months: number,
): WaitingPeriodResult {
  const completes = addMonthsClamped(effective, months);
  const daysRemaining = Math.max(0, Math.round((toUtcMs(completes) - toUtcMs(today)) / 86_400_000));

  if (compareDates(today, effective) < 0) return { state: "not-started", effective, completes, daysRemaining };
  if (compareDates(today, completes) >= 0) return { state: "completed", effective, completes, daysRemaining: 0 };
  return { state: "in-progress", effective, completes, daysRemaining };
}

/** Today's date in India (IST), as a calendar date. Call only at request time / in the browser. */
export function todayInIndia(now = new Date()): CalendarDate {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return parseIsoDate(parts)!;
}

export function ageOn(birth: CalendarDate, on: CalendarDate) {
  let age = on.year - birth.year;
  if (on.month < birth.month || (on.month === birth.month && on.day < birth.day)) age -= 1;
  return age;
}
