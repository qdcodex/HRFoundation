/** Error helpers shared by server actions and domain code (no auth or framework imports). */

/** Thrown for expected, user-facing failures (invalid state, duplicates, rules). */
export class ActionError extends Error {
  constructor(
    message: string,
    readonly fieldErrors?: Record<string, string>,
  ) {
    super(message);
  }
}

export function isDuplicateKey(error: unknown): error is { code: 11000; keyValue?: Record<string, unknown> } {
  return typeof error === "object" && error !== null && (error as { code?: number }).code === 11000;
}
