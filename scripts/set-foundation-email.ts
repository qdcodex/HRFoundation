/**
 * Points the website at the foundation's official email (src/content/site.ts → contact.email). Safe to re-run.
 *  - Website settings: public email and admin (enquiry) inbox.
 *  - CMS pages: replaces the previous placeholder address in page text.
 *
 *   npx tsx --conditions=react-server scripts/set-foundation-email.ts          (local)
 *   npx tsx --conditions=react-server scripts/set-foundation-email.ts --live   (production)
 */
import "./load-env";
import mongoose from "mongoose";
import { site } from "@/content/site";
import { audit } from "@/lib/audit";
import { connectDb } from "@/lib/db/connect";
import { SitePage } from "@/lib/db/models/content";
import { Setting } from "@/lib/db/models/system";
import { loadSettings, websiteSettingsSchema } from "@/lib/settings";

const OLD = ["contact@hrfoundationindia.org"];

async function main() {
  const email = site.contact.email;
  await connectDb();
  const log: string[] = [];

  const website = await loadSettings("website");
  const next = websiteSettingsSchema.parse({
    ...website,
    email,
    enquiryInbox: !website.enquiryInbox || OLD.includes(website.enquiryInbox) ? email : website.enquiryInbox,
  });
  await Setting.updateOne({ _id: "website" }, { $set: { value: next, updatedByName: "Foundation email update" } }, { upsert: true });
  log.push(`website settings: public email ${next.email}, admin inbox ${next.enquiryInbox}`);

  for (const page of await SitePage.find({})) {
    let changed = false;
    for (const state of ["draft", "published"] as const) {
      for (const field of ["title", "intro", "body", "seoDescription"]) {
        const value = page.get(`${state}.${field}`) as string | undefined;
        if (typeof value !== "string") continue;
        let updated = value;
        for (const old of OLD) updated = updated.split(old).join(email);
        if (updated !== value) {
          page.set(`${state}.${field}`, updated);
          changed = true;
        }
      }
    }
    if (changed) {
      await page.save();
      log.push(`page "${page.get("key")}": email updated`);
    }
  }

  await audit({ id: null, name: "System (foundation email update)" }, { action: "settings.foundation_email_set", entityType: "Setting", entityId: "website", summary: log.join("; ") });
  console.log(log.map((l) => `- ${l}`).join("\n"));
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
