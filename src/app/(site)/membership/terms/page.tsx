import Link from "next/link";
import { PageHero } from "@/components/sections/PageHero";
import { ButtonLink } from "@/components/ui/Button";
import { PendingNote } from "@/components/ui/States";
import { toMembershipView } from "@/lib/membership-view";
import { publicSettings } from "@/lib/settings";
import { cmsPageMetadata } from "@/lib/metadata";
import { getPage } from "@/lib/cms";

export function generateMetadata() {
  return cmsPageMetadata("membership-terms", "/membership/terms");
}

export default async function MembershipTermsPage() {
  const [page, rules] = await Promise.all([getPage("membership-terms"), publicSettings("membershipRules")]);
  const m = toMembershipView(rules);
  return (
    <>
      <PageHero
        crumbs={[{ label: "Membership", href: "/membership" }, { label: "Terms" }]}
        eyebrow={m.termsVersion}
        title={page.title}
        intro={page.intro}
      />

      <section className="bg-ivory py-16 sm:py-20">
        <div className="container-site grid gap-12 lg:grid-cols-12">
          <article className="prose-site lg:col-span-8">
            <PendingNote>
              <strong>Draft for approval.</strong> The foundation must approve the final rules, exclusions, claim process, funding
              arrangements and legal disclaimers before the scheme becomes operational. Legal review is recommended.
            </PendingNote>

            <h2>1. Nature of the scheme</h2>
            <p>
              The membership scheme of H R Foundation (&quot;the foundation&quot;) is a charitable initiative. It is{" "}
              <strong>not an insurance policy</strong>, and membership does not create a contract of insurance, a guaranteed
              payment or an automatic entitlement to any benefit.
            </p>

            <h2>2. Membership</h2>
            <ul>
              <li>
                Membership fee:{" "}
                {(m.feeLabel ?? "to be confirmed by the foundation")}
                .
              </li>
              <li>Applicants must be at least {m.minApplicantAge} years old and provide accurate information.</li>
              <li>
                Membership becomes active only after the approved fee is paid, the payment is verified and the application is
                approved. The date of activation is the <strong>effective membership date</strong>.
              </li>
              <li>The foundation may reject an application or suspend a membership in accordance with its approved rules.</li>
            </ul>

            <h2>3. Waiting period</h2>
            <p>
              A waiting period of <strong>{m.waitingPeriodMonths} months</strong> applies from the effective membership
              date. It ends on the same calendar date {m.waitingPeriodMonths} months later or, where that date does not
              exist, on the last day of that month. Membership must remain active throughout.
            </p>

            <h2>4. Proposed death-benefit support</h2>
            <ul>
              <li>The maximum stated support is up to {m.maxBenefit}.</li>
              <li>The member must have been under {m.benefitAgeLimit} years of age, subject to the approved rules.</li>
              <li>Membership must have been active and the full waiting period completed.</li>
              <li>A claim must be submitted by the nominee and verified by the foundation.</li>
              <li>
                Any support, and its amount, is at the foundation&apos;s discretion and subject to its approved terms, available
                funds and verification.
              </li>
            </ul>

            <h2>5. Nominees and claims</h2>
            <p>
              Members must name a nominee and confirm that the nominee has agreed to share their details. Nominee details and
              claim documents are confidential and are used only to administer the scheme.
            </p>

            <h2>6. Exclusions</h2>
            <PendingNote>Exclusions are to be defined by the foundation and added here before the scheme is published as operational.</PendingNote>

            <h2>7. Changes to these terms</h2>
            <p>
              The foundation may update these terms. The version accepted by each applicant is recorded with their application.
            </p>

            <h2>8. Personal information</h2>
            <p>
              Personal information is handled as described in our <Link href="/privacy-policy">privacy policy</Link>.
            </p>
          </article>

          <aside className="lg:col-span-4">
            <div className="rounded-[2rem] bg-forest p-7 text-ivory lg:sticky lg:top-28">
              <p className="eyebrow text-gold">Summary</p>
              <ul className="mt-4 space-y-3 text-ivory/85">
                <li>Not insurance, not guaranteed.</li>
                <li>{m.waitingPeriodMonths}-month waiting period from activation.</li>
                <li>Up to {m.maxBenefit}, subject to approved terms.</li>
                <li>Member under {m.benefitAgeLimit}; claim must be verified.</li>
              </ul>
              <ButtonLink href="/membership#register" variant="gold" className="mt-8 w-full" arrow>
                Apply for membership
              </ButtonLink>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
