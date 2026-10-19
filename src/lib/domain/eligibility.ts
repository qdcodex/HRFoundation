import type { MembershipRules } from "@/lib/settings";
import { addMonthsClamped, ageOn, compareDates, formatLong, parseIsoDate, toIso, type CalendarDate } from "@/lib/waiting-period";

/**
 * Waiting-period tracker and claim eligibility — pure functions, shared by the dashboard,
 * the tracker, reports and claim review. They inform staff; they never approve anything.
 */

export type TrackerStatus = "in_progress" | "completed" | "not_eligible" | "inactive" | "requires_review";
export const TRACKER_LABELS: Record<TrackerStatus, string> = {
  in_progress: "Waiting Period in Progress",
  completed: "Waiting Period Completed",
  not_eligible: "Not Eligible",
  inactive: "Membership Inactive",
  requires_review: "Requires Review",
};

type MemberLike = {
  status: string;
  dateOfBirth: string;
  effectiveDate?: string | null;
  requiresReview?: boolean;
};

export type TrackerResult = {
  status: TrackerStatus;
  reason: string;
  effective: string | null;
  completes: string | null;
  daysRemaining: number | null;
  age: number | null;
  ageEligible: boolean | null;
};

function days(from: CalendarDate, to: CalendarDate) {
  return Math.round((Date.UTC(to.year, to.month - 1, to.day) - Date.UTC(from.year, from.month - 1, from.day)) / 86_400_000);
}

export function trackWaitingPeriod(member: MemberLike, rules: MembershipRules, today: CalendarDate): TrackerResult {
  const dob = parseIsoDate(member.dateOfBirth);
  const age = dob ? ageOn(dob, today) : null;
  const ageEligible = age === null ? null : age < rules.benefitAgeLimit;
  const effective = member.effectiveDate ? parseIsoDate(member.effectiveDate) : null;
  const completes = effective ? addMonthsClamped(effective, rules.waitingPeriodMonths) : null;
  const base = {
    effective: effective ? toIso(effective) : null,
    completes: completes ? toIso(completes) : null,
    age,
    ageEligible,
  };

  if (member.requiresReview) return { ...base, status: "requires_review", reason: "Flagged for review by staff.", daysRemaining: null };
  if (member.status !== "active") {
    return { ...base, status: "inactive", reason: `Membership status is ${member.status.replace(/_/g, " ")}.`, daysRemaining: null };
  }
  if (!effective || !completes || !dob) {
    return { ...base, status: "requires_review", reason: "Effective date or date of birth is missing or invalid.", daysRemaining: null };
  }
  if (!ageEligible) {
    return { ...base, status: "not_eligible", reason: `Member is ${age}, at or above the age limit of ${rules.benefitAgeLimit}.`, daysRemaining: null };
  }
  if (compareDates(today, completes) >= 0) {
    return { ...base, status: "completed", reason: `Completed on ${formatLong(completes)}.`, daysRemaining: 0 };
  }
  const remaining = days(today, completes);
  return { ...base, status: "in_progress", reason: `${remaining} days remaining.`, daysRemaining: remaining };
}

export type EligibilityCheck = { key: string; label: string; passed: boolean; detail: string };

/**
 * Checks a claim against the approved conditions as of the date of death.
 * All checks must pass before an approval can be recorded — and a person must still decide.
 */
export function evaluateClaimEligibility(
  member: MemberLike & { verifiedPaymentCount: number },
  dateOfDeathIso: string,
  rules: MembershipRules,
): EligibilityCheck[] {
  const checks: EligibilityCheck[] = [];
  const dod = parseIsoDate(dateOfDeathIso);
  const dob = parseIsoDate(member.dateOfBirth);
  const effective = member.effectiveDate ? parseIsoDate(member.effectiveDate) : null;

  checks.push({
    key: "scheme",
    label: "Scheme formally approved",
    passed: rules.schemeApproved,
    detail: rules.schemeApproved ? "Membership rules mark the scheme as approved." : "The scheme is still marked as proposed in Membership Rules.",
  });
  checks.push({
    key: "active",
    label: "Membership active",
    passed: member.status === "active",
    detail: `Current status: ${member.status.replace(/_/g, " ")}.`,
  });
  checks.push({
    key: "payment",
    label: "Verified membership payment on record",
    passed: member.verifiedPaymentCount > 0,
    detail: `${member.verifiedPaymentCount} verified payment(s).`,
  });

  if (!dod || !effective) {
    checks.push({ key: "waiting", label: "Waiting period completed before date of death", passed: false, detail: "Effective date or date of death missing." });
  } else {
    const completes = addMonthsClamped(effective, rules.waitingPeriodMonths);
    const ok = compareDates(dod, completes) >= 0;
    checks.push({
      key: "waiting",
      label: "Waiting period completed before date of death",
      passed: ok,
      detail: `Effective ${formatLong(effective)}; waiting period ${ok ? "completed" : "would complete"} on ${formatLong(completes)}; date of death ${formatLong(dod)}.`,
    });
    if (compareDates(dod, effective) < 0) {
      checks.push({ key: "dates", label: "Date of death after effective date", passed: false, detail: "Date of death is before the membership became effective." });
    }
  }

  if (!dob || !dod) {
    checks.push({ key: "age", label: `Under ${rules.benefitAgeLimit} at date of death`, passed: false, detail: "Date of birth or date of death missing." });
  } else {
    const age = ageOn(dob, dod);
    checks.push({
      key: "age",
      label: `Under ${rules.benefitAgeLimit} at date of death`,
      passed: age < rules.benefitAgeLimit,
      detail: `Age at date of death: ${age}.`,
    });
  }

  checks.push({
    key: "review",
    label: "No open review flag on the member",
    passed: !member.requiresReview,
    detail: member.requiresReview ? "Member is flagged as requiring review." : "No flag.",
  });
  return checks;
}
