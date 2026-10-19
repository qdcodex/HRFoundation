import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CallToAction } from "@/components/sections/CallToAction";
import { SiteMembershipBanner } from "@/components/sections/MembershipPromo";
import { PageHero } from "@/components/sections/PageHero";
import { RichText } from "@/components/sections/RichText";
import { LoadingState } from "@/components/ui/States";
import { formatDate } from "@/content/updates";
import { getNewsArticle } from "@/lib/cms";
import { pageMetadata } from "@/lib/metadata";

export async function generateMetadata({ params }: PageProps<"/news/[slug]">) {
  const { slug } = await params;
  const article = await getNewsArticle(slug);
  if (!article) return { title: "News", robots: { index: false } };
  return pageMetadata({ title: article.seoTitle || article.title, description: article.seoDescription || article.summary, path: `/news/${slug}` });
}

export default function NewsArticlePage({ params }: PageProps<"/news/[slug]">) {
  return (
    <Suspense fallback={<LoadingState label="Loading article…" />}>
      <Article params={params} />
    </Suspense>
  );
}

async function Article({ params }: { params: PageProps<"/news/[slug]">["params"] }) {
  const { slug } = await params;
  const article = await getNewsArticle(slug);
  if (!article) notFound();
  return (
    <>
      <PageHero
        crumbs={[{ label: "News", href: "/news" }, { label: article.title }]}
        eyebrow={`${article.category} · ${formatDate(article.date)}`}
        title={article.title}
        intro={article.summary}
      />
      <section className="bg-ivory py-16 sm:py-20">
        <div className="container-site max-w-3xl">
          {article.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={article.imageUrl} alt="" className="mb-10 w-full rounded-2xl border border-line object-cover" />
          )}
          {article.bodyText ? <RichText text={article.bodyText} /> : null}
        </div>
      </section>
      <SiteMembershipBanner />
      <CallToAction />
    </>
  );
}
