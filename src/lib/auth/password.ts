import "server-only";
import { hash, verify } from "@node-rs/argon2";
import { z } from "zod";

// Argon2id with OWASP-recommended parameters (19 MiB memory, 2 iterations).
const OPTIONS = { memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

export function hashPassword(password: string) {
  return hash(password, OPTIONS);
}

export async function verifyPassword(passwordHash: string, password: string) {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

/** A precomputed hash used to keep login timing similar when the email does not exist. */
let dummyHash: Promise<string> | null = null;
export function dummyVerify(password: string) {
  dummyHash ??= hashPassword("not-a-real-password-placeholder");
  return dummyHash.then((h) => verifyPassword(h, password));
}

export const passwordPolicy = z
  .string()
  .min(12, "Use at least 12 characters.")
  .max(128, "Use 128 characters or fewer.")
  .refine((v) => /[a-z]/.test(v) && /[A-Z]/.test(v), "Use both upper- and lower-case letters.")
  .refine((v) => /\d/.test(v), "Include at least one number.")
  .refine((v) => !/^(.)\1+$/.test(v), "Choose a less predictable password.");

export function generateTemporaryPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  let out = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
  // Guarantee policy compliance.
  out = out.slice(0, 15) + "Aa7";
  return out;
}
