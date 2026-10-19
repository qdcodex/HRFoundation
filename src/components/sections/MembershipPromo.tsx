import { ClipboardCheck, HeartHandshake, ShieldCheck, Users } from "lucide-react";
import { ButtonLink, TextLink } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { toMembershipView, type MembershipView } from "@/lib/membership-view";
import { publicSettings } from "@/lib/settings";

/**
 * Membership promotion. Persuasive, but honest: while the scheme is proposed it says so,
 * and it never presents membership as insurance or as a guaranteed payment.
 */
export function membershipDisclaimer(m: MembershipView) {
  return m.schemeApproved
    ? "Membership is not an insurance policy. Family support is subject to the approved terms and claim verification, and is not guaranteed."
    : "The family-support provision is a proposed scheme, subject to formal approval. Membership is not an insurance policy, and support is not guaranteed.";
}

/** Large homepage feature. */
export function MembershipFeature({ m }: { m: MembershipView }) {
  const steps = [
    { title: "Apply online", text: "Fill in a short form with your details and your nominee's details." },
    { title: "Pay the membership fee", text: m.feeLabel ? `The fee is ${m.feeLabel}.` : "The foundation will confirm the fee and how to pay." },
    { title: "Membership activated", text: "Once your payment is verified and approved, you receive your membership ID." },
    { title: `${m.waitingPeriodMonths}-month waiting period`, text: "Family-support eligibility begins after the waiting period, under the approved rules." },
  ];
  const benefits = [
    { Icon: Users, title: "Belong to a caring community", text: "Stand with neighbours who support education, medical relief and families in need." },
    {
      Icon: HeartHandshake,
      title: `${m.schemeApproved ? "" : "Proposed "}family support up to ${m.maxBenefit}`,
      text: `If a member under ${m.benefitAgeLimit} passes away after the waiting period, their nominee may be considered for support under the approved rules.`,
    },
    { Icon: ClipboardCheck, title: "Simple and transparent", text: "Clear written terms, a named nominee, and a membership record you can ask about at any time." },
  ];

  return (
    <section className="relative overflow-hidden bg-forest py-20 text-ivory sm:py-28" aria-labelledby="membership-feature-heading">
      <svg aria-hidden viewBox="0 0 400 400" className="pointer-events-none absolute -top-24 -right-24 hidden size-[34rem] text-gold/15 md:block">
        <path d="M40 400V200a160 160 0 0 1 320 0v200" fill="none" stroke="currentColor" />
        <path d="M90 400V210a110 110 0 0 1 220 0v190" fill="none" stroke="currentColor" />
      </svg>
      <div className="container-site relative">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <p className="eyebrow flex items-center gap-3 text-gold">
              <span aria-hidden className="h-px w-8 bg-gold/60" />
              Membership
            </p>
            <h2 id="membership-feature-heading" className="display-lg mt-5 text-ivory">
              Stand together. <span className="text-gold">Look after each other&apos;s families.</span>
            </h2>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ivory/80">
              Membership brings people together around the foundation&apos;s work — and is designed to give a member&apos;s family a measure of support at the
              hardest time.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/membership" variant="gold" size="lg" arrow>
                {m.registrationOpen ? "Become a member" : "Find out about membership"}
              </ButtonLink>
              <ButtonLink href="/membership/terms" variant="outline-light" size="lg">
                Read the terms
              </ButtonLink>
            </div>
            <p className="mt-6 flex max-w-xl gap-2 text-sm leading-relaxed text-ivory/65">
              <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-gold" />
              {membershipDisclaimer(m)}
            </p>
          </div>

          <ul className="space-y-px overflow-hidden rounded-[1.75rem] lg:col-span-6">
            {benefits.map(({ Icon, title, text }, i) => (
              <li key={title}>
                <Reveal delay={i * 0.06} className="flex gap-5 bg-forest-soft p-6 sm:p-7">
                  <span className="grid size-12 shrink-0 place-items-center rounded-full bg-gold text-forest-deep">
                    <Icon aria-hidden className="size-5" />
                  </span>
                  <div>
                    <h3 className="font-display text-lg font-bold text-ivory">{title}</h3>
                    <p className="mt-1.5 leading-relaxed text-ivory/75">{text}</p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ul>
        </div>

        <ol className="mt-16 grid gap-px overflow-hidden rounded-2xl bg-ivory/10 sm:grid-cols-2 lg:grid-cols-4" aria-label="How membership works">
          {steps.map((s, i) => (
            <li key={s.title} className="bg-forest p-6">
              <span className="font-display text-sm font-bold text-gold tabular-nums">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="mt-3 font-display text-lg font-bold text-ivory">{s.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ivory/70">{s.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/** Compact banner for service, about and news pages. */
export function MembershipBanner({ m }: { m: MembershipView }) {
  return (
    <section className="bg-ivory pt-4 pb-4 sm:pt-8" aria-labelledby="membership-banner-heading">
      <div className="container-site">
        <div className="flex flex-col gap-6 rounded-[2rem] border border-gold/40 bg-gold-soft/30 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-5">
            <span className="hidden size-14 shrink-0 place-items-center rounded-full bg-forest text-gold sm:grid">
              <HeartHandshake aria-hidden className="size-6" />
            </span>
            <div>
              <h2 id="membership-banner-heading" className="font-display text-2xl font-bold text-forest">
                Become a member of H R Foundation
              </h2>
              <p className="mt-2 max-w-2xl leading-relaxed text-charcoal">
                Join a community that looks after one another — with {m.schemeApproved ? "" : "proposed "}family support of up to {m.maxBenefit} for eligible
                members&apos; nominees.
              </p>
              <p className="mt-2 max-w-2xl text-xs leading-relaxed text-muted">{membershipDisclaimer(m)}</p>
            </div>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col">
            <ButtonLink href="/membership" arrow>
              {m.registrationOpen ? "Become a member" : "About membership"}
            </ButtonLink>
            <TextLink href="/membership#faq" className="justify-center text-sm">
              Common questions
            </TextLink>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Banner that loads the current membership rules itself (cached). */
export async function SiteMembershipBanner() {
  return <MembershipBanner m={toMembershipView(await publicSettings("membershipRules"))} />;
}
