import { Compass, Eye, HeartHandshake, Users } from "lucide-react";
import { CallToAction } from "@/components/sections/CallToAction";
import { SiteMembershipBanner } from "@/components/sections/MembershipPromo";
import { PageHero } from "@/components/sections/PageHero";
import { RegistrationFacts } from "@/components/sections/RegistrationFacts";
import { BrandLogo } from "@/components/ui/Brand";
import { TextLink } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { PendingNote } from "@/components/ui/States";
import { registeredObjects } from "@/content/site";
import { cmsPageMetadata } from "@/lib/metadata";
import { getPage } from "@/lib/cms";

export function generateMetadata() {
  return cmsPageMetadata("about", "/about");
}

const values = [
  { Icon: HeartHandshake, title: "Compassion", text: "We treat every person who comes to us with kindness, patience and respect." },
  { Icon: Eye, title: "Transparency", text: "We share what we do, how decisions are made and how support is used." },
  { Icon: Users, title: "Fairness", text: "Support will follow clear criteria, so that help reaches those who need it most." },
  { Icon: Compass, title: "Responsibility", text: "We are careful with every rupee and every piece of personal information entrusted to us." },
];

export default async function AboutPage() {
  const page = await getPage("about");
  return (
    <>
      <PageHero
        crumbs={[{ label: "About" }]}
        eyebrow="About H R Foundation"
        title={page.title}
        intro={page.intro}
      />

      <section className="bg-ivory py-20 sm:py-24" aria-labelledby="story-heading">
        <div className="container-site grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <SectionHeading id="story-heading" eyebrow="Who we are" title="Built on a simple belief." />
            <figure className="mt-10 max-w-sm rounded-[2rem] border border-line bg-white p-8">
              <BrandLogo sizes="(min-width: 1024px) 320px, 80vw" />
              <figcaption className="sr-only">The H R Foundation emblem: the letters H and R around a growing plant and a person with raised arms.</figcaption>
            </figure>
          </div>
          <Reveal className="prose-site lg:col-span-7">
            <p className="text-xl text-charcoal">
              Every person deserves the chance to learn, to receive care when they are unwell, and to live with dignity.
            </p>
            <p>
              H R Foundation is a trust established under a registered instrument. It was created to turn that belief into
              practical help for people in Telangana — starting with education and medical relief.
            </p>
            <p>
              We are a new organisation. Rather than make promises we cannot yet keep, we are building our programmes carefully,
              with clear rules and proper records. This website will grow as our work does.
            </p>
            <PendingNote>
              <strong>For the foundation to complete:</strong> the story of how H R Foundation began, and the motivation of its
              founders, will be added here once approved.
            </PendingNote>
          </Reveal>
        </div>
      </section>

      <section className="bg-forest py-20 text-ivory sm:py-24" aria-labelledby="mission-heading">
        <div className="container-site grid gap-px overflow-hidden rounded-[2rem] bg-ivory/15 md:grid-cols-2">
          <div className="bg-forest p-8 sm:p-12">
            <p className="eyebrow text-gold">Our mission</p>
            <h2 id="mission-heading" className="display-md mt-5 text-ivory">
              To widen access to education and medical relief, and to support people facing hardship — fairly, openly and with
              compassion.
            </h2>
          </div>
          <div className="bg-forest-soft p-8 sm:p-12">
            <p className="eyebrow text-gold">Our vision</p>
            <p className="display-md mt-5 text-ivory">A future built on compassion, where no one is held back by poverty or illness.</p>
          </div>
        </div>
      </section>

      <section className="bg-ivory py-20 sm:py-24" aria-labelledby="objects-heading">
        <div className="container-site grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <SectionHeading
              id="objects-heading"
              eyebrow="Registered objects"
              title="What the trust was created to do."
              intro="These are the charitable objects recorded in the foundation's registration. They describe our purpose; specific programmes are announced separately once approved."
            />
            <TextLink href="/services" className="mt-8">
              See our services
            </TextLink>
          </div>
          <ol className="lg:col-span-7">
            {registeredObjects.map((object, i) => (
              <li key={object} className="flex items-baseline gap-6 border-b border-line py-5 first:border-t">
                <span className="font-display text-sm font-bold text-gold-ink tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                <span className="font-display text-lg font-semibold text-forest sm:text-xl">{object}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-sage py-20 sm:py-24" aria-labelledby="values-heading">
        <div className="container-site">
          <SectionHeading id="values-heading" eyebrow="Our values" title="How we intend to work." />
          <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {values.map(({ Icon, title, text }, i) => (
              <li key={title}>
                <Reveal delay={i * 0.05} className="h-full rounded-2xl bg-ivory p-7">
                  <Icon aria-hidden className="size-7 text-emerald" />
                  <h3 className="mt-5 font-display text-xl font-bold text-forest">{title}</h3>
                  <p className="mt-2 leading-relaxed text-muted">{text}</p>
                </Reveal>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-ivory py-20 sm:py-24" aria-labelledby="governance-heading">
        <div className="container-site grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <SectionHeading
              id="governance-heading"
              eyebrow="Governance"
              title="Registration and trustees."
              intro="H R Foundation is managed by its trustees in accordance with its registered trust deed."
            />
          </div>
          <div className="space-y-8 lg:col-span-7">
            <RegistrationFacts />
            <PendingNote>
              <strong>Trustee profiles:</strong> names, roles and short profiles of the trustees will be published here once the
              foundation approves them for public display.
            </PendingNote>
            <TextLink href="/contact">Connect with us</TextLink>
          </div>
        </div>
      </section>

      <SiteMembershipBanner />
      <CallToAction />
    </>
  );
}
