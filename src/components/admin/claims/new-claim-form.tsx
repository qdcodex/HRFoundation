"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClaim } from "@/app/admin/actions/claims";
import { useAction } from "@/components/admin/use-action";
import { Button } from "@/components/admin/ui/button";
import { Card, CardContent } from "@/components/admin/ui/card";
import { Checkbox, Field, fieldA11y, Input, NativeSelect } from "@/components/admin/ui/form";

export function NewClaimForm({ today, defaultMembershipId }: { today: string; defaultMembershipId?: string }) {
  const router = useRouter();
  const [useNominee, setUseNominee] = useState(true);
  const { run, pending, fieldErrors: fe } = useAction<{ id: string }>();
  const f = (name: string) => ({ ...fieldA11y(name, fe[name]), name });
  return (
    <form
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.currentTarget));
        await run(createClaim, { ...data, useNominee }, { onSuccess: (r) => r.data && router.push(`/admin/claims/${r.data.id}`) });
      }}
    >
      <Card>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field id="membershipId" label="Membership ID" required error={fe.membershipId} hint="e.g. HRF-M-2026-00001">
            <Input {...f("membershipId")} defaultValue={defaultMembershipId} required className="font-mono uppercase" />
          </Field>
          <Field id="dateOfDeath" label="Date of death" required error={fe.dateOfDeath}>
            <Input {...f("dateOfDeath")} type="date" max={today} required />
          </Field>
          <Field id="receivedVia" label="Claim received" required error={fe.receivedVia}>
            <NativeSelect {...f("receivedVia")} defaultValue="in_person">
              <option value="in_person">In person</option>
              <option value="post">By post</option>
              <option value="email">By email</option>
              <option value="phone">By phone (follow-up required)</option>
            </NativeSelect>
          </Field>
          <Field id="requestedAmount" label="Requested amount (₹, optional)" error={fe.requestedAmount}>
            <Input {...f("requestedAmount")} inputMode="decimal" />
          </Field>
          <label className="flex items-start gap-2 text-sm md:col-span-2">
            <Checkbox checked={useNominee} onChange={(e) => setUseNominee(e.target.checked)} className="mt-0.5" />
            The claimant is the nominee on record (details are copied from the member&apos;s nominee).
          </label>
          {!useNominee && (
            <>
              <Field id="claimantName" label="Claimant name" required error={fe.claimantName}>
                <Input {...f("claimantName")} />
              </Field>
              <Field id="claimantRelationship" label="Relationship to member" required error={fe.claimantRelationship}>
                <Input {...f("claimantRelationship")} />
              </Field>
              <Field id="claimantMobile" label="Claimant mobile" required error={fe.claimantMobile}>
                <Input {...f("claimantMobile")} inputMode="tel" />
              </Field>
            </>
          )}
          <Field id="claimantEmail" label="Claimant email (optional, for notifications)" error={fe.claimantEmail}>
            <Input {...f("claimantEmail")} type="email" />
          </Field>
        </CardContent>
      </Card>
      <Button type="submit" size="lg" className="mt-6" disabled={pending}>
        {pending ? "Saving…" : "Record claim"}
      </Button>
    </form>
  );
}
