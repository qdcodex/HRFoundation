import { CallToAction } from "@/components/sections/CallToAction";
import { PageHero } from "@/components/sections/PageHero";
import { ServiceIndex } from "@/components/sections/ServiceIndex";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { statusLabels } from "@/content/services";
import { getServices } from "@/lib/cms";
import { registeredObjects } from "@/content/site";
import { cmsPageMetadata } from "@/lib/metadata";
import { getPage } from "@/lib/cms";

export function generateMetadata() {
  return cmsPageMetadata("services", "/services");
}

export default async function ServicesPage() {
  const [page, enabledServices] = await Promise.all([getPage("services"), getServices()]);
  const confirmed = enabledServices.filter((s) => s.status === "registered-objective");
  const upcoming = enabledServices.filter((s) => s.status !== "registered-objective");

  return (
    <>
      <PageHero
        crumbs={[{ label: "Services" }]}
        eyebrow="Services & programmes"
        title={page.title}
        intro={page.intro}
      >
        <ul className="flex flex-wrap gap-3" aria-label="Status labels used on this page">
          {Object.values(statusLabels).map((s) => (
            <li key={s.label}>
              <StatusBadge tone={s.tone}>{s.label}</StatusBadge>
            </li>
          ))}
        </ul>
      </PageHero>

      <section className="bg-ivory py-16 sm:py-24" aria-labelledby="confirmed-heading">
        <div className="container-site">
          <SectionHeading
            id="confirmed-heading"
            index="01"
            eyebrow="Registered objectives"
            title="Education and medical relief."
            intro="These areas are among the objects the trust was registered for. Programme details will be added as they are approved."
          />
          <div className="mt-12">
            <ServiceIndex services={confirmed} tone="light" />
          </div>
        </div>
      </section>

      {upcoming.length > 0 && (
        <section className="bg-forest py-16 text-ivory sm:py-24" aria-labelledby="upcoming-heading">
          <div className="container-site">
            <SectionHeading
              id="upcoming-heading"
              tone="dark"
              index="02"
              eyebrow="Under consideration"
              title="Proposed and pending programmes."
              intro="These pages explain ideas the foundation is developing. They are not established services."
            />
            <div className="mt-12">
              <ServiceIndex services={upcoming} startIndex={confirmed.length + 1} />
            </div>
          </div>
        </section>
      )}

      <section className="bg-sage py-16 sm:py-20" aria-labelledby="all-objects-heading">
        <div className="container-site grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <h2 id="all-objects-heading" className="display-md text-forest">
              All registered objects of the trust
            </h2>
            <p className="mt-4 leading-relaxed text-muted">
              For completeness, these are all the charitable objects recorded in the foundation&apos;s registration.
            </p>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2 lg:col-span-7">
            {registeredObjects.map((o) => (
              <li key={o} className="rounded-xl bg-ivory px-5 py-4 font-display font-semibold text-forest">
                {o}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <CallToAction />
    </>
  );
}
