/**
 * Public documents.
 *
 * Only documents APPROVED by the foundation for public release should have a `file`.
 * Place approved PDFs in /public/documents/ and set `file: "/documents/<name>.pdf"`.
 *
 * IMPORTANT: Redact personal information (trustee PAN, Aadhaar, phone numbers, signatures)
 * before publishing any scanned document.
 *
 * Until a file is approved, the item is listed with `availability: "on-request"`.
 */

export type FoundationDocument = {
  title: string;
  description: string;
  category: "registration" | "tax" | "governance" | "reports";
  /** e.g. "20 December 2024" */
  date?: string;
  availability: "public" | "on-request";
  file?: string;
  fileSize?: string;
};

export const documentCategories: Record<FoundationDocument["category"], string> = {
  registration: "Registration",
  tax: "Income-tax filings",
  governance: "Governance",
  reports: "Annual reports & accounts",
};

export const documents: FoundationDocument[] = [
  {
    title: "Registered trust deed",
    description: "The instrument establishing H R Foundation as a trust, registered with the Sub-Registrar (No. 238/2024).",
    category: "registration",
    date: "20 December 2024",
    availability: "on-request",
  },
  {
    title: "NGO Darpan registration",
    description: "Registration of the foundation on the NITI Aayog NGO Darpan portal (ID TS/2025/0557206).",
    category: "registration",
    availability: "on-request",
  },
  {
    title: "Form 10A — application acknowledgement",
    description:
      "Acknowledgement of the foundation's application under the Income-tax Act. This is an application, not an approval or certificate.",
    category: "tax",
    date: "3 April 2025",
    availability: "on-request",
  },
];
