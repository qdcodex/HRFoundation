import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { z } from "zod";
import { membership as membershipDefaults } from "@/content/membership";
import { site } from "@/content/site";
import { connectDb, isDatabaseConfigured } from "@/lib/db/connect";
import { Setting } from "@/lib/db/models/system";

/* ---------- Schemas (also used to validate the admin forms) ---------- */

export const websiteSettingsSchema = z.object({
  phone: z.string().trim().max(20).default(""),
  whatsapp: z.string().trim().max(20).default(""),
  email: z.union([z.literal(""), z.email()]).default(""),
  hours: z.string().trim().max(120).default(""),
  enquiryInbox: z.union([z.literal(""), z.email()]).default(""),
  social: z.array(z.object({ label: z.string().max(40), href: z.url() })).max(8).default([]),
});
export type WebsiteSettings = z.output<typeof websiteSettingsSchema>;

export const membershipRulesSchema = z.object({
  schemeApproved: z.boolean().default(false),
  registrationOpen: z.boolean().default(true),
  feePaise: z.number().int().min(0).nullable().default(null),
  feePeriod: z.string().trim().max(40).default(""),
  waitingPeriodMonths: z.number().int().min(0).max(60).default(membershipDefaults.waitingPeriodMonths),
  maxBenefitPaise: z.number().int().min(0).default(membershipDefaults.maxBenefitInr * 100),
  benefitAgeLimit: z.number().int().min(1).max(120).default(membershipDefaults.benefitAgeLimit),
  minApplicantAge: z.number().int().min(0).max(120).default(membershipDefaults.minApplicantAge),
  termsVersion: z.string().trim().min(1).max(80).default(membershipDefaults.termsVersion),
  approachingDays: z.number().int().min(1).max(90).default(30),
});
export type MembershipRules = z.output<typeof membershipRulesSchema>;

export const NOTIFICATION_EVENTS = {
  application_received: { label: "Membership application received", to: "applicant", vars: ["name", "reference"] },
  payment_verified: { label: "Membership payment verified", to: "member", vars: ["name", "reference", "amount"] },
  membership_activated: { label: "Membership activated", to: "member", vars: ["name", "membershipId", "effectiveDate", "waitingEnds"] },
  waiting_period_completed: { label: "Waiting period completed", to: "member", vars: ["name", "membershipId", "completedOn"] },
  claim_info_requested: { label: "Additional claim documents requested", to: "claimant", vars: ["name", "reference", "message"] },
  claim_decision: { label: "Claim decision recorded", to: "claimant", vars: ["name", "reference", "outcome"] },
  receipt_issued: { label: "Donation receipt issued", to: "donor", vars: ["name", "receiptNumber", "amount"] },
  enquiry_received: { label: "New website enquiry (to foundation inbox)", to: "foundation", vars: ["reference", "kind", "name", "subject"] },
} as const;
export type NotificationEvent = keyof typeof NOTIFICATION_EVENTS;

const templateSchema = z.object({ enabled: z.boolean(), subject: z.string().max(160), body: z.string().max(4000) });
export const notificationSettingsSchema = z.object({
  templates: z.record(z.string(), templateSchema).default({}),
});
export type NotificationSettings = z.output<typeof notificationSettingsSchema>;

export const DEFAULT_TEMPLATES: Record<NotificationEvent, { enabled: boolean; subject: string; body: string }> = {
  application_received: {
    enabled: true,
    subject: "We have received your membership application ({{reference}})",
    body: "Dear {{name}},\n\nThank you for applying for membership of H R Foundation. Your application reference is {{reference}}. Your membership is not yet active; we will contact you about the next steps.\n\nH R Foundation",
  },
  payment_verified: {
    enabled: true,
    subject: "Membership payment verified ({{reference}})",
    body: "Dear {{name}},\n\nWe have verified your membership payment of {{amount}}. Your application will now be reviewed for approval.\n\nH R Foundation",
  },
  membership_activated: {
    enabled: true,
    subject: "Your H R Foundation membership is active ({{membershipId}})",
    body: "Dear {{name}},\n\nYour membership is now active. Membership ID: {{membershipId}}. Effective date: {{effectiveDate}}. The waiting period ends on {{waitingEnds}}.\n\nCompleting the waiting period does not by itself guarantee any payment; all approved terms apply.\n\nH R Foundation",
  },
  waiting_period_completed: {
    enabled: false,
    subject: "Your membership waiting period is complete",
    body: "Dear {{name}},\n\nThe waiting period for membership {{membershipId}} was completed on {{completedOn}}. This does not by itself guarantee any payment; all approved terms apply.\n\nH R Foundation",
  },
  claim_info_requested: {
    enabled: true,
    subject: "Additional information needed for claim {{reference}}",
    body: "Dear {{name}},\n\nTo continue reviewing claim {{reference}}, we need the following:\n\n{{message}}\n\nPlease contact the foundation to share this securely. Do not send documents by ordinary email unless we ask you to.\n\nH R Foundation",
  },
  claim_decision: {
    enabled: true,
    subject: "Decision on claim {{reference}}",
    body: "Dear {{name}},\n\nA decision has been recorded on claim {{reference}}: {{outcome}}. The foundation will contact you with details.\n\nH R Foundation",
  },
  receipt_issued: {
    enabled: true,
    subject: "Your donation receipt {{receiptNumber}}",
    body: "Dear {{name}},\n\nThank you for your donation of {{amount}} to H R Foundation. Your receipt number is {{receiptNumber}}.\n\nH R Foundation",
  },
  enquiry_received: {
    enabled: true,
    subject: "[Website] {{kind}} enquiry {{reference}}",
    body: "A new {{kind}} enquiry ({{reference}}) was received from {{name}}: {{subject}}.\n\nOpen the admin dashboard to read and respond.",
  },
};

/* ---------- Defaults ---------- */

const defaults = {
  website: websiteSettingsSchema.parse({
    phone: site.contact.phone ?? "",
    email: site.contact.email ?? "",
    hours: site.contact.hours ?? "",
  }),
  membershipRules: membershipRulesSchema.parse({ schemeApproved: membershipDefaults.schemeApproved }),
  notifications: notificationSettingsSchema.parse({}),
};

/* ---------- Loaders ---------- */

/** Uncached read — for the admin area and business rules. */
export async function loadSettings<K extends keyof typeof defaults>(key: K): Promise<(typeof defaults)[K]> {
  if (!isDatabaseConfigured()) return defaults[key];
  await connectDb();
  const doc = await Setting.findById(key).lean();
  const schema = { website: websiteSettingsSchema, membershipRules: membershipRulesSchema, notifications: notificationSettingsSchema }[key];
  const parsed = schema.safeParse({ ...defaults[key], ...(doc?.value ?? {}) });
  return (parsed.success ? parsed.data : defaults[key]) as (typeof defaults)[K];
}

/** Cached read for the public website. Invalidated with the "settings" tag. */
export async function publicSettings<K extends "website" | "membershipRules">(key: K): Promise<(typeof defaults)[K]> {
  "use cache";
  cacheTag("settings");
  try {
    return await loadSettings(key);
  } catch {
    cacheLife("minutes");
    return defaults[key];
  }
}

export function templateFor(settings: NotificationSettings, event: NotificationEvent) {
  return { ...DEFAULT_TEMPLATES[event], ...(settings.templates[event] ?? {}) };
}
