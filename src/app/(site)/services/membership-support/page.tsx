import { notFound } from "next/navigation";
import { MembershipConditions } from "@/components/sections/MembershipConditions";
import { ServiceDetail } from "@/components/sections/ServiceDetail";
import { ButtonLink } from "@/components/ui/Button";
import { PendingNote } from "@/components/ui/States";
import { getService } from "@/lib/cms";
import { publicSettings } from "@/lib/settings";
import { pageMetadata } from "@/lib/metadata";

export async function generateMetadata() {
  const service = await getService("membership-support");
  return service ? pageMetadata({ title: service.seoTitle || service.title, description: service.metaDescription, path: service.href }) : {};
}

export default async function Page() {
  const [service, rules] = await Promise.all([getService("membership-support"), publicSettings("membershipRules")]);
  if (!service) notFound();
  return (
    <ServiceDetail service={service} extraSections={[{ id: "provision", label: "Proposed provision" }]}>
      <section id="provision" aria-labelledby="provision-h" className="scroll-mt-28">
        <h2 id="provision-h" className="display-md text-forest">
          The proposed death-benefit provision
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-muted">
          The foundation has proposed the following conditions. They will apply only once the scheme&apos;s terms and legal
          status are formally approved.
        </p>
        <div className="mt-8">
          <MembershipConditions rules={rules} />
        </div>
        <PendingNote className="mt-6">
          The final rules, exclusions and funding arrangements are still to be approved by the foundation.
        </PendingNote>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <ButtonLink href="/membership" arrow>
            Membership & registration
          </ButtonLink>
          <ButtonLink href="/membership/terms" variant="outline">
            Read the proposed terms
          </ButtonLink>
        </div>
      </section>
    </ServiceDetail>
  );
}
