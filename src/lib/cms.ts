import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { documents as defaultDocuments, type FoundationDocument } from "@/content/documents";
import { pageDefault, type PageDefaults } from "@/content/pages";
import { services as defaultServices, type Service } from "@/content/services";
import { activities as defaultActivities, news as defaultNews, type Activity, type Update } from "@/content/updates";
import { connectDb, isDatabaseConfigured } from "@/lib/db/connect";
import { Activity as ActivityModel, Media, NewsArticle, PublicDocument, Service as ServiceModel, SitePage } from "@/lib/db/models/content";

/**
 * Public-site content loaders. Each is cached ("use cache") and tagged so admin edits refresh
 * the affected pages immediately (updateTag in the admin server actions).
 * If the database is not configured or unreachable, the built-in defaults are served
 * (cached for a few minutes only) so the public website never breaks.
 */

export const CMS_TAGS = {
  pages: "cms:pages",
  services: "cms:services",
  activities: "cms:activities",
  news: "cms:news",
  documents: "cms:documents",
} as const;

async function safely<T>(fn: () => Promise<T | null>, fallback: () => T): Promise<T> {
  if (!isDatabaseConfigured()) return fallback();
  try {
    await connectDb();
    return (await fn()) ?? fallback();
  } catch (error) {
    console.error("[cms] falling back to defaults:", error instanceof Error ? error.message : error);
    cacheLife("minutes");
    return fallback();
  }
}

/* ---------- Pages ---------- */

export type PageContent = Omit<PageDefaults, "key" | "path" | "label"> & { body: string };

export async function getPage(key: string): Promise<PageContent> {
  "use cache";
  cacheTag(CMS_TAGS.pages, `${CMS_TAGS.pages}:${key}`);
  const d = pageDefault(key);
  const defaults: PageContent = { title: d.title, intro: d.intro, seoTitle: d.seoTitle, seoDescription: d.seoDescription, body: d.body ?? "" };
  return safely(
    async () => {
      const doc = await SitePage.findOne({ key }).lean();
      const p = doc?.published;
      if (!p) return null;
      return {
        title: p.title || defaults.title,
        intro: p.intro || defaults.intro,
        seoTitle: p.seoTitle || defaults.seoTitle,
        seoDescription: p.seoDescription || defaults.seoDescription,
        body: p.body || defaults.body,
      };
    },
    () => defaults,
  );
}

/* ---------- Services ---------- */

export type PublicService = Service & { imageUrl?: string | null; imageAlt?: string; seoTitle?: string };

export async function getServices(): Promise<PublicService[]> {
  "use cache";
  cacheTag(CMS_TAGS.services);
  return safely(
    async () => {
      const docs = await ServiceModel.find({ published: true }).sort({ order: 1 }).lean();
      if (docs.length === 0 && (await ServiceModel.estimatedDocumentCount()) === 0) return null; // not seeded yet
      const alts = new Map((await Media.find({ _id: { $in: docs.map((d) => d.imageId).filter((x): x is NonNullable<typeof x> => Boolean(x)) } }).select("alt").lean()).map((m) => [m._id.toString(), m.alt]));
      return docs.map((s) => ({
        slug: s.slug,
        href: `/services/${s.slug}`,
        title: s.title,
        shortTitle: s.shortTitle,
        icon: s.icon,
        status: s.status,
        enabled: s.published,
        summary: s.summary,
        metaDescription: s.metaDescription,
        seoTitle: s.seoTitle || undefined,
        overview: s.overview,
        objectives: s.objectives,
        approvedActivities: s.approvedActivities.map((a) => ({ title: a.title, description: a.description })),
        potentialInitiatives: s.potentialInitiatives,
        eligibility: s.eligibility.length ? s.eligibility : undefined,
        enquiry: s.enquiry,
        imageUrl: s.imageId ? `/media/${s.imageId}` : null,
        imageAlt: s.imageId ? (alts.get(s.imageId.toString()) ?? "") : undefined,
      }));
    },
    () => defaultServices.filter((s) => s.enabled),
  );
}

export async function getService(slug: string) {
  return (await getServices()).find((s) => s.slug === slug) ?? null;
}

/* ---------- Activities ---------- */

export type PublicActivity = Activity & { mediaUrls: string[] };

export async function getActivities(): Promise<PublicActivity[]> {
  "use cache";
  cacheTag(CMS_TAGS.activities);
  return safely(
    async () => {
      const docs = await ActivityModel.find({ published: true }).sort({ date: -1 }).lean();
      return docs.map((a): PublicActivity => ({
        slug: a.slug,
        title: a.title,
        date: a.date,
        status: a.status,
        serviceSlug: a.serviceSlug ?? undefined,
        summary: a.description,
        location: a.location || undefined,
        mediaUrls: a.mediaIds.map((id) => `/media/${id}`),
      }));
    },
    () => defaultActivities.map((a): PublicActivity => ({ ...a, mediaUrls: [] })),
  );
}

/* ---------- News ---------- */

export type PublicNews = Update & { bodyText: string; imageUrl: string | null; seoTitle?: string; seoDescription?: string };

export async function getNews(): Promise<PublicNews[]> {
  "use cache";
  cacheTag(CMS_TAGS.news);
  return safely(
    async () => {
      const docs = await NewsArticle.find({ status: "published" }).sort({ publishDate: -1 }).lean();
      return docs.map((n): PublicNews => ({
        slug: n.slug,
        title: n.title,
        date: n.publishDate,
        summary: n.summary,
        body: [],
        bodyText: n.body,
        category: n.category,
        imageUrl: n.featuredImageId ? `/media/${n.featuredImageId}` : null,
        seoTitle: n.seoTitle || undefined,
        seoDescription: n.seoDescription || undefined,
      }));
    },
    () => defaultNews.map((n) => ({ ...n, bodyText: n.body.join("\n\n"), imageUrl: null })),
  );
}

export async function getNewsArticle(slug: string) {
  return (await getNews()).find((n) => n.slug === slug) ?? null;
}

/* ---------- Public documents ---------- */

export async function getPublicDocuments(): Promise<FoundationDocument[]> {
  "use cache";
  cacheTag(CMS_TAGS.documents);
  return safely(
    async () => {
      const docs = await PublicDocument.find({ status: "published" }).sort({ order: 1, createdAt: 1 }).lean();
      if (docs.length === 0 && (await PublicDocument.estimatedDocumentCount()) === 0) return null;
      return docs.map((d) => ({
        title: d.title,
        description: d.description,
        category: d.category,
        date: d.docDate || undefined,
        availability: d.visibility === "public" && d.file ? ("public" as const) : ("on-request" as const),
        file: d.visibility === "public" && d.file ? `/files/documents/${d._id}` : undefined,
        fileSize: d.file ? `${Math.max(1, Math.round(d.file.size / 1024))} KB` : undefined,
      }));
    },
    () => defaultDocuments,
  );
}
