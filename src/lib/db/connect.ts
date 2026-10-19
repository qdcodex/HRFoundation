import "server-only";
import mongoose from "mongoose";

/**
 * Cached Mongoose connection (survives hot reloads in development).
 *
 * Configure MONGODB_URI, e.g. mongodb://127.0.0.1:27017/hr_foundation (local) or a MongoDB Atlas URI.
 * Note: multi-document transactions need a replica set (Atlas provides one). Critical operations in
 * this codebase are written as single-document conditional updates plus unique indexes, so they stay
 * safe on a standalone server too.
 */
type Cache = { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
const globalForMongoose = globalThis as unknown as { __hrfMongoose?: Cache };
const cache: Cache = globalForMongoose.__hrfMongoose ?? { conn: null, promise: null };
globalForMongoose.__hrfMongoose = cache;

export class DatabaseNotConfiguredError extends Error {
  constructor() {
    super("MONGODB_URI is not set. Add it to .env.local — see README.");
  }
}

export function isDatabaseConfigured() {
  return Boolean(process.env.MONGODB_URI);
}

export async function connectDb() {
  if (cache.conn) return cache.conn;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new DatabaseNotConfiguredError();
  if (!cache.promise) {
    mongoose.set("strictQuery", true);
    cache.promise = mongoose.connect(uri, {
      serverSelectionTimeoutMS: 8000,
      maxPoolSize: 10,
      autoIndex: process.env.NODE_ENV !== "production",
    });
  }
  try {
    cache.conn = await cache.promise;
  } catch (error) {
    cache.promise = null;
    throw error;
  }
  return cache.conn;
}
