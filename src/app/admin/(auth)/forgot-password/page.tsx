import Link from "next/link";
import { ForgotPasswordForm } from "@/components/admin/auth-forms";
import { Notice } from "@/components/admin/ui/feedback";
import { isEmailConfigured } from "@/lib/server/email";

export const metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <div>
      <h1 className="font-display text-2xl font-extrabold text-forest">Forgot password</h1>
      <div className="mt-6">
        {isEmailConfigured() ? (
          <>
            <p className="mb-4 text-sm text-muted">Enter your account email and we will send you a reset link.</p>
            <ForgotPasswordForm />
          </>
        ) : (
          <Notice>
            Password reset by email is not configured for this installation. Ask a Super Admin to set a temporary password for you
            from <strong>Users &amp; Roles</strong>; you will be asked to choose a new one when you sign in.
          </Notice>
        )}
      </div>
      <p className="mt-6 text-sm">
        <Link href="/admin/login" className="text-emerald-ink underline-offset-4 hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
