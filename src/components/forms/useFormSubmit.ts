"use client";

import { useState } from "react";
import type { FieldValues, Path, UseFormSetError } from "react-hook-form";

export type SubmitState =
  | { kind: "idle" }
  | { kind: "error"; message: string }
  | { kind: "success"; reference: string; delivered: boolean };

/** POSTs JSON to a route handler and maps server-side validation errors back onto fields. */
export function useFormSubmit<T extends FieldValues>(endpoint: string, setError: UseFormSetError<T>) {
  const [state, setState] = useState<SubmitState>({ kind: "idle" });

  async function submit(values: unknown) {
    setState({ kind: "idle" });
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
        reference?: string;
        delivered?: boolean;
        errors?: Record<string, string>;
      };
      if (res.ok && data.ok) {
        setState({ kind: "success", reference: data.reference ?? "", delivered: Boolean(data.delivered) });
        return true;
      }
      if (data.errors) {
        for (const [field, message] of Object.entries(data.errors)) setError(field as Path<T>, { type: "server", message });
      }
      setState({ kind: "error", message: data.message ?? "Something went wrong. Please try again." });
    } catch {
      setState({ kind: "error", message: "We could not reach the server. Please check your connection and try again." });
    }
    return false;
  }

  return { state, setState, submit };
}
