/**
 * One-off update for the client's decisions of October 2026 (safe to re-run):
 *  - membership fee ₹2,000 one-time, minimum age 18, claim target 45 days;
 *  - no public phone/WhatsApp; email-only contact;
 *  - office address removed from the privacy policy; Documents page retired;
 *  - contact page text updated where it still has the original wording.
 *
 *   npx tsx --conditions=react-server scripts/apply-client-decisions.ts          (local)
 *   npx tsx --conditions=react-server scripts/apply-client-decisions.ts --live   (production)
 */
import "./load-env";
import mongoose from "mongoose";
import { pageDefault } from "@/content/pages";
import { site } from "@/content/site";
import { audit } from "@/lib/audit";
import { connectDb } from "@/lib/db/connect";
import { SitePage } from "@/lib/db/models/content";
import { Setting } from "@/lib/db/models/system";
import { loadSettings, membershipRulesSchema, websiteSettingsSchema } from "@/lib/settings";

const OLD_CONTACT_INTRO = "Ask a question, request a document or a donation receipt, or tell us about a need in your community.";
const OLD_CONTACT_SEO = "Contact H R Foundation, Peddapalli, Telangana. Send an enquiry about our work, donations, membership or documents.";
const ADDRESS_LINE = /^This website is operated by .*a trust registered at .*$/m;

async function main() {
  await connectDb();
  const log: string[] = [];

  const rules = await loadSettings("membershipRules");
  const nextRules = membershipRulesSchema.parse({ ...rules, feePaise: 200000, feePeriod: "one-time", minApplicantAge: 18, claimTargetDays: 45 });
  await Setting.updateOne({ _id: "membershipRules" }, { $set: { value: nextRules, updatedByName: "Client decisions (Oct 2026)" } }, { upsert: true });
  log.push("membership rules: fee ₹2,000 one-time, min age 18, claim target 45 days");

  const website = await loadSettings("website");
  const nextWebsite = websiteSettingsSchema.parse({ ...website, phone: "", whatsapp: "", email: website.email || site.contact.email });
  await Setting.updateOne({ _id: "website" }, { $set: { value: nextWebsite, updatedByName: "Client decisions (Oct 2026)" } }, { upsert: true });
  log.push(`website settings: phone/WhatsApp cleared, public email ${nextWebsite.email}`);

  const privacyLine = pageDefault("privacy-policy").body!.match(/^This website is operated by .*$/m)![0];
  const privacy = await SitePage.findOne({ key: "privacy-policy" });
  if (privacy) {
    let changed = false;
    for (const field of ["draft", "published"] as const) {
      const body = privacy.get(`${field}.body`) as string | undefined;
      if (body && ADDRESS_LINE.test(body)) {
        privacy.set(`${field}.body`, body.replace(ADDRESS_LINE, privacyLine));
        changed = true;
      }
    }
    if (changed) {
      await privacy.save();
      log.push("privacy policy: office address removed");
    }
  }

  const contact = await SitePage.findOne({ key: "contact" });
  if (contact) {
    const d = pageDefault("contact");
    let changed = false;
    for (const field of ["draft", "published"] as const) {
      if (contact.get(`${field}.intro`) === OLD_CONTACT_INTRO) {
        contact.set(`${field}.intro`, d.intro);
        changed = true;
      }
      if (contact.get(`${field}.seoDescription`) === OLD_CONTACT_SEO) {
        contact.set(`${field}.seoDescription`, d.seoDescription);
        changed = true;
      }
    }
    if (changed) {
      await contact.save();
      log.push("contact page: text updated");
    }
  }

  const removed = await SitePage.deleteOne({ key: "documents" });
  if (removed.deletedCount) log.push("documents page record removed");

  await audit(
    { id: null, name: "System (client decisions update)" },
    { action: "settings.client_decisions_applied", entityType: "Setting", entityId: "membershipRules", summary: log.join("; ") },
  );
  console.log(log.map((l) => `- ${l}`).join("\n"));
  console.log("Done. Public pages refresh within the cache lifetime, or immediately after the next deploy.");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
