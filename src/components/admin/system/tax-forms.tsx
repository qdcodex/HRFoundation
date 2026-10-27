"use client";

import { useState } from "react";
import { FileText, Trash2, Upload } from "lucide-react";
import { removeTaxCertificate, saveTaxDetails, uploadTaxCertificate } from "@/app/admin/actions/tax";
import { useAction } from "@/components/admin/use-action";
import { Badge } from "@/components/admin/ui/badge";
import { Button } from "@/components/admin/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/admin/ui/card";
import { ConfirmDialog } from "@/components/admin/ui/dialog";
import { Checkbox, Field, fieldA11y, Input } from "@/components/admin/ui/form";
import type { ActionResult } from "@/lib/actions";

type Reg = { number: string; validFrom: string; validTo: string; fileName: string | null; hasFile: boolean };

export function TaxDetailsForm({ value }: { value: { trustPan: string; reg12A: Reg; reg80G: Reg } }) {
  const { run, pending, fieldErrors: fe } = useAction();
  const f = (n: string) => ({ ...fieldA11y(n, fe[n]), name: n });
  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        void run(saveTaxDetails, Object.fromEntries(new FormData(e.currentTarget)));
      }}
    >
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Registration details</CardTitle>
            <CardDescription>Copy these exactly from the approval orders (Form 10AC / 10AD). They are printed on donation receipts once the 80G certificate is uploaded.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field id="trustPan" label="PAN of the trust" error={fe.trustPan} hint="Printed on 80G receipts.">
            <Input {...f("trustPan")} defaultValue={value.trustPan} placeholder="ABCDE1234F" maxLength={10} />
          </Field>
          <div className="hidden sm:block" />
          {(["reg12A", "reg80G"] as const).map((k) => (
            <fieldset key={k} className="space-y-3 rounded-lg border border-line p-4 sm:col-span-2">
              <legend className="px-1 text-sm font-semibold">{k === "reg12A" ? "12A (section 12AB) registration" : "80G approval"}</legend>
              <Field id={`${k}Number`} label="Registration / approval number" error={fe[`${k}Number`]}>
                <Input {...f(`${k}Number`)} defaultValue={value[k].number} />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field id={`${k}From`} label="Valid from" error={fe[`${k}From`]}>
                  <Input {...f(`${k}From`)} type="date" defaultValue={value[k].validFrom} />
                </Field>
                <Field id={`${k}To`} label="Valid to" error={fe[`${k}To`]}>
                  <Input {...f(`${k}To`)} type="date" defaultValue={value[k].validTo} />
                </Field>
              </div>
            </fieldset>
          ))}
        </CardContent>
      </Card>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save registration details"}
      </Button>
    </form>
  );
}

export function TaxCertificateCard({ kind, title, reg }: { kind: "reg12A" | "reg80G"; title: string; reg: Reg }) {
  const { run, pending, fieldErrors } = useAction();
  const [confirm, setConfirm] = useState(false);
  const active = Boolean(reg.number && reg.hasFile);
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>{title} certificate</CardTitle>
          <CardDescription>PDF of the official approval. Sent to donors with their receipt; never published on the website.</CardDescription>
        </div>
        <Badge tone={active ? "success" : "warning"}>{active ? "Active — sent to donors" : reg.hasFile ? "Add the number above" : "Not uploaded"}</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {reg.hasFile && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <FileText aria-hidden className="size-4" />
            <a href={`/admin/api/tax-certificates/${kind}`} target="_blank" rel="noopener" className="font-medium text-emerald-ink hover:underline">
              {reg.fileName ?? "Certificate.pdf"}
            </a>
            <ConfirmDialog
              trigger={
                <Button type="button" variant="outline" size="sm" disabled={pending}>
                  <Trash2 aria-hidden /> Remove
                </Button>
              }
              title={`Remove the ${title} certificate?`}
              description="Donors will no longer receive it with their receipts."
              confirmLabel="Remove"
              destructive
              onConfirm={() => void run(removeTaxCertificate, { kind })}
            />
          </div>
        )}
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            const formEl = e.currentTarget;
            const data = new FormData(formEl);
            data.set("kind", kind);
            const r = await run((() => uploadTaxCertificate(data)) as (i: unknown) => Promise<ActionResult>, null);
            if (r.ok) {
              formEl.reset();
              setConfirm(false);
            }
          }}
        >
          <Field id={`${kind}-file`} label={reg.hasFile ? "Replace with a new PDF" : "Upload PDF"} error={fieldErrors.file}>
            <Input id={`${kind}-file`} name="file" type="file" accept="application/pdf" required />
          </Field>
          <label className="flex items-start gap-2 text-sm">
            <Checkbox name="confirm" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} />
            <span>This is the official approval issued to H R Foundation by the Income Tax Department (not an application or acknowledgement).</span>
          </label>
          <Button type="submit" size="sm" disabled={pending || !confirm}>
            <Upload aria-hidden /> {pending ? "Uploading…" : "Upload certificate"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
