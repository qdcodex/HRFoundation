import { redirect } from "next/navigation";
import { Suspense } from "react";
import { KeyRound } from "lucide-react";
import { MemberLoginForm } from "@/components/forms/MemberAuthForms";
import { site } from "@/content/site";
import { getMember } from "@/lib/member-auth/session";

export const metadata = { title: "Member login", alternates: { canonical: "/member/login" } };

export default function MemberLoginPage() {
  return (
    <section className="bg-ivory py-16 sm:py-24">
      <div className="container-site grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <p className="eyebrow text-gold-ink">Member portal</p>
          <h1 className="mt-3 font-display text-4xl leading-tight font-extrabold text-forest sm:text-5xl">Member login.</h1>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-muted">
            Sign in with your membership ID to see your membership, download your membership certificate and, for your family,
            submit a claim.
          </p>
          <div className="mt-8 rounded-2xl bg-sage p-6 text-sm leading-relaxed text-charcoal">
            <p className="flex items-center gap-2 font-display font-bold text-forest">
              <KeyRound aria-hidden className="size-5 text-gold-ink" /> No login details yet, or forgotten your password?
            </p>
            <p className="mt-2">
              The foundation gives you your login details when your membership is activated. If you have lost them, email{" "}
              <a href={`mailto:${site.contact.email}`} className="text-emerald-ink underline underline-offset-2">
                {site.contact.email}
              </a>{" "}
              with your membership ID and we will reset them.
            </p>
            <p className="mt-2">
              <strong>Family members:</strong> please use the member&apos;s membership ID and password to submit a claim.
            </p>
          </div>
        </div>
        <div className="lg:col-span-6 lg:col-start-7">
          <div className="rounded-[1.75rem] bg-white p-6 ring-1 ring-line sm:p-8">
            <Suspense fallback={<div className="h-80" />}>
              <RedirectIfSignedIn />
              <MemberLoginForm />
            </Suspense>
          </div>
        </div>
      </div>
    </section>
  );
}

async function RedirectIfSignedIn() {
  const member = await getMember().catch(() => null);
  if (member) redirect(member.portal?.mustChangePassword ? "/member/password?required=1" : "/member");
  return null;
}
