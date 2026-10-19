"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createApplication } from "@/app/admin/actions/membership";
import { useAction } from "@/components/admin/use-action";
import { Button } from "@/components/admin/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/admin/ui/card";
import { Checkbox, Field, fieldA11y, Input, NativeSelect, Textarea } from "@/components/admin/ui/form";

export function PaperApplicationForm({ today }: { today: string }) {
  const router = useRouter();
  const { run, pending, fieldErrors: fe } = useAction<{ id: string }>();
  const [relationship, setRelationship] = useState("spouse");
  const f = (name: string) => ({ ...fieldA11y(name, fe[name]), name });

  return (
    <form
      noValidate
      className="space-y-6"
      onSubmit={async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.currentTarget));
        await run(createApplication, { ...data, consentsConfirmed: data.consentsConfirmed === "on" }, {
          onSuccess: (r) => r.data && router.push(`/admin/membership/members/${r.data.id}`),
        });
      }}
    >
      <Card>
        <CardHeader>
          <CardTitle>Applicant</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field id="fullName" label="Full name" required error={fe.fullName} className="md:col-span-2">
            <Input {...f("fullName")} required />
          </Field>
          <Field id="dateOfBirth" label="Date of birth" required error={fe.dateOfBirth}>
            <Input {...f("dateOfBirth")} type="date" max={today} required />
          </Field>
          <Field id="mobile" label="Mobile" required error={fe.mobile}>
            <Input {...f("mobile")} inputMode="tel" required />
          </Field>
          <Field id="email" label="Email (optional)" error={fe.email}>
            <Input {...f("email")} type="email" />
          </Field>
          <Field id="district" label="District" required error={fe.district}>
            <Input {...f("district")} required />
          </Field>
          <Field id="address" label="Residential address" required error={fe.address} className="md:col-span-2">
            <Textarea {...f("address")} rows={2} required />
          </Field>
          <Field id="pinCode" label="PIN code" required error={fe.pinCode}>
            <Input {...f("pinCode")} inputMode="numeric" maxLength={6} required />
          </Field>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Nominee</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field id="nomineeName" label="Nominee name" required error={fe.nomineeName} className="md:col-span-2">
            <Input {...f("nomineeName")} required />
          </Field>
          <Field id="nomineeRelationship" label="Relationship" required error={fe.nomineeRelationship}>
            <NativeSelect {...f("nomineeRelationship")} value={relationship} onChange={(e) => setRelationship(e.target.value)}>
              {["spouse", "son", "daughter", "father", "mother", "brother", "sister", "other"].map((r) => (
                <option key={r} value={r}>
                  {r[0].toUpperCase() + r.slice(1)}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field id="nomineeMobile" label="Nominee mobile" required error={fe.nomineeMobile}>
            <Input {...f("nomineeMobile")} inputMode="tel" required />
          </Field>
          {relationship === "other" && (
            <Field id="nomineeRelationshipOther" label="Describe relationship" error={fe.nomineeRelationshipOther}>
              <Input {...f("nomineeRelationshipOther")} />
            </Field>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardContent className="space-y-2">
          <label className="flex items-start gap-2 text-sm">
            <Checkbox name="consentsConfirmed" className="mt-0.5" aria-describedby={fe.consentsConfirmed ? "consents-error" : undefined} />
            The signed paper form includes acceptance of the current membership terms, acknowledgement that the benefit is proposed and not guaranteed,
            consent to data use, and the nominee&apos;s consent. The paper form is filed securely.
          </label>
          {fe.consentsConfirmed && (
            <p id="consents-error" role="alert" className="text-xs font-medium text-danger">
              {fe.consentsConfirmed}
            </p>
          )}
        </CardContent>
      </Card>
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Saving…" : "Create application"}
      </Button>
    </form>
  );
}
