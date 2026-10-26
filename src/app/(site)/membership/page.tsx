import Link from "next/link";
import { FileWarning } from "lucide-react";
import { ClaimForm } from "@/components/forms/ClaimForm";
import { MembershipRegistrationForm } from "@/components/forms/MembershipRegistrationForm";
import { MembershipStatus } from "@/components/forms/MembershipStatus";
import { MembershipConditions } from "@/components/sections/MembershipConditions";
import { PageHero } from "@/components/sections/PageHero";
import { ButtonLink } from "@/components/ui/Button";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PendingNote } from "@/components/ui/States";
import { exceptionStates, joiningSteps } from "@/content/membership";
import { toMembershipView } from "@/lib/membership-view";
import { publicSettings } from "@/lib/settings";
import { cmsPageMetadata } from "@/lib/metadata";
import { getPage } from "@/lib/cms";
import { isRazorpayEnabled } from "@/lib/payments/razorpay";
import { MembershipFaq } from "@/components/sections/MembershipFaq";
import { MobileApplyBar } from "@/components/forms/MobileApplyBar";

export function generateMetadata() {
  return cmsPageMetadata("membership", "/membership");
}

export default async function MembershipPage() {
  const [page, rules] = await Promise.all([getPage("membership"), publicSettings("membershipRules")]);
  const m = toMembershipView(rules);
  const online = isRazorpayEnabled();
  const facts = [
    { label: "Membership fee", value: (m.feeLabel ?? "To be confirmed") },
    { label: "Waiting period", value: `${m.waitingPeriodMonths} months` },
    { label: "Proposed death benefit", value: `Up to ${m.maxBenefit}` },
    { label: "Benefit age condition", value: `Under ${m.benefitAgeLimit} years` },
  ];

  return (
    <>
      <PageHero
        crumbs={[{ label: "Membership" }]}
        eyebrow="Membership"
        title={page.title}
        intro={page.intro}
        aside={
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[1.75rem] bg-line ring-1 ring-line">
            {facts.map((f) => (
              <div key={f.label} className="bg-white p-5">
                <dt className="text-xs font-semibold tracking-wide text-muted uppercase">{f.label}</dt>
                <dd className="mt-2 font-display text-lg leading-tight font-bold text-forest">{f.value}</dd>
              </div>
            ))}
          </dl>
        }
      >
        <div className="flex flex-col gap-3 sm:flex-row">
          <ButtonLink href="#register" size="lg" arrow>
            Apply for membership
          </ButtonLink>
          <ButtonLink href="/membership/terms" size="lg" variant="outline">
            Read the terms
          </ButtonLink>
        </div>
      </PageHero>

      {!m.schemeApproved && (
        <div className="border-b border-gold/40 bg-gold-soft/40">
          <div className="container-site flex gap-3 py-4 text-sm leading-relaxed text-charcoal">
            <FileWarning aria-hidden className="mt-0.5 size-5 shrink-0 text-gold-ink" />
            <p>
              <strong>Proposed scheme.</strong> The death-benefit provision is not yet operational. Its rules, fee, funding and legal
              status are awaiting formal approval by H R Foundation. It is not insurance and does not guarantee any payment.
            </p>
          </div>
        </div>
      )}

      <section className="bg-ivory py-16 sm:py-24" aria-labelledby="purpose-heading">
        <div className="container-site grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <SectionHeading
              id="purpose-heading"
              index="01"
              eyebrow="Purpose"
              title="Why membership?"
              intro="Members come together to support the foundation's charitable aims. The proposed scheme also aims to offer a measure of support to a member's family at a very difficult time."
            />
          </div>
          <div className="lg:col-span-7">
            <h3 className="mb-6 font-display text-xl font-bold text-forest">Proposed eligibility for death-benefit consideration</h3>
            <MembershipConditions rules={rules} />
            <PendingNote className="mt-6">
              Any other eligibility requirements and exclusions will be confirmed in the approved terms.
            </PendingNote>
          </div>
        </div>
      </section>

      <section className="bg-sage py-16 sm:py-24" aria-labelledby="journey-heading">
        <div className="container-site">
          <SectionHeading
            id="journey-heading"
            index="02"
            eyebrow="How it works"
            title="From application to active membership."
            intro="Apply, pay online and your membership is active straight away — with your certificate ready to download."
          />
          <ol className="mt-12 grid gap-px overflow-hidden rounded-2xl bg-sage-deep md:grid-cols-3">
            {joiningSteps.map((s, i) => (
              <li key={s.key} className="bg-ivory p-6">
                <span className="font-display text-sm font-bold text-gold-ink">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="mt-3 font-display text-lg font-bold text-forest">{s.label}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{s.description}</p>
              </li>
            ))}
          </ol>
          <ul className="mt-6 flex flex-wrap gap-x-8 gap-y-3 text-sm text-muted">
            {exceptionStates.map((s) => (
              <li key={s.key}>
                <strong className="text-charcoal">{s.label}:</strong> {s.description}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-ivory py-16 sm:py-24" aria-labelledby="waiting-heading">
        <div className="container-site grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <SectionHeading
              id="waiting-heading"
              index="03"
              eyebrow="Waiting period"
              title={`The ${m.waitingPeriodMonths}-month waiting period.`}
              intro={`The waiting period starts on your effective membership date and ends on the same date ${m.waitingPeriodMonths} months later (or the last day of that month, if the date does not exist).`}
            />
            <div className="mt-8 space-y-3">
              <StatusBadge tone="pending">Waiting Period in Progress</StatusBadge>
              <br />
              <StatusBadge tone="confirmed">Waiting Period Completed — Eligible for Consideration</StatusBadge>
              <p className="pt-2 text-sm leading-relaxed text-muted">
                Completing the waiting period does not guarantee a payment. All other conditions still apply.
              </p>
            </div>
          </div>
          <div className="lg:col-span-7">
            <MembershipStatus waitingPeriodMonths={m.waitingPeriodMonths} />
          </div>
        </div>
      </section>

      <section id="claim" className="scroll-mt-24 bg-forest py-16 text-ivory sm:py-20" aria-labelledby="claims-heading">
        <div className="container-site grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <SectionHeading
              id="claims-heading"
              tone="dark"
              index="04"
              eyebrow="Claims"
              title="How a claim is made."
              intro={`We aim to complete each claim within ${m.claimTargetDays} days of receiving complete documents.`}
            />
          </div>
          <div className="lg:col-span-7">
            <ol className="space-y-5">
              {[
                "The nominee signs in to the member portal with the member's membership ID and password (or uses the form below with the nominee's registered mobile number) and uploads the death certificate. A claim reference is given at once.",
                "The foundation verifies the death certificate, the membership status, the waiting period and the age condition.",
                "The foundation contacts the nominee to confirm their bank account details. Bank details are never collected through this website.",
                `After verification, the approved amount is transferred to the nominee's bank account — within ${m.claimTargetDays} days of receiving complete documents.`,
              ].map((step, i) => (
                <li key={step} className="flex gap-5">
                  <span className="font-display text-sm font-bold text-gold tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                  <p className="leading-relaxed text-ivory/85">{step}</p>
                </li>
              ))}
            </ol>
            <p className="mt-8 text-sm leading-relaxed text-ivory/65">
              If more documents are needed, the time is counted from when they are received. The death certificate and nominee
              details are kept private and are never published.
            </p>
          </div>
        </div>
      </section>

      <section id="submit-claim" className="scroll-mt-24 bg-ivory py-16 sm:py-24" aria-labelledby="submit-claim-heading">
        <div className="container-site grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <SectionHeading
              id="submit-claim-heading"
              index="05"
              eyebrow="For nominees"
              title="Submit a claim."
              intro="We are sorry for your loss. If you have the member's login details, you can also sign in to the member portal to submit the claim and follow its progress."
            />
          </div>
          <div className="lg:col-span-8">
            {!m.schemeApproved && (
              <PendingNote className="mb-8">
                The death-benefit scheme is awaiting formal approval. You can submit the claim and death certificate now and the
                foundation will start verifying it, but any payment can be made only after the scheme is approved.
              </PendingNote>
            )}
            <ClaimForm targetDays={m.claimTargetDays} />
          </div>
        </div>
      </section>

      <section id="faq" className="scroll-mt-24 bg-sage py-16 sm:py-24" aria-labelledby="faq-heading">
        <div className="container-site grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <SectionHeading
              id="faq-heading"
              index="06"
              eyebrow="Questions"
              title="Before you join."
              intro="Straight answers to the questions people ask most. If anything is unclear, contact us before you apply."
            />
          </div>
          <div className="lg:col-span-8">
            <MembershipFaq m={m} />
          </div>
        </div>
      </section>

      <section id="register" className="scroll-mt-24 bg-ivory py-16 sm:py-24" aria-labelledby="register-heading">
        <div className="container-site grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <div className="lg:sticky lg:top-28">
              <SectionHeading
                id="register-heading"
                index="07"
                eyebrow="Registration"
                title="Apply for membership."
                intro={
                  <>
                    Please read the{" "}
                    <Link href="/membership/terms" className="text-emerald-ink underline underline-offset-2">
                      membership terms
                    </Link>{" "}
                    first. Your membership is activated as soon as the fee is paid{online ? " online" : " and verified"}.
                  </>
                }
              />
            </div>
          </div>
          <div className="lg:col-span-8">
            <MembershipRegistrationForm m={m} onlinePayment={online} />
            {online && m.feeLabel && (
              <p className="mt-6 text-sm text-muted">
                Already applied?{" "}
                <Link href="/membership/pay" className="font-semibold text-emerald-ink underline underline-offset-2">
                  Pay your membership fee online
                </Link>
                .
              </p>
            )}
          </div>
        </div>
      </section>
      <MobileApplyBar label={m.registrationOpen ? "Apply for membership" : "Register your interest"} />
    </>
  );
}
