/**
 * Seeds the CMS with the website's current approved content (idempotent: existing records are never overwritten).
 *
 *   npm run db:seed
 */
import "./load-env";
import mongoose from "mongoose";
import { documents } from "@/content/documents";
import { PAGE_DEFAULTS } from "@/content/pages";
import { services } from "@/content/services";
import { connectDb } from "@/lib/db/connect";
import { PublicDocument, Service, SitePage } from "@/lib/db/models/content";
import { Setting } from "@/lib/db/models/system";
import { membershipRulesSchema, notificationSettingsSchema, websiteSettingsSchema } from "@/lib/settings";
import { membership } from "@/content/membership";
import { site } from "@/content/site";

async function main() {
  await connectDb();
  let created = 0;

  for (const p of PAGE_DEFAULTS) {
    const content = { title: p.title, intro: p.intro, seoTitle: p.seoTitle, seoDescription: p.seoDescription, body: p.body ?? "" };
    const res = await SitePage.updateOne(
      { key: p.key },
      { $setOnInsert: { key: p.key, path: p.path, label: p.label, hasBody: Boolean(p.body), draft: content, published: content, publishedAt: new Date(), updatedByName: "Initial content" } },
      { upsert: true },
    );
    created += res.upsertedCount;
  }

  for (const [i, s] of services.entries()) {
    const res = await Service.updateOne(
      { slug: s.slug },
      {
        $setOnInsert: {
          slug: s.slug,
          title: s.title,
          shortTitle: s.shortTitle,
          icon: s.icon,
          status: s.status,
          published: s.enabled,
          order: i,
          summary: s.summary,
          metaDescription: s.metaDescription,
          overview: s.overview,
          objectives: s.objectives,
          approvedActivities: s.approvedActivities,
          potentialInitiatives: s.potentialInitiatives,
          eligibility: s.eligibility ?? [],
          enquiry: s.enquiry,
        },
      },
      { upsert: true },
    );
    created += res.upsertedCount;
  }

  if ((await PublicDocument.estimatedDocumentCount()) === 0) {
    await PublicDocument.insertMany(
      documents.map((d, i) => ({
        title: d.title,
        description: d.description,
        category: d.category,
        docDate: d.date,
        visibility: "on_request",
        status: "published",
        order: i,
        publishedAt: new Date(),
      })),
    );
    created += documents.length;
  }

  const settings = {
    website: websiteSettingsSchema.parse({ phone: site.contact.phone ?? "", email: site.contact.email ?? "", hours: site.contact.hours ?? "" }),
    membershipRules: membershipRulesSchema.parse({
    schemeApproved: membership.schemeApproved,
    feePaise: membership.fee ? membership.fee.amountInr * 100 : null,
    feePeriod: membership.fee?.period ?? "",
  }),
    notifications: notificationSettingsSchema.parse({}),
  };
  for (const [key, value] of Object.entries(settings)) {
    const res = await Setting.updateOne({ _id: key as "website" | "membershipRules" | "notifications" }, { $setOnInsert: { value, updatedByName: "Initial setup" } }, { upsert: true });
    created += res.upsertedCount;
  }

  console.log(`Content seed complete. ${created} record(s) created; existing records left unchanged.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
