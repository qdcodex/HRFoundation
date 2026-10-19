"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { changePasswordAction, loginAction, requestResetAction, resetPasswordAction, type FormState } from "@/app/admin/actions/auth";
import { Button } from "./ui/button";
import { Field, fieldA11y, Input } from "./ui/form";

function FormMessage({ state }: { state: FormState }) {
  if (!state) return null;
  if (state.error)
    return (
      <p role="alert" className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm font-medium text-danger">
        {state.error}
      </p>
    );
  if (state.message)
    return (
      <p role="status" className="rounded-lg border border-emerald/30 bg-sage px-3 py-2 text-sm font-medium text-forest">
        {state.message}
      </p>
    );
  return null;
}

export function LoginForm() {
  const next = useSearchParams().get("next") ?? "";
  const [state, action, pending] = useActionState(loginAction, undefined);
  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="next" value={next} />
      <Field id="email" label="Email address">
        <Input {...fieldA11y("email")} name="email" type="email" autoComplete="username" required autoFocus />
      </Field>
      <Field id="password" label="Password">
        <Input {...fieldA11y("password")} name="password" type="password" autoComplete="current-password" required />
      </Field>
      <FormMessage state={state} />
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending && <Loader2 className="animate-spin" aria-hidden />}
        {pending ? "Signing in…" : "Sign in"}
      </Button>
      <p className="text-center text-sm">
        <Link href="/admin/forgot-password" className="text-emerald-ink underline-offset-4 hover:underline">
          Forgot your password?
        </Link>
      </p>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestResetAction, undefined);
  if (state?.ok) return <FormMessage state={state} />;
  return (
    <form action={action} className="space-y-4" noValidate>
      <Field id="email" label="Email address">
        <Input {...fieldA11y("email")} name="email" type="email" autoComplete="username" required />
      </Field>
      <FormMessage state={state} />
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Sending…" : "Send reset link"}
      </Button>
    </form>
  );
}

export function ResetPasswordForm() {
  const token = useSearchParams().get("token") ?? "";
  const [state, action, pending] = useActionState(resetPasswordAction, undefined);
  if (state?.ok)
    return (
      <div className="space-y-4">
        <FormMessage state={state} />
        <Button asChild size="lg" className="w-full">
          <Link href="/admin/login">Go to sign in</Link>
        </Button>
      </div>
    );
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="token" value={token} />
      <PasswordFields errors={fe} />
      <FormMessage state={state} />
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Saving…" : "Set new password"}
      </Button>
    </form>
  );
}

function PasswordFields({ errors }: { errors: Record<string, string> }) {
  return (
    <>
      <Field id="newPassword" label="New password" hint="At least 12 characters, with upper- and lower-case letters and a number." error={errors.newPassword}>
        <Input {...fieldA11y("newPassword", errors.newPassword, true)} name="newPassword" type="password" autoComplete="new-password" required />
      </Field>
      <Field id="confirmPassword" label="Confirm new password" error={errors.confirmPassword}>
        <Input {...fieldA11y("confirmPassword", errors.confirmPassword)} name="confirmPassword" type="password" autoComplete="new-password" required />
      </Field>
    </>
  );
}

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState(changePasswordAction, undefined);
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} className="max-w-md space-y-4" noValidate key={state?.ok ? "done" : "form"}>
      <Field id="currentPassword" label="Current password" error={fe.currentPassword}>
        <Input {...fieldA11y("currentPassword", fe.currentPassword)} name="currentPassword" type="password" autoComplete="current-password" required />
      </Field>
      <PasswordFields errors={fe} />
      <FormMessage state={state} />
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Change password"}
      </Button>
    </form>
  );
}
