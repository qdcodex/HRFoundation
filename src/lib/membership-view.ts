import { formatPaise } from "./money";

/** Plain, client-safe view of the membership rules used by public pages and forms. */
export type MembershipView = {
  schemeApproved: boolean;
  registrationOpen: boolean;
  feeLabel: string | null;
  waitingPeriodMonths: number;
  maxBenefit: string;
  benefitAgeLimit: number;
  minApplicantAge: number;
  termsVersion: string;
};

export function toMembershipView(r: {
  schemeApproved: boolean;
  registrationOpen: boolean;
  feePaise: number | null;
  feePeriod: string;
  waitingPeriodMonths: number;
  maxBenefitPaise: number;
  benefitAgeLimit: number;
  minApplicantAge: number;
  termsVersion: string;
}): MembershipView {
  return {
    schemeApproved: r.schemeApproved,
    registrationOpen: r.registrationOpen,
    feeLabel: r.feePaise ? `${formatPaise(r.feePaise)}${r.feePeriod ? ` ${r.feePeriod}` : ""}` : null,
    waitingPeriodMonths: r.waitingPeriodMonths,
    maxBenefit: formatPaise(r.maxBenefitPaise),
    benefitAgeLimit: r.benefitAgeLimit,
    minApplicantAge: r.minApplicantAge,
    termsVersion: r.termsVersion,
  };
}
