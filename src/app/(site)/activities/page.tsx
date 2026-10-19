import { CalendarClock, MapPin } from "lucide-react";
import { CallToAction } from "@/components/sections/CallToAction";
import { SiteMembershipBanner } from "@/components/sections/MembershipPromo";
import { PageHero } from "@/components/sections/PageHero";
import { ButtonLink } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/States";
import { formatDate, sortByDateDesc } from "@/content/updates";
import { getActivities } from "@/lib/cms";
import { cmsPageMetadata } from "@/lib/metadata";
import { getPage } from "@/lib/cms";

export function generateMetadata() {
  return cmsPageMetadata("activities", "/activities");
}

export default async function ActivitiesPage() {
  const [page, activities] = await Promise.all([getPage("activities"), getActivities()]);
  const planned = sortByDateDesc(activities.filter((a) => a.status === "planned"));
  const completed = sortByDateDesc(activities.filter((a) => a.status === "completed"));

  return (
    <>
      <PageHero
        crumbs={[{ label: "Activities" }]}
        eyebrow="Our work"
        title={page.title}
        intro={page.intro}
      />

      <section className="bg-ivory py-16 sm:py-24" aria-label="Activities">
        <div className="container-site">
          {activities.length === 0 ? (
            <EmptyState
              headingLevel="h2"
              title="Our first activities are being planned"
              icon={<CalendarClock aria-hidden className="size-6" />}
              action={
                <>
                  <ButtonLink href="/get-involved">Volunteer with us</ButtonLink>
                  <ButtonLink href="/services" variant="outline">
                    Read about our objectives
                  </ButtonLink>
                </>
              }
            >
              H R Foundation was registered in December 2024. When the trustees approve our first activities, they will appear
              here with dates and details.
            </EmptyState>
          ) : (
            <div className="space-y-16">
              {[
                { title: "Upcoming and planned", items: planned, tone: "pending" as const },
                { title: "Completed", items: completed, tone: "confirmed" as const },
              ]
                .filter((g) => g.items.length > 0)
                .map((group) => (
                  <div key={group.title}>
                    <h2 className="display-md text-forest">{group.title}</h2>
                    <ul className="mt-8 grid gap-5 md:grid-cols-2">
                      {group.items.map((a) => (
                        <li key={a.slug} className="rounded-2xl border border-line bg-white p-7">
                          <StatusBadge tone={group.tone}>{a.status === "completed" ? "Completed" : "Planned"}</StatusBadge>
                          <h3 className="mt-4 font-display text-xl font-bold text-forest">{a.title}</h3>
                          <p className="mt-2 text-sm text-muted">
                            <time dateTime={a.date}>{formatDate(a.date)}</time>
                            {a.location && (
                              <span className="ml-3 inline-flex items-center gap-1">
                                <MapPin aria-hidden className="size-3.5" /> {a.location}
                              </span>
                            )}
                          </p>
                          <p className="mt-4 leading-relaxed text-charcoal">{a.summary}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
            </div>
          )}
        </div>
      </section>

      <SiteMembershipBanner />
      <CallToAction />
    </>
  );
}
