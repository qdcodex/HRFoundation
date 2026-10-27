import "server-only";
import { Schema, type Types } from "mongoose";
import { defineModel } from "./auth";
import { NoteSchema, type INote } from "./membership";

/* ---------- Contact & volunteer enquiries ---------- */

export const ENQUIRY_STATUSES = ["new", "in_progress", "responded", "closed"] as const;
export type EnquiryStatus = (typeof ENQUIRY_STATUSES)[number];
export const ENQUIRY_STATUS_LABELS: Record<EnquiryStatus, string> = {
  new: "New",
  in_progress: "In Progress",
  responded: "Responded",
  closed: "Closed",
};

export interface IEnquiry {
  _id: Types.ObjectId;
  reference: string;
  kind: "contact" | "volunteer" | "partnership" | "other";
  name: string;
  email?: string;
  phone?: string;
  subject: string;
  message: string;
  organisation?: string;
  city?: string;
  interests: string[];
  status: EnquiryStatus;
  assignedTo?: Types.ObjectId | null;
  assignedToName?: string | null;
  notes: INote[];
  createdAt: Date;
  updatedAt: Date;
}
const EnquirySchema = new Schema<IEnquiry>(
  {
    reference: { type: String, required: true, unique: true },
    kind: { type: String, enum: ["contact", "volunteer", "partnership", "other"], required: true, index: true },
    name: { type: String, required: true, maxlength: 100 },
    email: { type: String, maxlength: 254 },
    phone: { type: String, maxlength: 15 },
    subject: { type: String, required: true, maxlength: 120 },
    message: { type: String, required: true, maxlength: 2000 },
    organisation: { type: String, maxlength: 150 },
    city: { type: String, maxlength: 80 },
    interests: { type: [String], default: [] },
    status: { type: String, enum: ENQUIRY_STATUSES, default: "new", index: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: "AdminUser", default: null },
    assignedToName: { type: String, default: null },
    notes: { type: [NoteSchema], default: [] },
  },
  { timestamps: true },
);
EnquirySchema.index({ createdAt: -1 });

/* ---------- Settings (single documents keyed by name) ---------- */

export interface ISetting {
  _id: "website" | "membershipRules" | "notifications" | "taxExemption";
  value: Record<string, unknown>;
  updatedBy?: Types.ObjectId | null;
  updatedByName?: string | null;
  updatedAt: Date;
}
const SettingSchema = new Schema<ISetting>(
  {
    _id: { type: String },
    value: { type: Schema.Types.Mixed, default: {} },
    updatedBy: { type: Schema.Types.ObjectId, ref: "AdminUser", default: null },
    updatedByName: { type: String, default: null },
  },
  { timestamps: { createdAt: false, updatedAt: true }, minimize: false },
);

/* ---------- Notifications (delivery log) ---------- */

export interface INotification {
  _id: Types.ObjectId;
  event: string;
  channel: "email";
  to: string;
  subject: string;
  body: string;
  status: "sent" | "failed" | "skipped";
  error?: string | null;
  related?: { entity: string; id: string } | null;
  createdAt: Date;
}
const NotificationSchema = new Schema<INotification>(
  {
    event: { type: String, required: true, index: true },
    channel: { type: String, enum: ["email"], default: "email" },
    to: { type: String, required: true },
    subject: { type: String, required: true },
    body: { type: String, required: true },
    status: { type: String, enum: ["sent", "failed", "skipped"], required: true },
    error: { type: String, default: null },
    related: { type: { entity: String, id: String, _id: false }, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
NotificationSchema.index({ createdAt: -1 });

/* ---------- Audit log (append-only) ---------- */

export interface IAuditLog {
  _id: Types.ObjectId;
  at: Date;
  actorId?: Types.ObjectId | null;
  actorName: string;
  actorEmail?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  summary: string;
  details?: Record<string, unknown> | null;
  ip?: string | null;
}
const AuditLogSchema = new Schema<IAuditLog>({
  at: { type: Date, default: Date.now, index: -1 },
  actorId: { type: Schema.Types.ObjectId, ref: "AdminUser", default: null },
  actorName: { type: String, required: true },
  actorEmail: { type: String, default: null },
  action: { type: String, required: true, index: true },
  entityType: { type: String, required: true },
  entityId: { type: String, default: null },
  summary: { type: String, required: true, maxlength: 500 },
  details: { type: Schema.Types.Mixed, default: null },
  ip: { type: String, default: null },
});
AuditLogSchema.index({ entityType: 1, entityId: 1, at: -1 });

export const Enquiry = defineModel<IEnquiry>("Enquiry", EnquirySchema);
export const Setting = defineModel<ISetting>("Setting", SettingSchema);
export const Notification = defineModel<INotification>("Notification", NotificationSchema);
export const AuditLog = defineModel<IAuditLog>("AuditLog", AuditLogSchema);
