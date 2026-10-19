import { CallToAction } from "@/components/sections/CallToAction";
import { PageHero } from "@/components/sections/PageHero";
import { UpdatesList } from "@/components/sections/UpdatesList";
import { getNews } from "@/lib/cms";
import { cmsPageMetadata } from "@/lib/metadata";
import { getPage } from "@/lib/cms";

export function generateMetadata() {
  return cmsPageMetadata("news", "/news");
}

export default async function NewsPage() {
  const [page, news] = await Promise.all([getPage("news"), getNews()]);
  return (
    <>
      <PageHero
        crumbs={[{ label: "News" }]}
        eyebrow="News & announcements"
        title={page.title}
        intro={page.intro}
      />
      <section className="bg-ivory py-16 sm:py-24" aria-label="News articles">
        <div className="container-site">
          <UpdatesList items={news} headingLevel="h2" />
        </div>
      </section>
      <CallToAction />
    </>
  );
}
