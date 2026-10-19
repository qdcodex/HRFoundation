import { LegalPage } from "@/components/sections/LegalPage";
import { getPage } from "@/lib/cms";
import { cmsPageMetadata } from "@/lib/metadata";

export function generateMetadata() {
  return cmsPageMetadata("privacy-policy", "/privacy-policy");
}

export default async function Page() {
  const page = await getPage("privacy-policy");
  return <LegalPage label="Privacy policy" title={page.title} updated="Draft — awaiting approval" intro={page.intro} body={page.body} />;
}
