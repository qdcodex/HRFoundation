import { Building2, HandHeart, Megaphone } from "lucide-react";
import { InvolvementForm } from "@/components/forms/InvolvementForm";
import { PageHero } from "@/components/sections/PageHero";
import { TextLink } from "@/components/ui/Button";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { cmsPageMetadata } from "@/lib/metadata";
import { getPage } from "@/lib/cms";

export function generateMetadata() {
  return cmsPageMetadata("get-involved", "/get-involved");
}

const ways = [
  {
    Icon: HandHeart,
    title: "Volunteer",
    text: "Offer your time and skills — teaching, organising, health awareness, administration or simply a helping hand when activities begin.",
  },
  {
    Icon: Building2,
    title: "Partner",
    text: "Schools, hospitals, businesses and community groups can explore working with the foundation on its registered objectives.",
  },
  {
    Icon: Megaphone,
    title: "Spread the word",
    text: "Tell friends and family about the foundation, and help us reach people who may need support or want to give it.",
  },
];

export default async function GetInvolvedPage() {
  const page = await getPage("get-involved");
  return (
    <>
      <PageHero
        crumbs={[{ label: "Get Involved" }]}
        eyebrow="Get involved"
        title={page.title}
        intro={page.intro}
      />

      <section className="bg-ivory py-16 sm:py-20" aria-labelledby="ways-heading">
        <div className="container-site">
          <h2 id="ways-heading" className="sr-only">
            Ways to get involved
          </h2>
          <ul className="grid gap-px overflow-hidden rounded-[2rem] border border-line bg-line md:grid-cols-3">
            {ways.map(({ Icon, title, text }) => (
              <li key={title} className="bg-ivory p-8">
                <Icon aria-hidden className="size-8 text-emerald" />
                <h3 className="mt-5 font-display text-2xl font-bold text-forest">{title}</h3>
                <p className="mt-3 leading-relaxed text-muted">{text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-sage py-16 sm:py-24" aria-labelledby="enquiry-heading">
        <div className="container-site grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <SectionHeading
              id="enquiry-heading"
              eyebrow="Volunteer & partnership enquiry"
              title="Tell us about yourself."
              intro="As H R Foundation is preparing its first activities, we will contact you when there is a suitable opportunity."
            />
            <div className="mt-8 space-y-3">
              <TextLink href="/donate">Prefer to donate?</TextLink>
              <br />
              <TextLink href="/membership">Explore membership</TextLink>
            </div>
          </div>
          <div className="rounded-[2rem] bg-ivory p-6 sm:p-10 lg:col-span-8">
            <InvolvementForm />
          </div>
        </div>
      </section>
    </>
  );
}
