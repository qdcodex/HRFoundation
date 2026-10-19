import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LoginForm } from "@/components/admin/auth-forms";
import { getAdmin } from "@/lib/auth/dal";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div>
      <h1 className="font-display text-2xl font-extrabold text-forest">Sign in</h1>
      <p className="mt-1 mb-6 text-sm text-muted">Use your H R Foundation administrator account.</p>
      <Suspense fallback={<div className="h-64" />}>
        <RedirectIfSignedIn />
        <LoginForm />
      </Suspense>
    </div>
  );
}

async function RedirectIfSignedIn() {
  const admin = await getAdmin().catch(() => null);
  if (admin) redirect(admin.mustChangePassword ? "/admin/account?required=1" : "/admin");
  return null;
}
