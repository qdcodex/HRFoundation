import "server-only";
import { hit } from "./rate-limit";
import { ipFromRequest, sha256Hex } from "./request";

/** Helpers shared by the public form endpoints (/api/contact, /api/get-involved, /api/membership). */

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function createReference(prefix: string) {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  const random = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" })
    .format(new Date())
    .replaceAll("-", "");
  return `${prefix}-${date}-${random}`;
}

/**
 * Limits accepted submissions per form and client. Stored in MongoDB so limits hold across instances.
 * Call after validation succeeds so visitors correcting mistakes are not locked out.
 * The IP is hashed before storage.
 */
export async function rateLimit(request: Request, scope: string, limit = 5, windowSeconds = 600) {
  const ipHash = (await sha256Hex(ipFromRequest(request))).slice(0, 24);
  return hit(`form:${scope}:${ipHash}`, limit, windowSeconds);
}

export async function readJson(request: Request): Promise<unknown> {
  const type = request.headers.get("content-type") ?? "";
  if (!type.includes("application/json")) return null;
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > 20_000) return null;
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export function unavailable() {
  return json({ ok: false, message: "Online submissions are not available right now. Please contact the foundation directly." }, 503);
}
