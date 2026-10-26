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

  /** CLIENT-SPECIFIED: ₹2,000 one-time membership fee. */
  fee: { amountInr: 2000, period: "one-time" } as null | { amountInr: number; period: string },

  /** CLIENT-SPECIFIED */
  waitingPeriodMonths: 6,
  /** CLIENT-SPECIFIED: maximum stated death-benefit support, in rupees. */
  maxBenefitInr: 200000,
  /** CLIENT-SPECIFIED: member must be under this age, subject to the approved rules. */
  benefitAgeLimit: 60,
  /** CLIENT-SPECIFIED: minimum age to apply as a member. */
  minApplicantAge: 18,

  /** CLIENT TO CONFIRM: version/date of the terms shown at /membership/terms. */
  termsVersion: "Draft 1 — awaiting approval",
} as const;

export const formatInr = (amount: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);

/** How joining works, as explained on the membership page. */
export const joiningSteps = [
  { key: "apply", label: "Apply online", description: "Fill in your details and your nominee's details. It takes about two minutes." },
  {
    key: "pay",
    label: "Pay the fee",
    description: "Pay the one-time fee securely with Razorpay — UPI, cards, net banking or wallets. You can also pay the foundation directly; it then verifies the payment.",
  },
  {
    key: "active",
    label: "Membership active",
    description: "As soon as an online payment succeeds you get your membership ID and certificate, and login details by email. The waiting period starts that day.",
  },
] as const;

export const exceptionStates = [
  { key: "rejected", label: "Rejected", description: "The application did not meet the approved requirements." },
  { key: "suspended", label: "Suspended", description: "Membership is paused, for example when renewal is overdue." },
] as const;
