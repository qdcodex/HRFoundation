/**
 * Donation configuration.
 *
 * UPI: QR from the foundation's PNB BHIM UPI merchant standee (doc/new scan.pdf → public/donate/hr-foundation-upi-qr.png).
 * Merchant name "H R FOUNDATION", UPI ID 7702264242m@pnb.
 *
 * Online gateway (Razorpay): switched on automatically when RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are set
 * on the server (see src/lib/payments/razorpay.ts). `gateway.enabled` can force it off.
 */
export const donation = {
  upi: {
    enabled: true,
    payeeName: "H R Foundation",
    upiId: "7702264242m@pnb",
    qrImage: "/donate/hr-foundation-upi-qr.png",
    qrAlt: "BHIM UPI QR code for donations to H R Foundation (merchant H R FOUNDATION, UPI ID 7702264242m@pnb).",
  },
  gateway: {
    /** Set to false to hide online card/net-banking payments even when Razorpay keys are configured. */
    enabled: true,
    presetsInr: [500, 1000, 2000, 5000],
    minInr: 10,
    maxInr: 500000,
  },
  /** CLIENT TO CONFIRM: bank transfer details. null hides the section. */
  bankTransfer: null as null | { accountName: string; accountNumber: string; ifsc: string; bank: string; branch: string },
  // 12A/80G: managed in Admin → Settings → 12A & 80G (registration numbers + approval PDFs).
} as const;
