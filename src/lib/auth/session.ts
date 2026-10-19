import "server-only";
import { cookies } from "next/headers";
import { connection } from "next/server";
import type { Types } from "mongoose";
import { connectDb } from "@/lib/db/connect";
import { Session } from "@/lib/db/models/auth";
import { clientIp, randomToken, sha256Hex, userAgent } from "@/lib/server/request";

/**
 * Database-backed sessions.
 * - The browser holds only a random 256-bit token in an HttpOnly, SameSite=Lax cookie.
 * - The database stores a SHA-256 hash of the token, so a database leak does not expose live sessions.
 * - Sessions expire after IDLE_HOURS of inactivity and never last longer than MAX_DAYS.
 * - Logging out, deactivating a user or changing a password deletes their sessions.
 */
export const SESSION_COOKIE = process.env.NODE_ENV === "production" ? "__Host-hrf_admin" : "hrf_admin";
const IDLE_HOURS = 8;
const MAX_DAYS = 7;
const TOUCH_INTERVAL_MS = 5 * 60_000;

export async function createSession(userId: Types.ObjectId) {
  await connectDb();
  const token = randomToken();
  const now = new Date();
  await Session.create({
    tokenHash: await sha256Hex(token),
    userId,
    expiresAt: new Date(now.getTime() + IDLE_HOURS * 3600_000),
    lastSeenAt: now,
    ip: await clientIp(),
    userAgent: await userAgent(),
  });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_DAYS * 86400,
  });
}

/** Returns the session for the current request's cookie, sliding its idle expiry. */
export async function readSession() {
  await connection(); // session validity depends on the current time: always evaluate at request time
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || token.length > 100) return null;
  await connectDb();
  const now = new Date();
  const session = await Session.findOne({ tokenHash: await sha256Hex(token), expiresAt: { $gt: now } }).lean();
  if (!session) return null;

  const hardLimit = session.createdAt.getTime() + MAX_DAYS * 86400_000;
  if (now.getTime() > hardLimit) {
    await Session.deleteOne({ _id: session._id });
    return null;
  }
  if (now.getTime() - session.lastSeenAt.getTime() > TOUCH_INTERVAL_MS) {
    const expiresAt = new Date(Math.min(now.getTime() + IDLE_HOURS * 3600_000, hardLimit));
    await Session.updateOne({ _id: session._id }, { $set: { lastSeenAt: now, expiresAt } });
  }
  return session;
}

export async function destroyCurrentSession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await connectDb();
    await Session.deleteOne({ tokenHash: await sha256Hex(token) });
  }
  jar.delete(SESSION_COOKIE);
}

export async function destroyAllSessions(userId: Types.ObjectId | string, exceptCurrent = false) {
  await connectDb();
  if (exceptCurrent) {
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    const keep = token ? await sha256Hex(token) : null;
    await Session.deleteMany({ userId, ...(keep ? { tokenHash: { $ne: keep } } : {}) });
  } else {
    await Session.deleteMany({ userId });
  }
}
