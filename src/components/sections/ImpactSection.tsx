import { FileCheck2, Scale, ShieldCheck } from "lucide-react";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { TextLink } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { RegistrationFacts } from "./RegistrationFacts";

export type VerifiedStat = {
  value: string;
  label: string;
  /** Where the figure comes from, e.g. "Audited accounts 2025–26". Required. */
  source: string;
};

/**
 * Impact & transparency.
 * Pass `stats` only when figures are verified. With no stats, a mission-focused
 * transparency section is shown — never placeholder numbers or animated counters.
 */
export function ImpactSection({ stats = [] }: { stats?: VerifiedStat[] }) {
  const commitments = [
    {
      Icon: ShieldCheck,
      title: "Report only what is verified",
      text: "We will publish figures and stories only after they have been checked. Until then, you will not see impact numbers here.",
    },
    {
      Icon: FileCheck2,
      title: "Open governance",
      text: "The trust is registered in Peddapalli, Telangana. Its registration number and NGO Darpan ID are shown on this website so anyone can check them.",
    },
    {
      Icon: Scale,
      title: "Treat every request fairly",
      text: "Any support we offer will follow clear, written criteria approved by the trustees and applied with care and respect.",
    },
  ];

  return (
    <section className="bg-sage py-20 sm:py-28" aria-labelledby="impact-heading">
      <div className="container-site">
        <SectionHeading
          id="impact-heading"
          index="04"
          eyebrow="Impact & transparency"
          align="split"
          title={
            stats.length > 0 ? (
              "Our work, in verified numbers."
            ) : (
              <>
                Trust is earned <span className="text-emerald-ink">one honest step</span> at a time.
              </>
            )
          }
          intro="H R Foundation was registered in December 2024 and is preparing its first programmes. As our work begins, this space will share verified results, reports and activities."
        />

        {stats.length > 0 ? (
          <dl className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-sage-deep bg-sage-deep sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="bg-ivory p-8">
                <dt className="text-sm text-muted">{s.label}</dt>
                <dd className="mt-3 font-display text-5xl font-extrabold tracking-tight text-forest">{s.value}</dd>
                <dd className="mt-3 text-xs text-muted">Source: {s.source}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <div className="mt-14 grid gap-10 lg:grid-cols-12">
            <ol className="space-y-px overflow-hidden rounded-2xl lg:col-span-7">
              {commitments.map(({ Icon, title, text }, i) => (
                <li key={title}>
                  <Reveal delay={i * 0.06} className="flex gap-5 bg-ivory p-6 sm:p-8">
                    <span className="grid size-12 shrink-0 place-items-center rounded-full bg-forest text-gold">
                      <Icon aria-hidden className="size-5" />
                    </span>
                    <div>
                      <h3 className="font-display text-lg font-bold text-forest">{title}</h3>
                      <p className="mt-2 leading-relaxed text-muted">{text}</p>
                    </div>
                  </Reveal>
                </li>
              ))}
            </ol>

            <Reveal className="rounded-2xl bg-forest p-6 text-ivory sm:p-8 lg:col-span-5" delay={0.1}>
              <p className="eyebrow text-gold">Registration at a glance</p>
              <RegistrationFacts tone="dark" className="mt-4" />
              <TextLink href="/about" className="mt-6 text-gold hover:text-ivory">
                About our governance
              </TextLink>
            </Reveal>
          </div>
        )}
      </div>
    </section>
  );
}
