import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight, CalendarClock, MessageCircle } from "lucide-react";
import { statusLabels } from "@/content/services";
import { getActivities, getServices, type PublicService } from "@/lib/cms";
import { ButtonLink } from "@/components/ui/Button";
import { ServiceIcon } from "@/components/ui/ServiceIcon";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState, PendingNote } from "@/components/ui/States";
import { CallToAction } from "./CallToAction";
import { SiteMembershipBanner } from "./MembershipPromo";
import { PageHero } from "./PageHero";

type Section = { id: string; label: string };

/** Shared layout for every service page. Content comes from src/content/services.ts. */
export async function ServiceDetail({
  service,
  children,
  extraSections = [],
}: {
  service: PublicService;
  /** Additional service-specific sections, rendered after the overview. */
  children?: ReactNode;
  extraSections?: Section[];
}) {
  const status = statusLabels[service.status];
  const [allServices, activities] = await Promise.all([getServices(), getActivities()]);
  const related = allServices.filter((s) => s.slug !== service.slug);
  const linkedActivities = activities.filter((a) => a.serviceSlug === service.slug);

  const sections: Section[] = [
    { id: "overview", label: "Overview" },
    ...extraSections,
    { id: "objectives", label: "Objectives" },
    { id: "activities", label: "Approved activities" },
    ...(service.eligibility ? [{ id: "eligibility", label: "Eligibility" }] : []),
    { id: "enquire", label: "How to enquire" },
    { id: "related", label: "Related" },
  ];

  return (
    <>
      <PageHero
        crumbs={[{ label: "Services", href: "/services" }, { label: service.shortTitle }]}
        title={service.title}
        intro={service.summary}
        aside={
          <div className="flex items-end justify-between gap-6 rounded-[2rem] bg-forest p-7 text-ivory lg:ml-auto lg:max-w-sm lg:flex-col lg:items-start">
            <ServiceIcon name={service.icon} className="size-16 text-ivory lg:size-20" />
            <div>
              <p className="text-sm text-ivory/70">Current status</p>
              <StatusBadge tone={status.tone} onDark className="mt-2">
                {status.label}
              </StatusBadge>
            </div>
          </div>
        }
      />

      <div className="bg-ivory py-16 sm:py-20">
        <div className="container-site grid gap-12 lg:grid-cols-12">
          <aside className="lg:col-span-3">
            <nav aria-label="On this page" className="lg:sticky lg:top-28">
              <p className="eyebrow text-gold-ink">On this page</p>
              <ul className="mt-4 flex flex-wrap gap-2 lg:flex-col lg:gap-0 lg:border-l lg:border-line">
                {sections.map((s) => (
                  <li key={s.id}>
                    <a
                      href={`#${s.id}`}
                      className="block rounded-full border border-line px-3 py-1.5 text-sm text-muted hover:border-forest hover:text-forest lg:-ml-px lg:rounded-none lg:border-0 lg:border-l-2 lg:border-transparent lg:px-4 lg:py-2 lg:hover:border-gold"
                    >
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>

          <div className="space-y-16 lg:col-span-8 lg:col-start-5">
            <section id="overview" aria-labelledby="overview-h" className="scroll-mt-28">
              <h2 id="overview-h" className="display-md text-forest">
                Overview
              </h2>
              <div className="prose-site mt-6">
                {service.overview.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
              {service.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={service.imageUrl} alt={service.imageAlt ?? ""} className="mt-8 w-full rounded-2xl border border-line object-cover" loading="lazy" />
              )}
            </section>

            {children}

            <section id="objectives" aria-labelledby="objectives-h" className="scroll-mt-28">
              <h2 id="objectives-h" className="display-md text-forest">
                Objectives
              </h2>
              <ol className="mt-6 grid gap-4 sm:grid-cols-3">
                {service.objectives.map((o, i) => (
                  <li key={o} className="rounded-2xl border border-line bg-white p-6">
                    <span className="font-display text-sm font-bold text-gold-ink">{String(i + 1).padStart(2, "0")}</span>
                    <p className="mt-3 leading-relaxed text-charcoal">{o}</p>
                  </li>
                ))}
              </ol>
            </section>

            <section id="activities" aria-labelledby="activities-h" className="scroll-mt-28">
              <h2 id="activities-h" className="display-md text-forest">
                Approved activities
              </h2>
              {service.approvedActivities.length > 0 || linkedActivities.length > 0 ? (
                <ul className="mt-6 divide-y divide-line border-y border-line">
                  {service.approvedActivities.map((a) => (
                    <li key={a.title} className="py-5">
                      <h3 className="font-display text-lg font-bold text-forest">{a.title}</h3>
                      <p className="mt-1 text-muted">{a.description}</p>
                    </li>
                  ))}
                  {linkedActivities.map((a) => (
                    <li key={a.slug} className="py-5">
                      <h3 className="font-display text-lg font-bold text-forest">{a.title}</h3>
                      <p className="mt-1 text-muted">{a.summary}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  className="mt-6"
                  title="No activities announced yet"
                  icon={<CalendarClock aria-hidden className="size-6" />}
                >
                  Approved activities will be listed here once the trustees confirm them.
                </EmptyState>
              )}

              {service.potentialInitiatives.length > 0 && (
                <div className="mt-8 rounded-2xl bg-sage p-6 sm:p-8">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="font-display text-lg font-bold text-forest">Ideas under consideration</h3>
                    <StatusBadge tone="proposed">Proposed — not yet operational</StatusBadge>
                  </div>
                  <ul className="prose-site mt-4">
                    {service.potentialInitiatives.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                  <p className="mt-4 text-sm text-muted">
                    These are possibilities being considered by the foundation. They are not current services.
                  </p>
                </div>
              )}
            </section>

            {service.eligibility && (
              <section id="eligibility" aria-labelledby="eligibility-h" className="scroll-mt-28">
                <h2 id="eligibility-h" className="display-md text-forest">
                  Eligibility
                </h2>
                <div className="mt-6 space-y-3">
                  {service.eligibility.map((e) => (
                    <PendingNote key={e}>{e}</PendingNote>
                  ))}
                </div>
              </section>
            )}

            <section id="enquire" aria-labelledby="enquire-h" className="scroll-mt-28">
              <div className="flex flex-col gap-6 rounded-[2rem] border border-line bg-white p-7 sm:flex-row sm:items-center sm:p-10">
                <span className="grid size-14 shrink-0 place-items-center rounded-full bg-gold-soft text-forest">
                  <MessageCircle aria-hidden className="size-6" />
                </span>
                <div className="flex-1">
                  <h2 id="enquire-h" className="font-display text-2xl font-bold text-forest">
                    How to enquire
                  </h2>
                  <p className="mt-2 leading-relaxed text-muted">{service.enquiry}</p>
                </div>
                <ButtonLink href="/contact" arrow className="shrink-0">
                  Contact us
                </ButtonLink>
              </div>
            </section>

            <section id="related" aria-labelledby="related-h" className="scroll-mt-28">
              <h2 id="related-h" className="display-md text-forest">
                Related resources
              </h2>
              <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                {[
                  ...related.map((s) => ({ href: s.href, label: s.title, note: statusLabels[s.status].label })),
                  { href: "/documents", label: "Public documents", note: "Registration details" },
                  { href: "/donate", label: "Support this work", note: "Donate via UPI" },
                ].map((r) => (
                  <li key={r.href}>
                    <Link
                      href={r.href}
                      className="group flex items-center justify-between gap-4 rounded-2xl border border-line bg-white px-5 py-4 transition-colors hover:border-forest"
                    >
                      <span>
                        <span className="block font-display font-bold text-forest">{r.label}</span>
                        <span className="text-sm text-muted">{r.note}</span>
                      </span>
                      <ArrowUpRight aria-hidden className="size-5 text-forest transition-transform group-hover:rotate-45" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      </div>

      {service.slug !== "membership-support" && <SiteMembershipBanner />}
      <CallToAction />
    </>
  );
}
