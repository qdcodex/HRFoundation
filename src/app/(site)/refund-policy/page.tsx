import { LegalPage } from "@/components/sections/LegalPage";
import { getPage } from "@/lib/cms";
import { cmsPageMetadata } from "@/lib/metadata";

export function generateMetadata() {
  return cmsPageMetadata("refund-policy", "/refund-policy");
}

export default async function Page() {
  const page = await getPage("refund-policy");
  return <LegalPage label="Refund & cancellation policy" title={page.title} updated="Last updated 26 October 2026" intro={page.intro} body={page.body} />;
}
