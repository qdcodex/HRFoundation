import "server-only";
import { Schema, type Types } from "mongoose";
import { defineModel } from "./auth";

export const MEMBER_STATUSES = [
  "draft",
  "pending_payment",
  "payment_verification",
  "pending_approval",
  "active",
  "rejected",
  "suspended",
] as const;
export type MemberStatus = (typeof MEMBER_STATUSES)[number];

export const MEMBER_STATUS_LABELS: Record<MemberStatus, string> = {
  draft: "Draft",
  pending_payment: "Pending Payment",
  payment_verification: "Payment Verification Pending",
  pending_approval: "Pending Approval",
  active: "Active",
  rejected: "Rejected",
  suspended: "Suspended",
};

export interface INote {
  _id: Types.ObjectId;
  text: string;
  by: Types.ObjectId;
  byName: string;
  at: Date;
}
export const NoteSchema = new Schema<INote>({
  text: { type: String, required: true, maxlength: 2000 },
  by: { type: Schema.Types.ObjectId, ref: "AdminUser", required: true },
  byName: { type: String, required: true },
  at: { type: Date, default: Date.now },
});

/**
 * A membership application and, once activated, the membership itself.
 * One document follows the whole lifecycle so status changes are single atomic updates.
 * Calendar dates (dateOfBirth, effectiveDate) are stored as "YYYY-MM-DD" strings to avoid timezone drift.
 */
export interface IMember {
  _id: Types.ObjectId;
  applicationRef: string;
  membershipId?: string | null;
  status: MemberStatus;
  fullName: string;
  dateOfBirth: string;
  mobile: string;
  email?: string;
  address: string;
  district: string;
  pinCode: string;
  termsVersion: string;
  consents: { terms: boolean; proposedScheme: boolean; data: boolean; nominee: boolean; at: Date };
  source: "website" | "admin";
  submittedAt: Date;
  effectiveDate?: string | null;
  activatedAt?: Date | null;
  activatedBy?: Types.ObjectId | null;
  statusReason?: string | null;
  statusChangedAt?: Date | null;
  requiresReview: boolean;
  reviewReason?: string | null;
  notes: INote[];
  createdAt: Date;
  updatedAt: Date;
}

const MemberSchema = new Schema<IMember>(
  {
    applicationRef: { type: String, required: true, unique: true },
    membershipId: { type: String, default: null },
    status: { type: String, enum: MEMBER_STATUSES, required: true, index: true },
    fullName: { type: String, required: true, trim: true, maxlength: 120 },
    dateOfBirth: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    mobile: { type: String, required: true, match: /^[6-9]\d{9}$/, index: true },
    email: { type: String, lowercase: true, trim: true, maxlength: 254 },
    address: { type: String, required: true, maxlength: 400 },
    district: { type: String, required: true, maxlength: 80 },
    pinCode: { type: String, required: true, match: /^[1-9]\d{5}$/ },
    termsVersion: { type: String, required: true },
    consents: {
      terms: Boolean,
      proposedScheme: Boolean,
      data: Boolean,
      nominee: Boolean,
      at: Date,
    },
    source: { type: String, enum: ["website", "admin"], default: "website" },
    submittedAt: { type: Date, required: true, index: true },
    effectiveDate: { type: String, default: null, index: true },
    activatedAt: { type: Date, default: null },
    activatedBy: { type: Schema.Types.ObjectId, ref: "AdminUser", default: null },
    statusReason: { type: String, default: null, maxlength: 1000 },
    statusChangedAt: { type: Date, default: null },
    requiresReview: { type: Boolean, default: false },
    reviewReason: { type: String, default: null, maxlength: 500 },
    notes: { type: [NoteSchema], default: [] },
  },
  { timestamps: true },
);
// A membership ID can only ever be assigned once.
MemberSchema.index({ membershipId: 1 }, { unique: true, partialFilterExpression: { membershipId: { $type: "string" } } });
MemberSchema.index({ fullName: 1 });

export const NOMINEE_RELATIONSHIPS = ["spouse", "son", "daughter", "father", "mother", "brother", "sister", "other"] as const;

/** Nominee details are kept in their own collection so they are only loaded when a role is allowed to see them. */
export interface INominee {
  _id: Types.ObjectId;
  memberId: Types.ObjectId;
  name: string;
  relationship: (typeof NOMINEE_RELATIONSHIPS)[number];
  relationshipOther?: string;
  mobile: string;
  updatedBy?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}
const NomineeSchema = new Schema<INominee>(
  {
    memberId: { type: Schema.Types.ObjectId, ref: "Member", required: true, unique: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    relationship: { type: String, enum: NOMINEE_RELATIONSHIPS, required: true },
    relationshipOther: { type: String, maxlength: 60 },
    mobile: { type: String, required: true, match: /^[6-9]\d{9}$/ },
    updatedBy: { type: Schema.Types.ObjectId, ref: "AdminUser", default: null },
  },
  { timestamps: true },
);

export const PAYMENT_METHODS = ["upi", "bank_transfer", "cash", "cheque"] as const;
export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  upi: "UPI",
  bank_transfer: "Bank transfer",
  cash: "Cash",
  cheque: "Cheque",
  gateway: "Online gateway",
};

export const MEMBERSHIP_PAYMENT_STATUSES = ["verification_pending", "verified", "rejected"] as const;
export type MembershipPaymentStatus = (typeof MEMBERSHIP_PAYMENT_STATUSES)[number];

export interface IMembershipPayment {
  _id: Types.ObjectId;
  memberId: Types.ObjectId;
  amountPaise: number;
  method: (typeof PAYMENT_METHODS)[number];
  transactionRef?: string | null;
  paidOn: string;
  status: MembershipPaymentStatus;
  recordedBy: Types.ObjectId;
  verifiedBy?: Types.ObjectId | null;
  verifiedAt?: Date | null;
  rejectionReason?: string | null;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}
const MembershipPaymentSchema = new Schema<IMembershipPayment>(
  {
    memberId: { type: Schema.Types.ObjectId, ref: "Member", required: true, index: true },
    amountPaise: { type: Number, required: true, min: 1, validate: Number.isInteger },
    method: { type: String, enum: PAYMENT_METHODS, required: true },
    transactionRef: { type: String, default: null, maxlength: 64 },
    paidOn: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    status: { type: String, enum: MEMBERSHIP_PAYMENT_STATUSES, default: "verification_pending", index: true },
    recordedBy: { type: Schema.Types.ObjectId, ref: "AdminUser", required: true },
    verifiedBy: { type: Schema.Types.ObjectId, ref: "AdminUser", default: null },
    verifiedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: null, maxlength: 500 },
    note: { type: String, maxlength: 500 },
  },
  { timestamps: true },
);

/**
 * Registry of external transaction references (UPI UTR, bank reference, cheque no.).
 * The unique key blocks the same reference being recorded twice — across donations and
 * membership payments — without needing a multi-document transaction.
 */
export interface ITransactionRef {
  _id: string; // `${method}:${normalisedRef}`
  kind: "donation" | "membership_payment";
  docId: Types.ObjectId;
  createdAt: Date;
}
const TransactionRefSchema = new Schema<ITransactionRef>(
  {
    _id: { type: String },
    kind: { type: String, enum: ["donation", "membership_payment"], required: true },
    docId: { type: Schema.Types.ObjectId, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const Member = defineModel<IMember>("Member", MemberSchema);
export const Nominee = defineModel<INominee>("Nominee", NomineeSchema);
export const MembershipPayment = defineModel<IMembershipPayment>("MembershipPayment", MembershipPaymentSchema);
export const TransactionRef = defineModel<ITransactionRef>("TransactionRef", TransactionRefSchema);

export function normaliseTxnRef(ref: string) {
  return ref.replace(/[\s-]/g, "").toUpperCase();
}
