/** Client-safe labels (no server imports). */
export const PAYMENT_SUMMARY_LABELS = {
  verified: "Verified",
  verification_pending: "Verification pending",
  rejected: "Rejected",
  none: "No payment",
} as const;

export const MEMBER_STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "pending_payment", label: "Pending Payment" },
  { value: "payment_verification", label: "Payment Verification Pending" },
  { value: "pending_approval", label: "Pending Approval" },
  { value: "active", label: "Active" },
  { value: "rejected", label: "Rejected" },
  { value: "suspended", label: "Suspended" },
];

export const TRACKER_OPTIONS = [
  { value: "in_progress", label: "Waiting Period in Progress" },
  { value: "approaching", label: "Completing soon" },
  { value: "completed", label: "Waiting Period Completed" },
  { value: "not_eligible", label: "Not Eligible (age)" },
  { value: "inactive", label: "Membership Inactive" },
  { value: "requires_review", label: "Requires Review" },
];

export const PAYMENT_OPTIONS = Object.entries(PAYMENT_SUMMARY_LABELS).map(([value, label]) => ({ value, label }));
