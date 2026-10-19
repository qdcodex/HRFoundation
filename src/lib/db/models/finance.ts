import "server-only";
import { Schema, type Types } from "mongoose";
import { defineModel } from "./auth";
import { NoteSchema, type INote } from "./membership";

export const DONATION_STATUSES = ["pending", "verification_pending", "verified", "failed", "cancelled", "refunded"] as const;
export type DonationStatus = (typeof DONATION_STATUSES)[number];
export const DONATION_STATUS_LABELS: Record<DonationStatus, string> = {
  pending: "Pending",
  verification_pending: "Verification Pending",
  verified: "Verified",
  failed: "Failed",
  cancelled: "Cancelled",
  refunded: "Refunded",
};
export const DONATION_METHODS = ["upi", "bank_transfer", "cash", "cheque", "gateway"] as const;

export interface IDonation {
  _id: Types.ObjectId;
  reference: string;
  donorName?: string;
  donorEmail?: string;
  donorPhone?: string;
  donorAddress?: string;
  amountPaise: number;
  donatedOn: string;
  method: (typeof DONATION_METHODS)[number];
  transactionRef?: string | null;
  status: DonationStatus;
  /** "manual" = recorded by staff (UPI/bank/cash); "gateway" = reserved for a future verified gateway integration. */
  source: "manual" | "gateway";
  purpose?: string;
  statusReason?: string | null;
  recordedBy: Types.ObjectId;
  verifiedBy?: Types.ObjectId | null;
  verifiedAt?: Date | null;
  /** Staff confirmed the credit in the bank statement / UPI account (screenshots are never proof). */
  reconciliationNote?: string | null;
  notes: INote[];
  createdAt: Date;
  updatedAt: Date;
}

const DonationSchema = new Schema<IDonation>(
  {
    reference: { type: String, required: true, unique: true },
    donorName: { type: String, trim: true, maxlength: 120 },
    donorEmail: { type: String, lowercase: true, trim: true, maxlength: 254 },
    donorPhone: { type: String, maxlength: 15 },
    donorAddress: { type: String, maxlength: 300 },
    amountPaise: { type: Number, required: true, min: 1, validate: Number.isInteger },
    donatedOn: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/, index: true },
    method: { type: String, enum: DONATION_METHODS, required: true },
    transactionRef: { type: String, default: null, maxlength: 64 },
    status: { type: String, enum: DONATION_STATUSES, required: true, index: true },
    source: { type: String, enum: ["manual", "gateway"], default: "manual" },
    purpose: { type: String, maxlength: 120 },
    statusReason: { type: String, default: null, maxlength: 500 },
    recordedBy: { type: Schema.Types.ObjectId, ref: "AdminUser", required: true },
    verifiedBy: { type: Schema.Types.ObjectId, ref: "AdminUser", default: null },
    verifiedAt: { type: Date, default: null },
    reconciliationNote: { type: String, default: null, maxlength: 500 },
    notes: { type: [NoteSchema], default: [] },
  },
  { timestamps: true },
);
DonationSchema.index({ amountPaise: 1, donatedOn: 1 });

export const RECEIPT_STATUSES = ["issued", "cancelled"] as const;

/** Receipt issued to an individual donor for one verified donation. Details are snapshotted at issue time. */
export interface IDonationReceipt {
  _id: Types.ObjectId;
  receiptNumber: string;
  donationId: Types.ObjectId;
  status: (typeof RECEIPT_STATUSES)[number];
  donorName: string;
  donorAddress?: string;
  donorEmail?: string;
  amountPaise: number;
  donatedOn: string;
  method: string;
  transactionRef?: string | null;
  donationReference: string;
  issuedAt: Date;
  issuedBy: Types.ObjectId;
  issuedByName: string;
  cancelledAt?: Date | null;
  cancelledBy?: Types.ObjectId | null;
  cancelReason?: string | null;
  replacesReceiptId?: Types.ObjectId | null;
  emailStatus: "not_sent" | "sent" | "failed" | "not_configured";
  createdAt: Date;
  updatedAt: Date;
}
const DonationReceiptSchema = new Schema<IDonationReceipt>(
  {
    receiptNumber: { type: String, required: true, unique: true },
    donationId: { type: Schema.Types.ObjectId, ref: "Donation", required: true },
    status: { type: String, enum: RECEIPT_STATUSES, default: "issued" },
    donorName: { type: String, required: true },
    donorAddress: String,
    donorEmail: String,
    amountPaise: { type: Number, required: true },
    donatedOn: { type: String, required: true },
    method: { type: String, required: true },
    transactionRef: String,
    donationReference: { type: String, required: true },
    issuedAt: { type: Date, required: true },
    issuedBy: { type: Schema.Types.ObjectId, ref: "AdminUser", required: true },
    issuedByName: { type: String, required: true },
    cancelledAt: { type: Date, default: null },
    cancelledBy: { type: Schema.Types.ObjectId, ref: "AdminUser", default: null },
    cancelReason: { type: String, default: null, maxlength: 500 },
    replacesReceiptId: { type: Schema.Types.ObjectId, ref: "DonationReceipt", default: null },
    emailStatus: { type: String, enum: ["not_sent", "sent", "failed", "not_configured"], default: "not_sent" },
  },
  { timestamps: true },
);
// At most one *issued* (non-cancelled) receipt per donation.
DonationReceiptSchema.index({ donationId: 1 }, { unique: true, partialFilterExpression: { status: "issued" }, name: "one_issued_receipt_per_donation" });

/** Atomic sequence counters (receipt numbers, membership IDs). */
export interface ICounter {
  _id: string;
  seq: number;
}
const CounterSchema = new Schema<ICounter>({ _id: String, seq: { type: Number, default: 0 } });

export const Donation = defineModel<IDonation>("Donation", DonationSchema);
export const DonationReceipt = defineModel<IDonationReceipt>("DonationReceipt", DonationReceiptSchema);
export const Counter = defineModel<ICounter>("Counter", CounterSchema);

export async function nextSequence(key: string) {
  const doc = await Counter.findOneAndUpdate({ _id: key }, { $inc: { seq: 1 } }, { upsert: true, returnDocument: "after" }).lean();
  return doc!.seq;
}
