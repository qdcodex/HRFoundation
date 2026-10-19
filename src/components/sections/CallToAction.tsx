import type { ReactNode } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";

/** Closing call-to-action band used at the end of pages. */
export function CallToAction({
  title = "Every act of kindness builds a better tomorrow.",
  text = "Become a member, support our mission with a donation, or ask us a question. We would be glad to hear from you.",
  primary = { label: "Become a member", href: "/membership" },
  secondary = { label: "Donate", href: "/donate" },
}: {
  title?: ReactNode;
  text?: ReactNode;
  primary?: { label: string; href: string };
  secondary?: { label: string; href: string };
}) {
  return (
    <section className="bg-ivory py-16 sm:py-24" aria-labelledby="cta-heading">
      <div className="container-site">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2rem] bg-forest px-6 py-14 text-ivory sm:px-12 lg:px-16 lg:py-20">
            <svg aria-hidden viewBox="0 0 600 600" className="pointer-events-none absolute -right-40 -bottom-56 h-[36rem] w-[36rem] text-gold/25">
              {[260, 210, 160, 110].map((r) => (
                <circle key={r} cx="300" cy="300" r={r} fill="none" stroke="currentColor" />
              ))}
              <circle cx="300" cy="300" r="60" fill="currentColor" className="text-gold/40" />
            </svg>
            <div className="relative grid gap-10 lg:grid-cols-12 lg:items-end">
              <div className="lg:col-span-8">
                <p className="eyebrow mb-5 text-gold">Join us</p>
                <h2 id="cta-heading" className="display-lg text-ivory">
                  {title}
                </h2>
                <p className="mt-6 max-w-xl text-lg leading-relaxed text-ivory/80">{text}</p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row lg:col-span-4 lg:flex-col lg:items-stretch">
                <ButtonLink href={primary.href} variant="gold" size="lg" arrow>
                  {primary.label}
                </ButtonLink>
                <ButtonLink href={secondary.href} variant="outline-light" size="lg">
                  {secondary.label}
                </ButtonLink>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
