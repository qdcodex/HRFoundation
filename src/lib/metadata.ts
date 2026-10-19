import type { Metadata } from "next";
import { site } from "@/content/site";

/**
 * Page-level `openGraph` replaces the root one, so the generated share image (app/opengraph-image.tsx)
 * must be referenced explicitly to appear on inner pages.
 */
const shareImage = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: "H R Foundation logo — People · Opportunity · Healthier Tomorrows",
};

/** Builds consistent per-page metadata with canonical URL and social previews. */
export function pageMetadata({
  title,
  description,
  path,
  noIndex = false,
}: {
  title: string;
  description: string;
  path: string;
  noIndex?: boolean;
}): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: `${title} | ${site.name}`,
      description,
      url: path,
      siteName: site.name,
      locale: site.locale,
      type: "website",
      images: [shareImage],
    },
    twitter: { card: "summary_large_image", title: `${title} | ${site.name}`, description, images: [shareImage] },
    robots: noIndex ? { index: false, follow: true } : undefined,
  };
}

/** Metadata for a CMS-managed page (SEO title/description editable in the admin). */
export async function cmsPageMetadata(key: string, path: string): Promise<Metadata> {
  const { getPage } = await import("@/lib/cms");
  const page = await getPage(key);
  return pageMetadata({ title: page.seoTitle, description: page.seoDescription, path });
}
