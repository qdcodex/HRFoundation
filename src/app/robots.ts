import type { MetadataRoute } from "next";
import { siteUrl } from "@/content/site";

export default function robots(): MetadataRoute.Robots {
  // Block indexing of preview/staging deployments: set NEXT_PUBLIC_ALLOW_INDEXING=true only on the live site.
  const allow = process.env.NEXT_PUBLIC_ALLOW_INDEXING === "true";
  return {
    rules: allow ? { userAgent: "*", allow: "/", disallow: ["/api/", "/admin", "/files/"] } : { userAgent: "*", disallow: "/" },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
