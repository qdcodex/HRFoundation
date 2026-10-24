"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { FileUp, Loader2 } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";
import { FormStatus, SelectField, TextField } from "./FormField";

const KINDS = [
  { value: "Death certificate", label: "Death certificate" },
  { value: "Document requested by the foundation", label: "Document requested by the foundation" },
];

/** Lets the family add a document to an open claim from the member portal. */
export function ClaimDocumentUpload({ claimId }: { claimId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<{ kind: "idle" } | { kind: "error"; message: string } | { kind: "success"; title: string; body: string }>({ kind: "idle" });

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    data.set("claimId", claimId);
    const file = data.get("document");
    if (file instanceof File && file.size > 10 * 1024 * 1024) {
      setErrors({ document: "File is too large (max 10 MB)." });
      return;
    }
    setBusy(true);
    setErrors({});
    setStatus({ kind: "idle" });
    try {
      const res = await fetch("/api/member/documents", { method: "POST", body: data });
      const body = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string; errors?: Record<string, string> };
      if (res.ok && body.ok) {
        form.reset();
        setStatus({ kind: "success", title: "Document uploaded.", body: "The foundation has been told and will review it." });
        router.refresh();
      } else {
        setErrors(body.errors ?? {});
        setStatus({ kind: "error", message: body.message ?? "Something went wrong. Please try again." });
      }
    } catch {
      setStatus({ kind: "error", message: "We could not reach the server. Please check your connection and try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField label="Document type" name="kind" options={KINDS} placeholder="Choose a type" error={errors.kind} />
        <TextField
          label="File"
          name="document"
          type="file"
          accept="application/pdf,image/jpeg,image/png"
          hint="PDF, JPG or PNG, up to 10 MB."
          error={errors.document}
          required
        />
      </div>
      <FormStatus state={status} />
      <button type="submit" disabled={busy} className={buttonClasses("primary", "md")}>
        {busy ? <Loader2 aria-hidden className="size-4 animate-spin" /> : <FileUp aria-hidden className="size-4" />}
        {busy ? "Uploading…" : "Upload document"}
      </button>
    </form>
  );
}
