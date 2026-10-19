/**
 * Donation configuration.
 *
 * UPI: the QR image was supplied by the foundation (doc/scaner.jpeg → public/donate/hr-foundation-upi-qr.jpeg).
 * CLIENT TO CONFIRM that the UPI ID belongs to the foundation's own bank account before launch.
 *
 * Online gateway: not approved — keep `enabled: false`. Integrating a gateway (Razorpay, Cashfree, etc.)
 * is a separate feature requiring server-side verification and webhooks; see README "Future work".
 */
export const donation = {
  upi: {
    enabled: true,
    payeeName: "H R Foundation",
    upiId: "7702264242m@pnb",
    qrImage: "/donate/hr-foundation-upi-qr.jpeg",
    qrAlt: "UPI QR code for donations to H R Foundation. UPI ID 7702264242m@pnb.",
  },
  gateway: {
    enabled: false,
  },
  /** CLIENT TO CONFIRM: bank transfer details. null hides the section. */
  bankTransfer: null as null | { accountName: string; accountNumber: string; ifsc: string; bank: string; branch: string },
  /**
   * Tax-deduction status. Keep `approved: false` until an approval (e.g. under section 80G) is received
   * and verified. Do not change wording to imply a deduction is available before then.
   */
  taxDeduction: { approved: false },
} as const;
