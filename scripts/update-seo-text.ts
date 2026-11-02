/**
 * Updates page SEO titles/descriptions in the CMS to the current defaults in src/content/pages.ts.
 * A field is changed only while it still holds the old default, so text edited in the admin is kept.
 *
 *   npx tsx --conditions=react-server scripts/update-seo-text.ts          (local)
 *   npx tsx --conditions=react-server scripts/update-seo-text.ts --live   (production)
 */
import "./load-env";
import mongoose from "mongoose";
import { pageDefault } from "@/content/pages";
import { audit } from "@/lib/audit";
import { connectDb } from "@/lib/db/connect";
import { SitePage } from "@/lib/db/models/content";

const OLD: { key: string; field: "seoTitle" | "seoDescription"; from: string }[] = [
  { key: "about", field: "seoTitle", from: "About Us" },
  { key: "services", field: "seoTitle", from: "Services & Charitable Programmes" },
  { key: "activities", field: "seoTitle", from: "Activities & Initiatives" },
  { key: "donate", field: "seoTitle", from: "Donate" },
  { key: "donate", field: "seoDescription", from: "Support H R Foundation, a charitable trust in Telangana, by donating through its approved UPI QR code. Learn how to request a donation receipt." },
  { key: "membership", field: "seoTitle", from: "Membership" },
  { key: "get-involved", field: "seoTitle", from: "Get Involved — Volunteer or Partner" },
  { key: "contact", field: "seoTitle", from: "Contact Us" },
];

async function main() {
  await connectDb();
  const log: string[] = [];
  for (const { key, field, from } of OLD) {
    const page = await SitePage.findOne({ key });
    if (!page) continue;
    const to = pageDefault(key)[field];
    let changed = false;
    for (const state of ["draft", "published"] as const) {
      if (page.get(`${state}.${field}`) === from) {
        page.set(`${state}.${field}`, to);
        changed = true;
      }
    }
    if (changed) {
      await page.save();
      log.push(`${key} ${field}: "${to}"`);
    }
  }
  if (log.length) {
    await audit({ id: null, name: "System (SEO text update)" }, { action: "content.seo_text_updated", entityType: "SitePage", entityId: "seo", summary: log.join("; ") });
  }
  console.log(log.length ? log.map((l) => `- ${l}`).join("\n") : "Nothing to update.");
  console.log("Public pages refresh within the cache lifetime, or immediately after the next deploy.");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
