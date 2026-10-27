import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/**
 * Unguessable links for documents sent to people who do not sign in (e.g. a donor's receipt).
 * Key: LINK_SIGNING_SECRET, or — if not set — a key derived from MONGODB_URI, which only the server knows.
 */
function key() {
  return process.env.LINK_SIGNING_SECRET || createHash("sha256").update(`hrf-links:${process.env.MONGODB_URI ?? ""}`).digest("hex");
}

export function signLink(purpose: string, id: string) {
  return createHmac("sha256", key()).update(`${purpose}:${id}`).digest("hex").slice(0, 40);
}

export function verifyLink(purpose: string, id: string, token: string) {
  if (!/^[a-f0-9]{40}$/.test(token)) return false;
  const a = Buffer.from(signLink(purpose, id));
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}
