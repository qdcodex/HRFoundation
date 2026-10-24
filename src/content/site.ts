/**
 * Core organisation details.
 *
 * Every value here is either:
 *  - VERIFIED: taken from documents the foundation supplied (trust deed / Form 10A / NGO Darpan), or
 *  - null / PLACEHOLDER: not yet supplied — the UI shows a "to be confirmed" state instead of inventing data.
 *
 * Search for "CLIENT TO CONFIRM" to find every item awaiting the foundation's approval.
 */

export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export const site = {
  name: "H R Foundation",
  shortName: "HR Foundation",
  tagline: "A future built on compassion",
  description:
    "H R Foundation is a charitable trust in Peddapalli, Telangana, established to work towards education, medical relief and the relief of the poor.",
  locale: "en_IN",

  /** VERIFIED (Form 10A, filed 03-Apr-2025). CLIENT TO CONFIRM: approve for public display. */
  address: {
    line1: "3-3-6, Sagar Road",
    locality: "Peddapalle",
    district: "Peddapalli",
    state: "Telangana",
    postalCode: "505172",
    country: "India",
  },

  /**
   * Public contact details:
   * CLIENT-SPECIFIED: the foundation's official email. It is shown on the website and receives all
   * website alerts and copies of emails to members/donors (unless Website settings → enquiry inbox overrides it).
   * Office address and mobile numbers are omitted from public display.
   */
  contact: {
    email: "hrfoundation4242@gmail.com" as string,
    phone: null as string | null,
    whatsapp: null as string | null,
    hours: null as string | null,
  },

  /** CLIENT TO CONFIRM: official social media profile URLs. */
  social: [] as { label: string; href: string }[],
} as const;

/**
 * Registration facts — VERIFIED from the trust deed and Form 10A.
 * CLIENT TO CONFIRM that these may be shown publicly. Set `show: false` to hide any line.
 */
export const registration = [
  { label: "Legal form", value: "Trust (established under a registered instrument)", show: true },
  { label: "Date of registration", value: "20 December 2024", show: true },
  { label: "Registration number", value: "238/2024 (Sub-Registrar)", show: true },
  { label: "NGO Darpan (NITI Aayog) ID", value: "TS/2025/0557206", show: true },
  { label: "Registered in", value: "Peddapalli district, Telangana", show: true },
] as const;

/**
 * Registered objects of the trust — VERIFIED (Form 10A, item 5).
 * These are aims the trust is constituted for, not a description of completed work.
 */
export const registeredObjects = [
  "Relief of the poor",
  "Education",
  "Medical relief",
  "Preservation of the environment, including watersheds, forests and wildlife",
  "Preservation of monuments, places and objects of artistic or historic interest",
  "Advancement of other objects of general public utility",
] as const;

export type NavLink = { label: string; href: string; description?: string };
