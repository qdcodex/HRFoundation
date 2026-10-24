"use client";

import { useActionState, useState } from "react";
import { Loader2, LogIn, LogOut } from "lucide-react";
import { memberChangePasswordAction, memberLoginAction, memberLogoutAction } from "@/app/(site)/member/actions";
import { buttonClasses } from "@/components/ui/Button";
import { FormStatus, TextField } from "./FormField";

export function MemberLoginForm() {
  const [state, action, pending] = useActionState(memberLoginAction, undefined);
  return (
    <form action={action} className="space-y-6" noValidate>
      <TextField
        label="Membership ID"
        name="membershipId"
        autoComplete="username"
        autoCapitalize="characters"
        hint="For example HRF-M-2026-00001"
        required
      />
      <TextField label="Password" name="password" type="password" autoComplete="current-password" required />
      <FormStatus state={state?.error ? { kind: "error", message: state.error } : { kind: "idle" }} />
      <button type="submit" disabled={pending} className={buttonClasses("primary", "lg", "w-full")}>
        {pending ? <Loader2 aria-hidden className="size-4 animate-spin" /> : <LogIn aria-hidden className="size-4" />}
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

export function MemberPasswordForm({ required }: { required: boolean }) {
  const [state, action, pending] = useActionState(memberChangePasswordAction, undefined);
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-6" noValidate>
      <TextField
        label={required ? "Temporary password" : "Current password"}
        name="current"
        type="password"
        autoComplete="current-password"
        error={fe.current}
        required
      />
      <TextField
        label="New password"
        name="password"
        type="password"
        autoComplete="new-password"
        hint="At least 8 characters, with letters and numbers."
        error={fe.password}
        required
      />
      <TextField label="Confirm new password" name="confirm" type="password" autoComplete="new-password" error={fe.confirm} required />
      <FormStatus state={state?.error ? { kind: "error", message: state.error } : { kind: "idle" }} />
      <button type="submit" disabled={pending} className={buttonClasses("primary", "lg", "w-full sm:w-auto")}>
        {pending && <Loader2 aria-hidden className="size-4 animate-spin" />}
        {pending ? "Saving…" : "Save new password"}
      </button>
    </form>
  );
}

/** Signs out, then does a full page load so no member data stays in the browser's memory (shared phones). */
export function MemberLogoutButton() {
  const [pending, setPending] = useState(false);
  return (
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        await memberLogoutAction().catch(() => null);
        window.location.replace("/member/login");
      }}
      className={buttonClasses("outline", "md")}
    >
      <LogOut aria-hidden className="size-4" />
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
