import "server-only";
import { z } from "zod";
import { authorize, AuthError, type AdminContext } from "@/lib/auth/dal";
import type { Permission } from "@/lib/auth/permissions";
import { DatabaseNotConfiguredError } from "@/lib/db/connect";

export type ActionResult<T = undefined> =
  | { ok: true; message?: string; data?: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

/** Thrown inside action bodies for expected, user-facing failures (invalid state, duplicates, rules). */
export class ActionError extends Error {
  constructor(
    message: string,
    readonly fieldErrors?: Record<string, string>,
  ) {
    super(message);
  }
}

export function zodFieldErrors(error: z.ZodError) {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/**
 * Standard server-action pipeline: authorise (server-side) → validate input with Zod → run → map errors.
 * The browser never decides permissions; it only sends input.
 */
export async function runAction<S extends z.ZodType, T = undefined>(
  permission: Permission | Permission[],
  schema: S,
  input: unknown,
  fn: (data: z.output<S>, admin: AdminContext) => Promise<ActionResult<T> | void>,
): Promise<ActionResult<T>> {
  try {
    const admin = await authorize(...(Array.isArray(permission) ? permission : [permission]));
    const parsed = schema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: "Please check the highlighted fields.", fieldErrors: zodFieldErrors(parsed.error) };
    }
    return (await fn(parsed.data, admin)) ?? { ok: true };
  } catch (error) {
    if (error instanceof AuthError || error instanceof ActionError) {
      return { ok: false, error: error.message, fieldErrors: error instanceof ActionError ? error.fieldErrors : undefined };
    }
    if (error instanceof DatabaseNotConfiguredError) return { ok: false, error: error.message };
    if (isDuplicateKey(error)) return { ok: false, error: "This record already exists (duplicate value)." };
    if (error instanceof Error && error.name === "ValidationError" && "errors" in error) {
      const fieldErrors: Record<string, string> = {};
      for (const [path, e] of Object.entries((error as unknown as { errors: Record<string, { message: string }> }).errors)) {
        fieldErrors[path.split(".").pop()!] = e.message.replace(/^Path `\w+` \(`.*?`, length \d+\) /, "Value ");
      }
      return { ok: false, error: "Some values are not valid.", fieldErrors };
    }
    console.error("[admin action]", error);
    return { ok: false, error: "Something went wrong. The change was not saved." };
  }
}

export function isDuplicateKey(error: unknown): error is { code: 11000; keyValue?: Record<string, unknown> } {
  return typeof error === "object" && error !== null && (error as { code?: number }).code === 11000;
}

/** Converts FormData into a plain object; repeated keys become arrays; checkboxes "on" → true. */
export function formToObject(form: FormData) {
  const out: Record<string, unknown> = {};
  for (const [key, raw] of form.entries()) {
    if (raw instanceof File) continue;
    const value = raw === "on" ? true : raw;
    if (key.endsWith("[]")) {
      const k = key.slice(0, -2);
      out[k] = [...((out[k] as unknown[]) ?? []), value];
    } else {
      out[key] = value;
    }
  }
  return out;
}
