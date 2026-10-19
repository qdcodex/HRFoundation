"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Copy, KeyRound } from "lucide-react";
import {
  addEnquiryNote,
  createUser,
  resetUserPassword,
  saveMembershipRules,
  saveNotificationSettings,
  saveWebsiteSettings,
  updateEnquiry,
  updateUser,
} from "@/app/admin/actions/system";
import { useAction } from "@/components/admin/use-action";
import { Badge } from "@/components/admin/ui/badge";
import { Button } from "@/components/admin/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/admin/ui/card";
import { ConfirmDialog } from "@/components/admin/ui/dialog";
import { Checkbox, Field, fieldA11y, Input, NativeSelect, Textarea } from "@/components/admin/ui/form";

/* ---------------- Enquiries ---------------- */

export function EnquiryControls({ id, status, assignedTo, staff }: { id: string; status: string; assignedTo: string; staff: { id: string; name: string }[] }) {
  const { run, pending } = useAction();
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field id="enq-status" label="Status">
        <NativeSelect id="enq-status" defaultValue={status} disabled={pending} onChange={(e) => run(updateEnquiry, { id, status: e.target.value })}>
          <option value="new">New</option>
          <option value="in_progress">In Progress</option>
          <option value="responded">Responded</option>
          <option value="closed">Closed</option>
        </NativeSelect>
      </Field>
      <Field id="enq-assign" label="Assigned to">
        <NativeSelect id="enq-assign" defaultValue={assignedTo} disabled={pending} onChange={(e) => run(updateEnquiry, { id, assignTo: e.target.value })}>
          <option value="">Unassigned</option>
          {staff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </NativeSelect>
      </Field>
    </div>
  );
}

export function EnquiryNoteForm({ id }: { id: string }) {
  const [text, setText] = useState("");
  const { run, pending } = useAction();
  return (
    <form
      className="space-y-2"
      onSubmit={async (e) => {
        e.preventDefault();
        const r = await run(addEnquiryNote, { id, text });
        if (r.ok) setText("");
      }}
    >
      <Field id="enq-note" label="Add internal note">
        <Textarea id="enq-note" value={text} onChange={(e) => setText(e.target.value)} rows={2} />
      </Field>
      <Button type="submit" size="sm" disabled={pending || text.trim().length < 2}>
        Add note
      </Button>
    </form>
  );
}

/* ---------------- Users ---------------- */

type RoleDef = { key: string; label: string; description: string };
type PermDef = { key: string; label: string };

function TempPassword({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div role="status" className="rounded-xl border border-gold/50 bg-gold-soft/40 p-4">
      <p className="text-sm font-semibold">Temporary password (shown once — share it securely, e.g. in person):</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <code className="rounded bg-white px-3 py-1.5 font-mono text-sm">{value}</code>
        <Button
          size="sm"
          variant="outline"
          onClick={async () => {
            await navigator.clipboard.writeText(value).catch(() => {});
            setCopied(true);
          }}
        >
          <Copy aria-hidden /> {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <p className="mt-2 text-xs text-muted">The user must choose a new password when they first sign in.</p>
    </div>
  );
}

export function UserForm({
  user,
  roles,
  permissions,
  isSelf,
}: {
  user: { id: string; name: string; email: string; roles: string[]; extraPermissions: string[]; active: boolean } | null;
  roles: RoleDef[];
  permissions: PermDef[];
  isSelf: boolean;
}) {
  const router = useRouter();
  const [temp, setTemp] = useState<string | null>(null);
  const [selectedRoles, setRoles] = useState<string[]>(user?.roles ?? []);
  const [extra, setExtra] = useState<string[]>(user?.extraPermissions ?? []);
  const [active, setActive] = useState(user?.active ?? true);
  const { run, pending, fieldErrors: fe } = useAction();

  return (
    <div className="space-y-6">
      {temp && <TempPassword value={temp} />}
      <form
        noValidate
        className="space-y-6"
        onSubmit={async (e) => {
          e.preventDefault();
          const data = Object.fromEntries(new FormData(e.currentTarget));
          const payload = { name: data.name, email: data.email, roles: selectedRoles, extraPermissions: extra };
          if (user) await run(updateUser, { ...payload, id: user.id, active });
          else {
            const r = await run(createUser, payload);
            if (r.ok && r.data) {
              setTemp(r.data.tempPassword);
              router.replace(`/admin/users/${r.data.id}`);
            }
          }
        }}
      >
        <Card>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Field id="name" label="Full name" required error={fe.name}>
              <Input {...fieldA11y("name", fe.name)} name="name" defaultValue={user?.name} />
            </Field>
            <Field id="email" label="Email (sign-in)" required error={fe.email}>
              <Input {...fieldA11y("email", fe.email)} name="email" type="email" defaultValue={user?.email} />
            </Field>
            {user && (
              <label className="flex items-center gap-2 text-sm md:col-span-2">
                <Checkbox checked={active} onChange={(e) => setActive(e.target.checked)} disabled={isSelf} /> Account active
                {isSelf && <span className="text-xs text-muted">(you cannot deactivate yourself)</span>}
              </label>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Roles</CardTitle>
              <CardDescription>Give each person only the access their work needs.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <fieldset aria-describedby={fe.roles ? "roles-error" : undefined}>
              <legend className="sr-only">Roles</legend>
              <div className="grid gap-3 md:grid-cols-2">
                {roles.map((r) => (
                  <label key={r.key} className="flex cursor-pointer gap-3 rounded-lg border border-line p-3 has-checked:border-forest has-checked:bg-sage/40">
                    <Checkbox
                      className="mt-0.5"
                      checked={selectedRoles.includes(r.key)}
                      onChange={(e) => setRoles((s) => (e.target.checked ? [...s, r.key] : s.filter((x) => x !== r.key)))}
                    />
                    <span>
                      <span className="block text-sm font-semibold">{r.label}</span>
                      <span className="block text-xs text-muted">{r.description}</span>
                    </span>
                  </label>
                ))}
              </div>
              {fe.roles && (
                <p id="roles-error" role="alert" className="mt-2 text-xs font-medium text-danger">
                  {fe.roles}
                </p>
              )}
            </fieldset>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Additional permissions (optional)</CardTitle>
              <CardDescription>Grant a specific permission without a whole role — for example, letting a Content Manager read membership records.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <fieldset>
              <legend className="sr-only">Additional permissions</legend>
              <div className="grid gap-2 md:grid-cols-2">
                {permissions.map((p) => (
                  <label key={p.key} className="flex items-start gap-2 text-sm">
                    <Checkbox className="mt-0.5" checked={extra.includes(p.key)} onChange={(e) => setExtra((s) => (e.target.checked ? [...s, p.key] : s.filter((x) => x !== p.key)))} />
                    <span>
                      {p.label} <code className="text-xs text-muted">{p.key}</code>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          </CardContent>
        </Card>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Saving…" : user ? "Save changes" : "Create administrator"}
        </Button>
      </form>
      {user && <ResetPassword id={user.id} onIssued={setTemp} />}
    </div>
  );
}

function ResetPassword({ id, onIssued }: { id: string; onIssued: (p: string) => void }) {
  const { run, pending } = useAction();
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Password</CardTitle>
          <CardDescription>Issue a temporary password if the user cannot reset it by email. Their existing sessions are signed out.</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <ConfirmDialog
          trigger={
            <Button variant="outline" disabled={pending}>
              <KeyRound aria-hidden /> Issue temporary password
            </Button>
          }
          title="Issue a temporary password?"
          description="The current password stops working immediately and the user is signed out everywhere."
          confirmLabel="Issue password"
          onConfirm={() => void run(resetUserPassword, { id }).then((r) => r.ok && r.data && onIssued(r.data.tempPassword))}
        />
      </CardContent>
    </Card>
  );
}

/* ---------------- Settings ---------------- */

export function WebsiteSettingsForm({ value }: { value: { phone: string; whatsapp: string; email: string; hours: string; enquiryInbox: string } }) {
  const { run, pending, fieldErrors: fe } = useAction();
  const f = (n: keyof typeof value) => ({ ...fieldA11y(n, fe[n]), name: n, defaultValue: value[n] });
  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        void run(saveWebsiteSettings, { ...Object.fromEntries(new FormData(e.currentTarget)), social: [] });
      }}
    >
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Public contact details</CardTitle>
            <CardDescription>Shown on the Contact page and in the footer. Leave blank to show “to be announced”. Use only official foundation numbers and addresses.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field id="phone" label="Public phone" error={fe.phone}>
            <Input {...f("phone")} />
          </Field>
          <Field id="whatsapp" label="WhatsApp (optional)" error={fe.whatsapp}>
            <Input {...f("whatsapp")} />
          </Field>
          <Field id="email" label="Public email" error={fe.email}>
            <Input {...f("email")} type="email" />
          </Field>
          <Field id="hours" label="Office hours" error={fe.hours}>
            <Input {...f("hours")} placeholder="e.g. Mon–Sat, 10 am – 5 pm" />
          </Field>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Internal</CardTitle>
            <CardDescription>Where new website enquiries are notified (requires email delivery to be configured).</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Field id="enquiryInbox" label="Enquiry notification inbox" error={fe.enquiryInbox}>
            <Input {...f("enquiryInbox")} type="email" />
          </Field>
        </CardContent>
      </Card>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save settings"}
      </Button>
    </form>
  );
}

export function MembershipRulesForm({
  value,
}: {
  value: { schemeApproved: boolean; registrationOpen: boolean; fee: string; feePeriod: string; waitingPeriodMonths: number; maxBenefit: string; benefitAgeLimit: number; minApplicantAge: number; termsVersion: string; approachingDays: number };
}) {
  const [approved, setApproved] = useState(value.schemeApproved);
  const { run, pending, fieldErrors: fe } = useAction();
  const f = (n: string) => ({ ...fieldA11y(n, fe[n]), name: n });
  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        const d = Object.fromEntries(new FormData(e.currentTarget));
        void run(saveMembershipRules, { ...d, schemeApproved: approved, registrationOpen: d.registrationOpen === "on", confirmApproval: d.confirmApproval === "on" });
      }}
    >
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Scheme status</CardTitle>
            <CardDescription>While the scheme is proposed, claims can be reviewed but never approved, and the public website says the benefit is proposed.</CardDescription>
          </div>
          <Badge tone={approved ? "success" : "warning"}>{approved ? "Formally approved" : "Proposed"}</Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={approved} onChange={(e) => setApproved(e.target.checked)} /> The death-benefit scheme has been formally approved
          </label>
          {approved && !value.schemeApproved && (
            <label className="flex items-start gap-2 rounded-lg border border-gold/50 bg-gold-soft/30 p-3 text-sm">
              <Checkbox name="confirmApproval" className="mt-0.5" /> I confirm the foundation has approved the final rules, exclusions, claim process, funding arrangements and legal
              structure, and the public terms have been updated.
            </label>
          )}
          {fe.confirmApproval && (
            <p role="alert" className="text-xs font-medium text-danger">
              {fe.confirmApproval}
            </p>
          )}
          <label className="flex items-center gap-2 text-sm">
            <Checkbox name="registrationOpen" defaultChecked={value.registrationOpen} /> Accept membership applications from the website
          </label>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Rules</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field id="fee" label="Membership fee (₹)" hint="Leave blank while the fee is to be confirmed." error={fe.fee}>
            <Input {...f("fee")} defaultValue={value.fee} inputMode="decimal" />
          </Field>
          <Field id="feePeriod" label="Fee period" hint="e.g. per year" error={fe.feePeriod}>
            <Input {...f("feePeriod")} defaultValue={value.feePeriod} />
          </Field>
          <Field id="waitingPeriodMonths" label="Waiting period (calendar months)" required error={fe.waitingPeriodMonths}>
            <Input {...f("waitingPeriodMonths")} type="number" min={0} max={60} defaultValue={value.waitingPeriodMonths} />
          </Field>
          <Field id="maxBenefit" label="Maximum death-benefit support (₹)" required error={fe.maxBenefit}>
            <Input {...f("maxBenefit")} defaultValue={value.maxBenefit} inputMode="decimal" />
          </Field>
          <Field id="benefitAgeLimit" label="Member must be under (years)" required error={fe.benefitAgeLimit}>
            <Input {...f("benefitAgeLimit")} type="number" min={1} max={120} defaultValue={value.benefitAgeLimit} />
          </Field>
          <Field id="minApplicantAge" label="Minimum applicant age" required error={fe.minApplicantAge}>
            <Input {...f("minApplicantAge")} type="number" min={0} max={120} defaultValue={value.minApplicantAge} />
          </Field>
          <Field id="termsVersion" label="Current terms version" required error={fe.termsVersion} hint="Recorded with every new application.">
            <Input {...f("termsVersion")} defaultValue={value.termsVersion} />
          </Field>
          <Field id="approachingDays" label="“Completing soon” window (days)" required error={fe.approachingDays}>
            <Input {...f("approachingDays")} type="number" min={1} max={90} defaultValue={value.approachingDays} />
          </Field>
        </CardContent>
      </Card>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save membership rules"}
      </Button>
    </form>
  );
}

export function NotificationTemplatesForm({
  events,
  templates,
}: {
  events: { key: string; label: string; to: string; vars: string[] }[];
  templates: Record<string, { enabled: boolean; subject: string; body: string }>;
}) {
  const [state, setState] = useState(templates);
  const { run, pending, fieldErrors } = useAction();
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        void run(saveNotificationSettings, { templates: state });
      }}
    >
      {events.map((ev) => {
        const t = state[ev.key];
        const upd = (patch: Partial<typeof t>) => setState((s) => ({ ...s, [ev.key]: { ...s[ev.key], ...patch } }));
        return (
          <Card key={ev.key}>
            <CardHeader>
              <div>
                <CardTitle>{ev.label}</CardTitle>
                <CardDescription>
                  Sent to: {ev.to}. Placeholders: {ev.vars.map((v) => `{{${v}}}`).join(", ")}
                </CardDescription>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={t.enabled} onChange={(e) => upd({ enabled: e.target.checked })} /> Enabled
              </label>
            </CardHeader>
            <CardContent className="space-y-3">
              <Field id={`${ev.key}-subject`} label="Subject" error={fieldErrors[`templates.${ev.key}.subject`]}>
                <Input id={`${ev.key}-subject`} value={t.subject} onChange={(e) => upd({ subject: e.target.value })} />
              </Field>
              <Field id={`${ev.key}-body`} label="Message" error={fieldErrors[`templates.${ev.key}.body`]}>
                <Textarea id={`${ev.key}-body`} value={t.body} onChange={(e) => upd({ body: e.target.value })} rows={5} />
              </Field>
            </CardContent>
          </Card>
        );
      })}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save templates"}
      </Button>
    </form>
  );
}
