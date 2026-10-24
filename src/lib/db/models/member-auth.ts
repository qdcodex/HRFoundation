import "server-only";
import { Schema, type Types } from "mongoose";
import { defineModel } from "./auth";

/** Member portal sessions. Kept apart from admin sessions so the two can never be confused. */
export interface IMemberSession {
  _id: Types.ObjectId;
  tokenHash: string;
  memberId: Types.ObjectId;
  expiresAt: Date;
  lastSeenAt: Date;
  ip?: string;
  userAgent?: string;
  createdAt: Date;
}

const MemberSessionSchema = new Schema<IMemberSession>(
  {
    tokenHash: { type: String, required: true, unique: true },
    memberId: { type: Schema.Types.ObjectId, ref: "Member", required: true, index: true },
    expiresAt: { type: Date, required: true },
    lastSeenAt: { type: Date, required: true },
    ip: String,
    userAgent: { type: String, maxlength: 300 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
MemberSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const MemberSession = defineModel<IMemberSession>("MemberSession", MemberSessionSchema);
