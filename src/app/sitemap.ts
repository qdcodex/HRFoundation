import type { MetadataRoute } from "next";
import { getNews, getServices } from "@/lib/cms";
import { siteUrl } from "@/content/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [enabledServices, news] = await Promise.all([getServices(), getNews()]);
  const routes: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
    { path: "/", priority: 1, changeFrequency: "weekly" },
    { path: "/about", priority: 0.8, changeFrequency: "monthly" },
    { path: "/services", priority: 0.9, changeFrequency: "monthly" },
    ...enabledServices.map((s) => ({ path: s.href, priority: 0.8, changeFrequency: "monthly" as const })),
    { path: "/activities", priority: 0.7, changeFrequency: "weekly" },
    { path: "/donate", priority: 0.9, changeFrequency: "monthly" },
    { path: "/membership", priority: 0.8, changeFrequency: "monthly" },
    { path: "/membership/terms", priority: 0.5, changeFrequency: "monthly" },
    { path: "/get-involved", priority: 0.7, changeFrequency: "monthly" },
    { path: "/news", priority: 0.6, changeFrequency: "weekly" },
    { path: "/contact", priority: 0.7, changeFrequency: "yearly" },
    { path: "/privacy-policy", priority: 0.3, changeFrequency: "yearly" },
    { path: "/terms", priority: 0.3, changeFrequency: "yearly" },
    ...news.map((n) => ({ path: `/news/${n.slug}`, priority: 0.5, changeFrequency: "monthly" as const })),
  ];

  return routes.map((r) => ({ url: `${siteUrl}${r.path === "/" ? "" : r.path}`, changeFrequency: r.changeFrequency, priority: r.priority }));
}
