import { Receipt, ScrollText } from "lucide-react";
import { CallToAction } from "@/components/sections/CallToAction";
import { DocumentList } from "@/components/sections/DocumentList";
import { PageHero } from "@/components/sections/PageHero";
import { RegistrationFacts } from "@/components/sections/RegistrationFacts";
import { PendingNote } from "@/components/ui/States";
import { getPublicDocuments } from "@/lib/cms";
import { cmsPageMetadata } from "@/lib/metadata";
import { getPage } from "@/lib/cms";

export function generateMetadata() {
  return cmsPageMetadata("documents", "/documents");
}

export default async function DocumentsPage() {
  const [page, documents] = await Promise.all([getPage("documents"), getPublicDocuments()]);
  return (
    <>
      <PageHero
        crumbs={[{ label: "Documents" }]}
        eyebrow="Transparency"
        title={page.title}
        intro={page.intro}
      />

      <section className="bg-ivory py-16 sm:py-24">
        <div className="container-site grid gap-14 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <DocumentList documents={documents} />
            <PendingNote className="mt-10">
              Documents will be made downloadable after the foundation approves them for publication and personal details (such
              as trustees&apos; identity numbers and signatures) have been removed.
            </PendingNote>
          </div>

          <aside className="space-y-6 lg:col-span-5" aria-label="Registration summary and receipt information">
            <div className="rounded-[2rem] bg-white p-7 ring-1 ring-line">
              <h2 className="flex items-center gap-3 font-display text-xl font-bold text-forest">
                <ScrollText aria-hidden className="size-5 text-emerald" /> Registration summary
              </h2>
              <RegistrationFacts className="mt-3" />
            </div>

            <div className="rounded-[2rem] bg-forest p-7 text-ivory">
              <h2 className="flex items-center gap-3 font-display text-xl font-bold">
                <Receipt aria-hidden className="size-5 text-gold" /> Foundation documents vs. donation receipts
              </h2>
              <div className="mt-4 space-y-3 leading-relaxed text-ivory/80">
                <p>
                  <strong className="text-ivory">Foundation documents</strong> (such as the trust deed or registrations) describe
                  how H R Foundation is constituted. They are not proof of an individual donation.
                </p>
                <p>
                  <strong className="text-ivory">A donation receipt</strong> is issued to an individual donor for a specific
                  contribution. To request one, contact us with your name and UPI transaction reference.
                </p>
                <p className="text-sm text-ivory/65">
                  Information about tax-deduction eligibility will be published only after the relevant approval is received.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <CallToAction />
    </>
  );
}
