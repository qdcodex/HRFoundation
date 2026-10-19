import { LegalPage } from "@/components/sections/LegalPage";
import { getPage } from "@/lib/cms";
import { cmsPageMetadata } from "@/lib/metadata";

export function generateMetadata() {
  return cmsPageMetadata("terms", "/terms");
}

export default async function Page() {
  const page = await getPage("terms");
  return <LegalPage label="Terms of use" title={page.title} updated="Draft — awaiting approval" intro={page.intro} body={page.body} />;
}
