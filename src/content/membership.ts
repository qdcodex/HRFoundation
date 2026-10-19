/**
 * Membership scheme configuration.
 *
 * Values marked CLIENT-SPECIFIED come from the foundation's brief.
 * The scheme remains "proposed" until `schemeApproved` is set to true after the foundation
 * formally approves the rules, funding arrangements, legal status and disclaimers.
 */
export const membership = {
  /** Set to true only after formal approval of the scheme and its legal structure. */
  schemeApproved: false,

  /**
   * "interest": the form records an application/registration of interest. No payment is collected online.
   * Applications are reviewed manually and applicants are contacted directly.
   */
  registrationMode: "interest" as "interest" | "closed",

  /** CLIENT TO CONFIRM: membership fee and billing period. null shows "To be confirmed". */
  fee: null as null | { amountInr: number; period: string },

  /** CLIENT-SPECIFIED */
  waitingPeriodMonths: 6,
  /** CLIENT-SPECIFIED: maximum stated death-benefit support, in rupees. */
  maxBenefitInr: 200000,
  /** CLIENT-SPECIFIED: member must be under this age, subject to the approved rules. */
  benefitAgeLimit: 60,
  /** ASSUMPTION — CLIENT TO CONFIRM: minimum age to apply as a member. */
  minApplicantAge: 18,

  /** CLIENT TO CONFIRM: version/date of the terms shown at /membership/terms. */
  termsVersion: "Draft 1 — awaiting approval",
} as const;

export const formatInr = (amount: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);

/** Application lifecycle used by the (future) administration workflow and explained to applicants. */
export const applicationStates = [
  { key: "draft", label: "Draft", description: "Application started but not yet submitted." },
  { key: "pending_payment", label: "Pending payment", description: "Submitted; the approved membership fee is awaited." },
  {
    key: "payment_verification",
    label: "Payment verification pending",
    description: "The foundation is checking that the payment has been received.",
  },
  { key: "pending_approval", label: "Pending approval", description: "Details and payment verified; awaiting approval." },
  {
    key: "active",
    label: "Active",
    description: "Membership approved. A membership ID and effective date are issued and the waiting period begins.",
  },
] as const;

export const exceptionStates = [
  { key: "rejected", label: "Rejected", description: "The application did not meet the approved requirements." },
  { key: "suspended", label: "Suspended", description: "Membership is paused, for example when renewal is overdue." },
] as const;
