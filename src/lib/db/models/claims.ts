import "server-only";
import { Schema, type Types } from "mongoose";
import { defineModel } from "./auth";
import { NoteSchema, type INote } from "./membership";

export const CLAIM_STATUSES = [
  "submitted",
  "under_review",
  "info_required",
  "approved",
  "rejected",
  "payment_pending",
  "paid",
  "closed",
] as const;
export type ClaimStatus = (typeof CLAIM_STATUSES)[number];
export const CLAIM_STATUS_LABELS: Record<ClaimStatus, string> = {
  submitted: "Submitted",
  under_review: "Under Review",
  info_required: "Additional Information Required",
  approved: "Approved",
  rejected: "Rejected",
  payment_pending: "Payment Pending",
  paid: "Paid",
  closed: "Closed",
};

export interface IEligibilityCheck {
  key: string;
  label: string;
  passed: boolean;
  detail: string;
}

export interface IClaim {
  _id: Types.ObjectId;
  reference: string;
  memberId: Types.ObjectId;
  membershipId: string;
  memberName: string;
  claimant: { name: string; relationship: string; mobile: string; email?: string | null; isNominee: boolean };
  dateOfDeath: string;
  receivedVia: "online" | "in_person" | "post" | "email" | "phone";
  submittedAt: Date;
  requestedAmountPaise?: number | null;
  status: ClaimStatus;
  assignedTo?: Types.ObjectId | null;
  assignedToName?: string | null;
  verificationNotes: INote[];
  infoRequests: { _id: Types.ObjectId; message: string; requestedBy: Types.ObjectId; requestedByName: string; at: Date; resolvedAt?: Date | null; resolutionNote?: string | null }[];
  recommendation?: { outcome: "approve" | "reject"; note: string; by: Types.ObjectId; byName: string; at: Date } | null;
  decision?: {
    outcome: "approved" | "rejected";
    reason: string;
    approvedAmountPaise?: number | null;
    maxAllowedPaise: number;
    eligibility: IEligibilityCheck[];
    by: Types.ObjectId;
    byName: string;
    at: Date;
  } | null;
  payment?: { reference: string; paidOn: string; method: string; amountPaise: number; recordedBy: Types.ObjectId; recordedByName: string; at: Date } | null;
  closedReason?: string | null;
  /** Null when the nominee submitted the claim online. */
  createdBy?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const ClaimSchema = new Schema<IClaim>(
  {
    reference: { type: String, required: true, unique: true },
    memberId: { type: Schema.Types.ObjectId, ref: "Member", required: true, index: true },
    membershipId: { type: String, required: true },
    memberName: { type: String, required: true },
    claimant: {
      name: { type: String, required: true, maxlength: 120 },
      relationship: { type: String, required: true, maxlength: 60 },
      mobile: { type: String, required: true, match: /^[6-9]\d{9}$/ },
      email: { type: String, default: null, maxlength: 254 },
      isNominee: { type: Boolean, default: true },
    },
    dateOfDeath: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    receivedVia: { type: String, enum: ["online", "in_person", "post", "email", "phone"], required: true },
    submittedAt: { type: Date, required: true, index: true },
    requestedAmountPaise: { type: Number, default: null },
    status: { type: String, enum: CLAIM_STATUSES, required: true, index: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: "AdminUser", default: null },
    assignedToName: { type: String, default: null },
    verificationNotes: { type: [NoteSchema], default: [] },
    infoRequests: {
      type: [
        {
          message: { type: String, required: true, maxlength: 1000 },
          requestedBy: { type: Schema.Types.ObjectId, ref: "AdminUser", required: true },
          requestedByName: String,
          at: { type: Date, default: Date.now },
          resolvedAt: { type: Date, default: null },
          resolutionNote: { type: String, default: null },
        },
      ],
      default: [],
    },
    recommendation: {
      type: { outcome: String, note: String, by: Schema.Types.ObjectId, byName: String, at: Date },
      default: null,
    },
    decision: {
      type: {
        outcome: String,
        reason: String,
        approvedAmountPaise: Number,
        maxAllowedPaise: Number,
        eligibility: [{ key: String, label: String, passed: Boolean, detail: String, _id: false }],
        by: Schema.Types.ObjectId,
        byName: String,
        at: Date,
      },
      default: null,
    },
    payment: {
      type: { reference: String, paidOn: String, method: String, amountPaise: Number, recordedBy: Schema.Types.ObjectId, recordedByName: String, at: Date },
      default: null,
    },
    closedReason: { type: String, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: "AdminUser", default: null },
  },
  { timestamps: true },
);
// Only one open claim per member at a time.
ClaimSchema.index(
  { memberId: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ["submitted", "under_review", "info_required", "approved", "payment_pending"] } }, name: "one_open_claim_per_member" },
);

/** Metadata for a private claim document. The file itself lives in the private GridFS bucket. */
export interface IClaimDocument {
  _id: Types.ObjectId;
  claimId: Types.ObjectId;
  fileId: Types.ObjectId;
  kind: string;
  originalName: string;
  mime: string;
  size: number;
  sha256: string;
  /** Null when uploaded by the nominee through the website. */
  uploadedBy?: Types.ObjectId | null;
  uploadedByName: string;
  createdAt: Date;
}
const ClaimDocumentSchema = new Schema<IClaimDocument>(
  {
    claimId: { type: Schema.Types.ObjectId, ref: "Claim", required: true, index: true },
    fileId: { type: Schema.Types.ObjectId, required: true },
    kind: { type: String, required: true, maxlength: 60 },
    originalName: { type: String, required: true, maxlength: 200 },
    mime: { type: String, required: true },
    size: { type: Number, required: true },
    sha256: { type: String, required: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "AdminUser", default: null },
    uploadedByName: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const Claim = defineModel<IClaim>("Claim", ClaimSchema);
export const ClaimDocument = defineModel<IClaimDocument>("ClaimDocument", ClaimDocumentSchema);
