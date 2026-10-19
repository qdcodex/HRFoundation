"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { ActionResult } from "@/lib/actions";

/**
 * Runs a server action, shows a toast with the real outcome (only after the server confirms),
 * exposes field errors for inline display, and refreshes server data on success.
 */
export function useAction<T = undefined>() {
  const [pending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const router = useRouter();

  function run<R = T>(action: (input: unknown) => Promise<ActionResult<R>>, input: unknown, opts: { onSuccess?: (r: Extract<ActionResult<R>, { ok: true }>) => void } = {}) {
    setFieldErrors({});
    return new Promise<ActionResult<R>>((resolve) => {
      startTransition(async () => {
        let result: ActionResult<R>;
        try {
          result = await action(input);
        } catch {
          result = { ok: false, error: "Could not reach the server. Nothing was changed." };
        }
        if (result.ok) {
          toast.success(result.message ?? "Saved.");
          opts.onSuccess?.(result);
          router.refresh();
        } else {
          setFieldErrors(result.fieldErrors ?? {});
          toast.error(result.error);
        }
        resolve(result);
      });
    });
  }

  return { run, pending, fieldErrors, setFieldErrors };
}
