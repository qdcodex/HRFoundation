import "server-only";
import mongoose, { Schema, type Model, type Types } from "mongoose";
import { ROLE_KEYS } from "@/lib/auth/permissions";

export interface IAdminUser {
  _id: Types.ObjectId;
  email: string;
  name: string;
  passwordHash: string;
  roles: string[];
  extraPermissions: string[];
  active: boolean;
  mustChangePassword: boolean;
  failedLoginCount: number;
  lockedUntil?: Date | null;
  lastLoginAt?: Date | null;
  passwordChangedAt?: Date | null;
  createdBy?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const AdminUserSchema = new Schema<IAdminUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    passwordHash: { type: String, required: true, select: false },
    roles: { type: [String], enum: ROLE_KEYS, default: [] },
    extraPermissions: { type: [String], default: [] },
    active: { type: Boolean, default: true },
    mustChangePassword: { type: Boolean, default: false },
    failedLoginCount: { type: Number, default: 0 },
    lockedUntil: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null },
    passwordChangedAt: { type: Date, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: "AdminUser", default: null },
  },
  { timestamps: true },
);

export interface ISession {
  _id: Types.ObjectId;
  tokenHash: string;
  userId: Types.ObjectId;
  expiresAt: Date;
  lastSeenAt: Date;
  ip?: string;
  userAgent?: string;
  createdAt: Date;
}

const SessionSchema = new Schema<ISession>(
  {
    tokenHash: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: "AdminUser", required: true, index: true },
    expiresAt: { type: Date, required: true },
    lastSeenAt: { type: Date, required: true },
    ip: String,
    userAgent: { type: String, maxlength: 300 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
// MongoDB removes expired sessions automatically.
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

/** Generic fixed-window rate-limit counter (login attempts, public forms). Expires automatically. */
export interface IRateLimit {
  _id: string; // e.g. "login:ip:1.2.3.4"
  count: number;
  expiresAt: Date;
}
const RateLimitSchema = new Schema<IRateLimit>({
  _id: { type: String },
  count: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true },
});
RateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export interface IPasswordResetToken {
  _id: Types.ObjectId;
  tokenHash: string;
  userId: Types.ObjectId;
  expiresAt: Date;
  usedAt?: Date | null;
}
const PasswordResetTokenSchema = new Schema<IPasswordResetToken>(
  {
    tokenHash: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: "AdminUser", required: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
  },
  { timestamps: true },
);
PasswordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

function model<T>(name: string, schema: Schema<T>): Model<T> {
  return (mongoose.models[name] as Model<T>) ?? mongoose.model<T>(name, schema);
}

export const AdminUser = model<IAdminUser>("AdminUser", AdminUserSchema);
export const Session = model<ISession>("Session", SessionSchema);
export const RateLimit = model<IRateLimit>("RateLimit", RateLimitSchema);
export const PasswordResetToken = model<IPasswordResetToken>("PasswordResetToken", PasswordResetTokenSchema);

export { model as defineModel };
