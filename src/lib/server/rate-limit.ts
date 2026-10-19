import "server-only";
import { connectDb } from "@/lib/db/connect";
import { RateLimit } from "@/lib/db/models/auth";

/**
 * Fixed-window rate limit stored in MongoDB, so it holds across server instances and restarts.
 * Returns true when the action is allowed.
 */
export async function hit(key: string, limit: number, windowSeconds: number) {
  await connectDb();
  const now = new Date();
  // Start a fresh window if the previous one has expired.
  await RateLimit.deleteOne({ _id: key, expiresAt: { $lte: now } });
  try {
    const doc = await RateLimit.findOneAndUpdate(
      { _id: key },
      { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date(now.getTime() + windowSeconds * 1000) } },
      { upsert: true, returnDocument: "after" },
    ).lean();
    return (doc?.count ?? 1) <= limit;
  } catch {
    // Concurrent upsert race: treat as allowed once and let the next call count.
    return true;
  }
}

export async function peek(key: string) {
  await connectDb();
  const doc = await RateLimit.findOne({ _id: key, expiresAt: { $gt: new Date() } }).lean();
  return doc?.count ?? 0;
}

export async function clear(key: string) {
  await connectDb();
  await RateLimit.deleteOne({ _id: key });
}
