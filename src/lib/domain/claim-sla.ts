import { toIso, todayInIndia, type CalendarDate } from "@/lib/waiting-period";

const RUNNING = ["submitted", "under_review", "approved", "payment_pending"];

function istDate(value: Date): CalendarDate {
  return todayInIndia(value);
}

function addDays(d: CalendarDate, days: number): CalendarDate {
  const t = new Date(Date.UTC(d.year, d.month - 1, d.day + days));
  return { year: t.getUTCFullYear(), month: t.getUTCMonth() + 1, day: t.getUTCDate() };
}

function daysBetween(a: CalendarDate, b: CalendarDate) {
  return Math.round((Date.UTC(b.year, b.month - 1, b.day) - Date.UTC(a.year, a.month - 1, a.day)) / 86_400_000);
}

export type ClaimSla =
  | { kind: "running"; startedOn: string; dueOn: string; daysLeft: number }
  | { kind: "paused" }
  | { kind: "none" };

/**
 * Service target for a claim: `targetDays` from receipt of complete documents.
 * The clock starts at submission, restarts when requested documents are received
 * (the latest resolved information request), and is paused while documents are awaited.
 */
export function claimSla(
  claim: { status: string; submittedAt: Date; infoRequests?: { resolvedAt?: Date | null }[] },
  targetDays: number,
  now = new Date(),
): ClaimSla {
  if (claim.status === "info_required") return { kind: "paused" };
  if (!RUNNING.includes(claim.status)) return { kind: "none" };
  let start = claim.submittedAt;
  for (const r of claim.infoRequests ?? []) if (r.resolvedAt && r.resolvedAt > start) start = r.resolvedAt;
  const started = istDate(start);
  const due = addDays(started, targetDays);
  return { kind: "running", startedOn: toIso(started), dueOn: toIso(due), daysLeft: daysBetween(istDate(now), due) };
}

export function slaLabel(sla: ClaimSla) {
  if (sla.kind === "paused") return "Paused — awaiting documents";
  if (sla.kind === "none") return null;
  if (sla.daysLeft < 0) return `Overdue by ${-sla.daysLeft} day${sla.daysLeft === -1 ? "" : "s"}`;
  if (sla.daysLeft === 0) return "Due today";
  return `${sla.daysLeft} day${sla.daysLeft === 1 ? "" : "s"} left`;
}
