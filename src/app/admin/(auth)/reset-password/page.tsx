import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/admin/auth-forms";

export const metadata = { title: "Reset password" };

export default function ResetPasswordPage() {
  return (
    <div>
      <h1 className="font-display text-2xl font-extrabold text-forest">Choose a new password</h1>
      <p className="mt-1 mb-6 text-sm text-muted">Signing in elsewhere will end when you reset your password.</p>
      <Suspense fallback={<div className="h-48" />}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
