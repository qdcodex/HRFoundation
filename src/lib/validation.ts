import { z } from "zod";
import { membership } from "@/content/membership";
import { ageOn, compareDates, parseIsoDate, todayInIndia } from "./waiting-period";

/** Shared between client forms and server route handlers. */

const trimmed = (min: number, max: number, label: string) =>
  z
    .string()
    .trim()
    .min(1, `Please enter your ${label}.`)
    .min(min, `${capitalise(label)} must be at least ${min} characters.`)
    .max(max, `${capitalise(label)} must be ${max} characters or fewer.`);

function capitalise(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** Indian mobile numbers: 10 digits starting 6–9, optional +91 / 0 prefix and spaces. */
export const indianMobile = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s-]/g, "").replace(/^(\+91|91|0)(?=[6-9]\d{9}$)/, ""))
  .refine((v) => /^[6-9]\d{9}$/.test(v), "Enter a valid 10-digit Indian mobile number.");

const optionalEmail = z
  .string()
  .trim()
  .max(254)
  .refine((v) => v === "" || z.email().safeParse(v).success, "Enter a valid email address, or leave this blank.");

/** Honeypot: real visitors never see or fill this field. */
const honeypot = z.string().max(500).optional();

export const contactSchema = z.object({
  name: trimmed(2, 100, "name"),
  phone: z.union([z.literal(""), indianMobile]),
  email: optionalEmail,
  subject: z.enum(["general", "education", "medical", "membership", "donation", "documents", "other"], {
    message: "Please choose a subject.",
  }),
  message: trimmed(10, 2000, "message"),
  consent: z.literal(true, { message: "Please agree so that we can reply to you." }),
  website: honeypot,
}).refine((d) => d.phone !== "" || d.email !== "", {
  message: "Please give a mobile number or an email address so we can reply.",
  path: ["phone"],
});
export type ContactInput = z.input<typeof contactSchema>;

export const involvementSchema = z.object({
  type: z.enum(["volunteer", "partnership", "other"], { message: "Please choose how you would like to help." }),
  name: trimmed(2, 100, "name"),
  organisation: z.string().trim().max(150).optional().default(""),
  phone: indianMobile,
  email: optionalEmail,
  city: trimmed(2, 80, "town or city"),
  interests: z.array(z.enum(["education", "medical", "community", "events", "skills"])).default([]),
  message: trimmed(10, 2000, "message"),
  consent: z.literal(true, { message: "Please agree so that we can contact you." }),
  website: honeypot,
}).refine((d) => d.type !== "partnership" || d.organisation.length >= 2, {
  message: "Please enter the organisation you represent.",
  path: ["organisation"],
});
export type InvolvementInput = z.input<typeof involvementSchema>;

const pastDate = z
  .string()
  .refine((v) => parseIsoDate(v) !== null, "Enter a valid date.");

export const membershipSchema = z
  .object({
    fullName: trimmed(3, 120, "full name"),
    dateOfBirth: pastDate,
    mobile: indianMobile,
    email: optionalEmail,
    address: trimmed(10, 400, "residential address"),
    district: trimmed(2, 80, "district"),
    pinCode: z.string().trim().regex(/^[1-9]\d{5}$/, "Enter a valid 6-digit PIN code."),
    nomineeName: trimmed(3, 120, "nominee's name"),
    nomineeRelationship: z.enum(["spouse", "son", "daughter", "father", "mother", "brother", "sister", "other"], {
      message: "Please choose the nominee's relationship to you.",
    }),
    nomineeRelationshipOther: z.string().trim().max(60).optional().default(""),
    nomineeMobile: indianMobile,
    acceptTerms: z.literal(true, { message: "You must read and accept the membership terms." }),
    acknowledgeProposed: z.literal(true, {
      message: "Please confirm you understand the benefit is proposed and not guaranteed.",
    }),
    consentData: z.literal(true, { message: "Please consent to the use of your details for this application." }),
    nomineeConsent: z.literal(true, { message: "Please confirm your nominee has agreed to share their details." }),
    website: honeypot,
  })
  .superRefine((d, ctx) => {
    const dob = parseIsoDate(d.dateOfBirth);
    if (!dob) return;
    const today = todayInIndia();
    if (compareDates(dob, today) >= 0) {
      ctx.addIssue({ code: "custom", path: ["dateOfBirth"], message: "Date of birth must be in the past." });
      return;
    }
    const age = ageOn(dob, today);
    if (age < membership.minApplicantAge) {
      ctx.addIssue({
        code: "custom",
        path: ["dateOfBirth"],
        message: `Applicants must be at least ${membership.minApplicantAge} years old.`,
      });
    }
    if (age > 120) ctx.addIssue({ code: "custom", path: ["dateOfBirth"], message: "Please check the date of birth." });
    if (d.nomineeRelationship === "other" && d.nomineeRelationshipOther.length < 2) {
      ctx.addIssue({ code: "custom", path: ["nomineeRelationshipOther"], message: "Please describe the relationship." });
    }
    if (d.nomineeMobile === d.mobile) {
      ctx.addIssue({
        code: "custom",
        path: ["nomineeMobile"],
        message: "The nominee's number should be different from your own.",
      });
    }
  });
export type MembershipInput = z.input<typeof membershipSchema>;

/** Flattens Zod issues into { fieldName: message } for API responses. */
export function fieldErrors(error: z.ZodError) {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
