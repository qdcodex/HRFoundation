import "server-only";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { cache } from "react";
import type { Types } from "mongoose";
import { connectDb } from "@/lib/db/connect";
import { MemberSession } from "@/lib/db/models/member-auth";
import { Member, type IMember } from "@/lib/db/models/membership";
import { clientIp, randomToken, sha256Hex, userAgent } from "@/lib/server/request";

/**
 * Member portal sessions — same design as admin sessions (random token in an HttpOnly cookie,
 * only its SHA-256 hash in the database), with a shorter idle timeout because members often
 * use shared phones.
 */
export const MEMBER_COOKIE = process.env.NODE_ENV === "production" ? "__Host-hrf_member" : "hrf_member";
const IDLE_HOURS = 2;
const MAX_DAYS = 2;
const TOUCH_INTERVAL_MS = 5 * 60_000;

/** Members may sign in while active or suspended (to see their status); claims also need the account after a death. */
const PORTAL_STATUSES = ["active", "suspended"];

export async function createMemberSession(memberId: Types.ObjectId) {
  await connectDb();
  const token = randomToken();
  const now = new Date();
  await MemberSession.create({
    tokenHash: await sha256Hex(token),
    memberId,
    expiresAt: new Date(now.getTime() + IDLE_HOURS * 3600_000),
    lastSeenAt: now,
    ip: await clientIp(),
    userAgent: await userAgent(),
  });
  (await cookies()).set(MEMBER_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_DAYS * 86400,
  });
}

async function readMemberSession() {
  await connection();
  const token = (await cookies()).get(MEMBER_COOKIE)?.value;
  if (!token || token.length > 100) return null;
  await connectDb();
  const now = new Date();
  const session = await MemberSession.findOne({ tokenHash: await sha256Hex(token), expiresAt: { $gt: now } }).lean();
  if (!session) return null;
  const hardLimit = session.createdAt.getTime() + MAX_DAYS * 86400_000;
  if (now.getTime() > hardLimit) {
    await MemberSession.deleteOne({ _id: session._id });
    return null;
  }
  if (now.getTime() - session.lastSeenAt.getTime() > TOUCH_INTERVAL_MS) {
    const expiresAt = new Date(Math.min(now.getTime() + IDLE_HOURS * 3600_000, hardLimit));
    await MemberSession.updateOne({ _id: session._id }, { $set: { lastSeenAt: now, expiresAt } });
  }
  return session;
}

/** The signed-in member for this request, or null. Loaded fresh from the database every time. */
export const getMember = cache(async (): Promise<IMember | null> => {
  const session = await readMemberSession();
  if (!session) return null;
  const member = await Member.findById(session.memberId).lean<IMember>();
  if (!member || !member.membershipId || !PORTAL_STATUSES.includes(member.status)) return null;
  return member;
});

export async function destroyMemberSession() {
  const jar = await cookies();
  const token = jar.get(MEMBER_COOKIE)?.value;
  if (token) {
    await connectDb();
    await MemberSession.deleteOne({ tokenHash: await sha256Hex(token) });
  }
  jar.delete(MEMBER_COOKIE);
}

export async function destroyAllMemberSessions(memberId: Types.ObjectId | string, exceptCurrent = false) {
  await connectDb();
  const token = exceptCurrent ? (await cookies()).get(MEMBER_COOKIE)?.value : undefined;
  const keep = token ? await sha256Hex(token) : null;
  await MemberSession.deleteMany({ memberId, ...(keep ? { tokenHash: { $ne: keep } } : {}) });
}

export function canSignIn(status: string) {
  return PORTAL_STATUSES.includes(status);
}
