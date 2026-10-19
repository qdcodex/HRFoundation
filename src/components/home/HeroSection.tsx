import { BookOpen, HandHeart, HeartPulse } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { HeroIllustration } from "./HeroIllustration";
import { HeroMotion } from "./HeroMotion";

export function HeroSection({ title, intro }: { title: string; intro: string }) {
  // The last two words of the headline get the emerald underline treatment.
  const words = title.trim().split(/\s+/);
  const lead = words.slice(0, -2).join(" ");
  const emphasis = words.slice(-2).join(" ");
  const pillars = [
    { Icon: BookOpen, label: "Education" },
    { Icon: HeartPulse, label: "Medical relief" },
    { Icon: HandHeart, label: "Relief of the poor" },
  ];

  return (
    <section className="relative overflow-hidden bg-ivory" aria-labelledby="hero-heading">
      {/* soft sage field behind the illustration */}
      <div aria-hidden className="absolute inset-y-0 right-0 hidden w-[38%] bg-sage lg:block" />

      <div className="container-site relative grid gap-12 pt-10 pb-16 sm:pt-14 lg:grid-cols-12 lg:gap-8 lg:pt-20 lg:pb-24">
        <div className="flex flex-col justify-center lg:col-span-7 lg:pr-6">
          <HeroMotion>
            <p className="eyebrow mb-7 flex items-center gap-3 text-gold-ink">
              <span aria-hidden className="h-px w-10 bg-gold" />
              Charitable trust · Peddapalli, Telangana
            </p>
            <h1 id="hero-heading" className="display-xl text-forest">
              {lead}{lead && " "}
              <span className="relative inline-block text-emerald-ink">
                {emphasis}
                <svg aria-hidden viewBox="0 0 300 16" preserveAspectRatio="none" className="absolute -bottom-2 left-0 h-3 w-full text-gold sm:-bottom-3">
                  <path d="M3 11C70 4 160 2 297 8" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                </svg>
              </span>
            </h1>
            <p className="mt-9 max-w-xl text-lg leading-relaxed text-muted sm:text-xl">{intro}</p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/membership" size="lg" arrow>
                Become a member
              </ButtonLink>
              <ButtonLink href="/services" size="lg" variant="outline">
                Explore our work
              </ButtonLink>
            </div>
          </HeroMotion>

          <div className="mt-14 border-t border-line pt-6">
            <p className="text-xs font-semibold tracking-[0.14em] text-muted uppercase">Registered objectives include</p>
            <ul className="mt-4 flex flex-wrap gap-x-8 gap-y-3">
              {pillars.map(({ Icon, label }) => (
                <li key={label} className="flex items-center gap-2.5 font-display font-semibold text-forest">
                  <Icon aria-hidden className="size-5 text-emerald" />
                  {label}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="relative lg:col-span-5">
          <div className="relative mx-auto w-full max-w-[26rem] lg:mr-0 lg:max-w-none">
            <HeroIllustration className="h-auto w-full drop-shadow-[0_30px_40px_rgba(14,42,34,0.25)]" />
            <div className="absolute -bottom-6 -left-2 max-w-[13rem] rounded-2xl bg-white p-4 shadow-[0_18px_40px_-20px_rgba(14,42,34,0.5)] sm:-left-8 sm:p-5 lg:-left-12">
              <p className="eyebrow text-gold-ink">Our vision</p>
              <p className="mt-2 font-display text-[1.05rem] leading-snug font-bold text-forest">A future built on compassion.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
