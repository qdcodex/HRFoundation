/**
 * News, announcements and activities.
 *
 * Add only items that the foundation has approved for publication.
 * When these lists are empty the site shows an honest empty state — never sample content.
 *
 * Example entry (do not uncomment without real, approved content):
 * {
 *   slug: "trust-registration",
 *   title: "…",
 *   date: "2025-01-15",          // ISO date
 *   summary: "…",
 *   body: ["Paragraph one…", "Paragraph two…"],
 *   category: "Announcement",
 * }
 */

export type Update = {
  slug: string;
  title: string;
  date: string;
  summary: string;
  body: string[];
  category: "Announcement" | "News" | "Notice";
};

export type Activity = {
  slug: string;
  title: string;
  date: string;
  /** Use "completed" only after the activity has actually taken place and been verified. */
  status: "planned" | "completed";
  serviceSlug?: string;
  summary: string;
  location?: string;
};

export const news: Update[] = [];

export const activities: Activity[] = [];

export const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${iso}T00:00:00Z`),
  );

export const sortByDateDesc = <T extends { date: string }>(items: T[]) =>
  [...items].sort((a, b) => b.date.localeCompare(a.date));
