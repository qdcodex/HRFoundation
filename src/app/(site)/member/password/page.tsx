import { redirect } from "next/navigation";
import { Suspense } from "react";
import { MemberPasswordForm } from "@/components/forms/MemberAuthForms";
import { getMember } from "@/lib/member-auth/session";

export const metadata = { title: "Change password" };

export default function MemberPasswordPage({ searchParams }: PageProps<"/member/password">) {
  return (
    <section className="bg-ivory py-16 sm:py-24">
      <div className="container-site max-w-2xl">
        <p className="eyebrow text-gold-ink">Member portal</p>
        <h1 className="mt-3 font-display text-4xl leading-tight font-extrabold text-forest">Choose your password.</h1>
        <Suspense fallback={<div className="h-96" />}>
          <PasswordBody searchParams={searchParams} />
        </Suspense>
      </div>
    </section>
  );
}

async function PasswordBody({ searchParams }: Pick<PageProps<"/member/password">, "searchParams">) {
  const member = await getMember();
  if (!member) redirect("/member/login");
  const required = Boolean(member.portal?.mustChangePassword) || (await searchParams).required === "1";
  return (
    <>
      <p className="mt-4 mb-8 text-lg leading-relaxed text-muted">
        {required
          ? "You signed in with a temporary password. Please choose your own password to continue. Keep it safe and share it only with your nominee."
          : "Enter your current password and choose a new one."}
      </p>
      <div className="rounded-[1.75rem] bg-white p-6 ring-1 ring-line sm:p-8">
        <MemberPasswordForm required={required} />
      </div>
    </>
  );
}
