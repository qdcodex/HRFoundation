import type { Metadata } from "next";
import { HandCoins, Handshake, UserRoundPlus } from "lucide-react";
import { HeroSection } from "@/components/home/HeroSection";
import { CallToAction } from "@/components/sections/CallToAction";
import { ImpactSection } from "@/components/sections/ImpactSection";
import { ServiceIndex } from "@/components/sections/ServiceIndex";
import { UpdatesList } from "@/components/sections/UpdatesList";
import { ButtonLink, TextLink } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { getNews, getPage, getServices } from "@/lib/cms";
import { pageMetadata } from "@/lib/metadata";
import { formatPaise } from "@/lib/money";
import { publicSettings } from "@/lib/settings";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage("home");
  return { ...pageMetadata({ title: page.seoTitle, description: page.seoDescription, path: "/" }), title: { absolute: page.seoTitle } };
}

export default async function HomePage() {
  const [page, enabledServices, news, rules] = await Promise.all([getPage("home"), getServices(), getNews(), publicSettings("membershipRules")]);
  const confirmed = enabledServices.filter((s) => s.status === "registered-objective");
  const upcoming = enabledServices.filter((s) => s.status !== "registered-objective");

  return (
    <>
      <HeroSection title={page.title} intro={page.intro} />

      {/* B. Introduction */}
      <section className="border-t border-line bg-ivory py-20 sm:py-28" aria-labelledby="intro-heading">
        <div className="container-site grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <p className="eyebrow flex items-center gap-3 text-gold-ink">
              <span className="tabular-nums">01</span>
              <span aria-hidden className="h-px w-8 bg-gold" />
              Who we are
            </p>
            <h2 id="intro-heading" className="display-md mt-5 text-forest">
              A young trust with a clear purpose: to help people move forward with dignity.
            </h2>
          </div>
          <Reveal className="lg:col-span-6 lg:col-start-7">
            <div className="prose-site text-muted">
              <p className="text-xl leading-relaxed text-charcoal">
                H R Foundation is a charitable trust registered in Peddapalli, Telangana, in December 2024.
              </p>
              <p>
                The trust was established for the relief of the poor, education, medical relief, care for the environment and
                heritage, and other work of general public utility. Our first focus is on helping students learn and helping
                families cope with the cost of illness.
              </p>
              <p>
                We are at the beginning of our journey. As programmes are approved, we will share exactly what we do, who can
                ask for help, and how decisions are made.
              </p>
            </div>
            <TextLink href="/about" className="mt-8">
              About H R Foundation
            </TextLink>
          </Reveal>
        </div>
      </section>

      {/* C. Services */}
      <section className="grain bg-forest py-20 text-ivory sm:py-28" aria-labelledby="services-heading">
        <div className="container-site">
          <SectionHeading
            id="services-heading"
            tone="dark"
            index="02"
            eyebrow="Our services"
            align="split"
            title="Where our compassion turns into action."
            intro="Education and medical relief are among the objectives the trust is registered for. Other programmes are marked clearly until they are confirmed."
          />

          <h3 className="eyebrow mt-16 mb-2 text-ivory/60">Registered objectives</h3>
          <ServiceIndex services={confirmed} />

          {upcoming.length > 0 && (
            <>
              <h3 className="eyebrow mt-14 mb-2 text-ivory/60">Under consideration</h3>
              <ServiceIndex services={upcoming} startIndex={confirmed.length + 1} />
            </>
          )}

          <div className="mt-12">
            <ButtonLink href="/services" variant="outline-light" arrow>
              View all services
            </ButtonLink>
          </div>
        </div>
      </section>

      {/* D. Approach */}
      <section className="bg-ivory py-20 sm:py-28" aria-labelledby="approach-heading">
        <div className="container-site">
          <SectionHeading
            id="approach-heading"
            index="03"
            eyebrow="Our approach"
            title="Simple, open and personal."
            intro="Whether you want to understand our work, ask for information or offer support, here is how to connect with H R Foundation."
          />
          <ol className="mt-16 grid gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-2 lg:grid-cols-4">
            {[
              { title: "Learn", text: "Read about our registered objectives and the programmes we are preparing.", href: "/services", cta: "Our services" },
              { title: "Talk to us", text: "Ask a question or share a need. We will respond as soon as we can.", href: "/contact", cta: "Contact us" },
              { title: "Support", text: "Donate through our approved UPI channel, or offer your time and skills.", href: "/donate", cta: "Ways to give" },
              { title: "Explore membership", text: "Read about the proposed membership scheme and its terms before you apply.", href: "/membership", cta: "Membership" },
            ].map((step, i) => (
              <li key={step.title} className="flex flex-col bg-ivory p-7 lg:p-8">
                <span aria-hidden className="font-display text-6xl font-extrabold tracking-tighter text-transparent [-webkit-text-stroke:1.5px_var(--color-gold)]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-6 font-display text-xl font-bold text-forest">
                  <span className="sr-only">Step {i + 1}: </span>
                  {step.title}
                </h3>
                <p className="mt-3 flex-1 leading-relaxed text-muted">{step.text}</p>
                <TextLink href={step.href} className="mt-6 text-sm">
                  {step.cta}
                </TextLink>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* E. Impact & transparency */}
      <ImpactSection />

      {/* F. Support the mission */}
      <section className="bg-ivory py-20 sm:py-28" aria-labelledby="support-heading">
        <div className="container-site">
          <SectionHeading
            id="support-heading"
            index="05"
            eyebrow="Support the mission"
            title="Three ways to stand with us."
          />
          <div className="mt-14 grid gap-5 lg:grid-cols-12">
            <Reveal className="lg:col-span-7">
              <div className="relative flex h-full flex-col justify-between overflow-hidden rounded-[2rem] bg-forest p-8 text-ivory sm:p-12">
                <svg aria-hidden viewBox="0 0 200 200" className="absolute -top-16 -right-16 size-72 text-gold/20">
                  <path d="M20 200V100a80 80 0 0 1 160 0v100" fill="none" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M50 200V105a50 50 0 0 1 100 0v95" fill="none" stroke="currentColor" strokeWidth="1.2" />
                </svg>
                <div className="relative">
                  <HandCoins aria-hidden className="size-10 text-gold" />
                  <h3 className="display-md mt-8 text-ivory">Donate</h3>
                  <p className="mt-4 max-w-md text-lg leading-relaxed text-ivory/80">
                    Your contribution helps the foundation prepare and run its charitable work. Give securely through our
                    approved UPI QR code.
                  </p>
                </div>
                <div className="relative mt-10">
                  <ButtonLink href="/donate" variant="gold" size="lg" arrow>
                    Donate now
                  </ButtonLink>
                </div>
              </div>
            </Reveal>
            <div className="grid gap-5 lg:col-span-5">
              <Reveal delay={0.08}>
                <div className="flex h-full flex-col rounded-[2rem] border border-line bg-white p-8">
                  <UserRoundPlus aria-hidden className="size-8 text-emerald" />
                  <h3 className="mt-5 font-display text-2xl font-bold text-forest">Become a member</h3>
                  <p className="mt-3 flex-1 leading-relaxed text-muted">
                    Learn about the proposed membership scheme, including possible death-benefit support of up to{" "}
                    {formatPaise(rules.maxBenefitPaise)} for eligible members, subject to approved terms.
                  </p>
                  <TextLink href="/membership" className="mt-6">
                    Membership details
                  </TextLink>
                </div>
              </Reveal>
              <Reveal delay={0.14}>
                <div className="flex h-full flex-col rounded-[2rem] bg-sage p-8">
                  <Handshake aria-hidden className="size-8 text-forest" />
                  <h3 className="mt-5 font-display text-2xl font-bold text-forest">Get involved</h3>
                  <p className="mt-3 flex-1 leading-relaxed text-muted">
                    Volunteer your time and skills, or explore a partnership with the foundation.
                  </p>
                  <TextLink href="/get-involved" className="mt-6">
                    Volunteer or partner
                  </TextLink>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* G. Latest updates */}
      <section className="border-t border-line bg-ivory-deep/60 py-20 sm:py-24" aria-labelledby="updates-heading">
        <div className="container-site">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <SectionHeading id="updates-heading" index="06" eyebrow="Latest updates" title="News from the foundation." />
            {news.length > 0 && <TextLink href="/news">All news</TextLink>}
          </div>
          <div className="mt-12">
            <UpdatesList items={news} limit={3} />
          </div>
        </div>
      </section>

      {/* H. Final call to action */}
      <CallToAction />
    </>
  );
}
