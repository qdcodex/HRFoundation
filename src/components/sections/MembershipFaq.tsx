import { ChevronDown } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import type { MembershipView } from "@/lib/membership-view";

/** Plain-language answers to the questions people ask before joining. Honest by design. */
export function MembershipFaq({ m }: { m: MembershipView }) {
  const items: { q: string; a: ReactNode }[] = [
    {
      q: "Who can become a member?",
      a: (
        <>
          Anyone aged {m.minApplicantAge} or over who wants to support the foundation&apos;s work can apply. The family-support provision applies only to members
          under {m.benefitAgeLimit}, subject to the approved rules.
        </>
      ),
    },
    {
      q: "What does membership cost?",
      a: m.feeLabel ? <>The membership fee is {m.feeLabel}. It is paid once — there is no renewal fee. You pay only after your application is received; the foundation will tell you how.</> : <>The fee is being finalised. Apply now and the foundation will contact you with the confirmed fee and how to pay before anything is charged.</>,
    },
    {
      q: "What support could my family receive?",
      a: (
        <>
          {m.schemeApproved ? "Under the approved rules" : "Under the proposed rules"}, if a member passes away after completing the {m.waitingPeriodMonths}
          -month waiting period, their nominee may be considered for support of up to {m.maxBenefit}. A claim must be submitted and verified, and the amount
          depends on the approved terms.
        </>
      ),
    },
    {
      q: "How does the nominee make a claim?",
      a: (
        <>
          The nominee signs in to the <Link href="/member/login" className="text-emerald-ink underline underline-offset-2">member portal</Link> with the
          member&apos;s membership ID and password — or uses the form on this page with their registered mobile number — and uploads the death certificate. After verification, any approved amount is transferred to the nominee&apos;s bank account. We aim to complete the process within{" "}
          {m.claimTargetDays} days of receiving complete documents.
        </>
      ),
    },
    {
      q: "Will I get a membership certificate?",
      a: (
        <>
          Yes. Once your membership is activated, the foundation gives you login details for the{" "}
          <Link href="/member/login" className="text-emerald-ink underline underline-offset-2">member portal</Link>, where you can download your membership
          certificate at any time. Please share your login with your nominee so your family can submit a claim if ever needed.
        </>
      ),
    },
    {
      q: "Is this life insurance?",
      a: (
        <>
          No. Membership is a charitable scheme run by the foundation, not an insurance policy, and support is not guaranteed. If your family needs guaranteed
          financial protection, we encourage you to also look at life cover from an IRDAI-registered insurer — including low-cost government schemes such as
          Pradhan Mantri Jeevan Jyoti Bima Yojana (PMJJBY), available through your bank. Membership can sit alongside such cover.
        </>
      ),
    },
    {
      q: "Is the payment guaranteed?",
      a: <>No. Completing the waiting period makes a claim eligible for consideration only. Every claim is checked against the rules, and an authorised person records the decision.</>,
    },
    {
      q: "When does the waiting period start?",
      a: (
        <>
          On your effective membership date — the day your membership is activated after your payment is verified and approved. It ends {m.waitingPeriodMonths}{" "}
          calendar months later. Your membership must stay active throughout.
        </>
      ),
    },
    ...(!m.schemeApproved
      ? [
          {
            q: "Why is the family support described as “proposed”?",
            a: <>The foundation is still formally approving the scheme&apos;s final rules, funding and legal structure. We will update this page as soon as it is approved. Applying now registers your interest; nothing is activated without your payment and the foundation&apos;s approval.</>,
          },
        ]
      : []),
    {
      q: "Can I change my nominee later?",
      a: (
        <>
          Yes. <Link href="/contact" className="text-emerald-ink underline underline-offset-2">Contact the foundation</Link> and we will update your nominee&apos;s
          details. Every change is recorded.
        </>
      ),
    },
    {
      q: "How is my information protected?",
      a: (
        <>
          Your details and your nominee&apos;s are seen only by authorised foundation staff and are never published. Read our{" "}
          <Link href="/privacy-policy" className="text-emerald-ink underline underline-offset-2">privacy policy</Link>.
        </>
      ),
    },
  ];

  return (
    <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
      {items.map((item) => (
        <li key={item.q}>
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-display text-lg font-bold text-forest hover:bg-ivory/60 sm:px-6 [&::-webkit-details-marker]:hidden">
              {item.q}
              <ChevronDown aria-hidden className="size-5 shrink-0 transition-transform group-open:rotate-180" />
            </summary>
            <div className="px-5 pb-5 leading-relaxed text-muted sm:px-6">{item.a}</div>
          </details>
        </li>
      ))}
    </ul>
  );
}
