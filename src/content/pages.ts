import { site } from "./site";

/**
 * Default text for each public page. These are used:
 *  - to seed the CMS (npm run db:seed), and
 *  - as a fallback whenever a page has no published edits or the database is unavailable.
 *
 * `body` uses a small, safe markup: "## Heading", "### Subheading", "- list item",
 * blank lines between paragraphs, **bold**, and [link text](/path).
 */
export type PageDefaults = {
  key: string;
  path: string;
  label: string;
  title: string;
  intro: string;
  seoTitle: string;
  seoDescription: string;
  body?: string;
};

const a = site.address;

export const PAGE_DEFAULTS: PageDefaults[] = [
  {
    key: "home",
    path: "/",
    label: "Home",
    title: "Together, we can build a better tomorrow.",
    intro:
      "H R Foundation is a charitable trust established to open doors through education, ease hardship through medical relief, and stand beside families who need support.",
    seoTitle: "H R Foundation — Education, Medical Relief & Community Care in Telangana",
    seoDescription:
      "H R Foundation is a charitable trust in Peddapalli, Telangana, established for education, medical relief and the relief of the poor. Learn about our work and how to support it.",
  },
  {
    key: "about",
    path: "/about",
    label: "About",
    title: "A charitable trust for a kinder, fairer tomorrow.",
    intro:
      "H R Foundation was registered in Peddapalli, Telangana, on 20 December 2024 to serve people through education, medical relief and the relief of the poor.",
    seoTitle: "About Us",
    seoDescription:
      "About H R Foundation, a charitable trust registered in Peddapalli, Telangana, in December 2024 for education, medical relief, relief of the poor and other charitable objects.",
  },
  {
    key: "services",
    path: "/services",
    label: "Services",
    title: "Our charitable work, clearly labelled.",
    intro:
      "We show what the trust is registered to do, and we mark anything that is still proposed or awaiting confirmation. Nothing here is described as running until it actually is.",
    seoTitle: "Services & Charitable Programmes",
    seoDescription:
      "H R Foundation's charitable objectives and programmes in Telangana: education support, medical relief, community welfare and a proposed membership scheme.",
  },
  {
    key: "activities",
    path: "/activities",
    label: "Activities",
    title: "Activities & initiatives.",
    intro:
      "This page lists activities approved by H R Foundation. Completed activities are shown only after they have taken place and been verified.",
    seoTitle: "Activities & Initiatives",
    seoDescription: "Activities and initiatives of H R Foundation, Telangana. Only activities approved and verified by the foundation are listed.",
  },
  {
    key: "news",
    path: "/news",
    label: "News",
    title: "Updates from the foundation.",
    intro: "Official announcements from H R Foundation are published here after approval.",
    seoTitle: "News & Announcements",
    seoDescription: "News and announcements from H R Foundation, a charitable trust in Peddapalli, Telangana.",
  },
  {
    key: "donate",
    path: "/donate",
    label: "Donate",
    title: "Your kindness can open a door for someone.",
    intro:
      "Donations help H R Foundation prepare and carry out its charitable work in education, medical relief and support for people facing hardship.",
    seoTitle: "Donate",
    seoDescription:
      "Support H R Foundation, a charitable trust in Telangana, by donating through its approved UPI QR code. Learn how to request a donation receipt.",
  },
  {
    key: "membership",
    path: "/membership",
    label: "Membership",
    title: "Stand together as members of H R Foundation.",
    intro:
      "Membership is a way to belong to the foundation's community of support. A death-benefit provision for members' families is proposed, subject to formal approval.",
    seoTitle: "Membership",
    seoDescription:
      "Join H R Foundation as a member. Read about the proposed membership scheme, the waiting period and the proposed death-benefit provision, then apply online.",
  },
  {
    key: "membership-terms",
    path: "/membership/terms",
    label: "Membership terms",
    title: "Membership terms & disclaimer.",
    intro:
      "These proposed terms explain the conditions under which the foundation intends to run its membership scheme. They will be replaced by the final approved terms.",
    seoTitle: "Membership Terms & Disclaimer",
    seoDescription: "Proposed membership terms and disclaimer for H R Foundation's membership scheme and death-benefit provision.",
  },
  {
    key: "get-involved",
    path: "/get-involved",
    label: "Get involved",
    title: "Bring your time, skills and heart.",
    intro: "Good work grows when people come together. Tell us how you would like to help and we will be in touch as opportunities arise.",
    seoTitle: "Get Involved — Volunteer or Partner",
    seoDescription: "Volunteer with H R Foundation or explore a partnership to support education, medical relief and community welfare in Telangana.",
  },
  {
    key: "contact",
    path: "/contact",
    label: "Contact",
    title: "We would be glad to hear from you.",
    intro: "Ask a question, request a donation receipt, or tell us about a need in your community.",
    seoTitle: "Contact Us",
    seoDescription: "Contact H R Foundation, Peddapalli, Telangana. Reach us directly by email or through our online enquiry form.",
  },
  {
    key: "privacy-policy",
    path: "/privacy-policy",
    label: "Privacy policy",
    title: "Privacy policy.",
    intro: "We respect your privacy. This policy explains what information we collect through this website, why we collect it and how we protect it.",
    seoTitle: "Privacy Policy",
    seoDescription: "How H R Foundation collects, uses and protects personal information shared through its website.",
    body: `## Who we are

This website is operated by ${site.name}, a charitable trust registered in ${a.district} district, ${a.state}, India. You can reach us at ${site.contact.email}.

## Information we collect

- **Contact and volunteer enquiries:** your name, mobile number and/or email address, town, and the message you send.
- **Membership applications:** your name, date of birth, mobile number, email (optional), residential address, and your nominee's name, relationship and mobile number.
- **Donations:** UPI payments are processed by your bank and UPI app. We do not receive your UPI PIN or bank login details. If you ask for a receipt, we use the details you give us to issue it.
- **Technical information:** our hosting provider may record basic technical data such as IP address and browser type for security and to prevent abuse.

We do not ask for Aadhaar numbers, bank account details or medical records through website forms.

## How we use your information

- To reply to your enquiry and keep a record of our correspondence.
- To process membership applications and, if the scheme is approved, to administer memberships and claims.
- To issue donation acknowledgements and receipts you request.
- To meet our legal and regulatory obligations.

We do not sell your personal information or use it for advertising.

## Nominee information

When you name a nominee, you confirm that they have agreed to share their details with us. Nominee information is confidential, is used only to administer the membership scheme and is never published.

## Sharing

We share information only with service providers who help us run this website and deliver messages (for example, our hosting and email providers), under appropriate confidentiality, or where the law requires it.

## Storage and retention

We keep personal information only for as long as needed for the purpose it was collected or as required by law, and we restrict access to authorised staff. Every access to sensitive records is logged. Retention periods will be set out in the foundation's approved records policy.

## Your choices and rights

You may ask us to access, correct or delete your personal information, or withdraw your consent, subject to our legal obligations. Please use our [contact page](/contact) for any privacy request.

## Cookies

This website uses only an essential sign-in cookie for authorised staff. It does not use advertising or analytics cookies. If this changes, we will update this policy.

## Changes

We may update this policy from time to time. The latest version will always be available on this page.`,
  },
  {
    key: "terms",
    path: "/terms",
    label: "Terms of use",
    title: "Website terms of use.",
    intro: "By using this website you agree to these terms. Please read them carefully.",
    seoTitle: "Terms of Use",
    seoDescription: "Terms of use for the H R Foundation website, covering donations, the membership scheme, acceptable use and liability.",
    body: `## About this website

This website provides information about ${site.name}, a charitable trust in Telangana, India. Information is provided in good faith for general purposes and may change as the foundation's programmes develop.

## No guarantee of services

Pages describing proposed or pending programmes do not constitute an offer of services. Any support from the foundation is subject to its approved policies, eligibility criteria and available resources.

## Membership scheme

The membership scheme and death-benefit provision are governed by the [membership terms and disclaimer](/membership/terms). The scheme is not insurance and does not guarantee any payment.

## Donations

Donations are voluntary. Please verify the UPI ID before paying. Information on tax-deduction eligibility is provided only after the relevant approval is received; please do not assume a deduction is available.

## Acceptable use

- Do not submit false, misleading or someone else's information.
- Do not attempt to disrupt, damage or gain unauthorised access to this website.
- Do not use the website's content in a way that misrepresents the foundation.

## Intellectual property

The text, design and illustrations on this website belong to ${site.name} unless otherwise stated. You may share links to our pages and quote short extracts with attribution.

## External links

We are not responsible for the content of external websites linked from this site.

## Limitation of liability

To the extent permitted by law, the foundation is not liable for any loss arising from use of this website or reliance on its content.

## Governing law

These terms are governed by the laws of India. Courts in Telangana will have jurisdiction.

## Contact

Questions about these terms can be sent through our [contact page](/contact).`,
  },
];

export const PAGE_KEYS = PAGE_DEFAULTS.map((p) => p.key);
export function pageDefault(key: string) {
  return PAGE_DEFAULTS.find((p) => p.key === key)!;
}
