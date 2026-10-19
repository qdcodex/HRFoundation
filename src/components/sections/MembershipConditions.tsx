import { CalendarCheck2, ClipboardCheck, FileSearch, IndianRupee, ShieldAlert, UserCheck } from "lucide-react";
import { formatPaise } from "@/lib/money";
import type { MembershipRules } from "@/lib/settings";

/** The client-specified conditions of the proposed death-benefit provision. */
export function MembershipConditions({ rules }: { rules: MembershipRules }) {
  const conditions = [
    {
      Icon: IndianRupee,
      title: `Up to ${formatPaise(rules.maxBenefitPaise)}`,
      text: "The maximum stated support. The actual amount, if any, depends on the foundation's approved terms.",
    },
    {
      Icon: CalendarCheck2,
      title: `${rules.waitingPeriodMonths}-month waiting period`,
      text: "Counted from the effective membership date. The full waiting period must be completed.",
    },
    {
      Icon: UserCheck,
      title: `Under ${rules.benefitAgeLimit} years of age`,
      text: "The member must be under this age, subject to the approved rules.",
    },
    {
      Icon: ClipboardCheck,
      title: "Active membership",
      text: "Membership must be active, with all required payments and approvals in place.",
    },
    {
      Icon: FileSearch,
      title: "Claim and verification",
      text: "A claim must be submitted by the nominee and verified by the foundation.",
    },
  ];

  return (
    <div>
      <ul className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2">
        {conditions.map(({ Icon, title, text }) => (
          <li key={title} className="flex gap-4 bg-white p-6">
            <Icon aria-hidden className="mt-0.5 size-6 shrink-0 text-emerald" />
            <div>
              <h3 className="font-display text-lg font-bold text-forest">{title}</h3>
              <p className="mt-1 text-[0.95rem] leading-relaxed text-muted">{text}</p>
            </div>
          </li>
        ))}
        <li className="flex gap-4 bg-gold-soft/40 p-6">
          <ShieldAlert aria-hidden className="mt-0.5 size-6 shrink-0 text-gold-ink" />
          <div>
            <h3 className="font-display text-lg font-bold text-forest">Not insurance. Not guaranteed.</h3>
            <p className="mt-1 text-[0.95rem] leading-relaxed text-charcoal">
              Any support is subject to approved terms and verification. Completing the waiting period does not by itself
              entitle anyone to a payment.
            </p>
          </div>
        </li>
      </ul>
    </div>
  );
}
