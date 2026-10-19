/**
 * Services and charitable programmes.
 *
 * status:
 *  - "registered-objective": an object listed in the trust's registration. Specific programmes are
 *     shown only once the foundation adds them to `approvedActivities`.
 *  - "pending-confirmation": the foundation has not yet confirmed this area of work.
 *  - "proposed": a scheme under design that requires formal approval before it becomes operational.
 *
 * enabled: set to false to hide a service from navigation, listings and the sitemap.
 * The page itself returns 404 when disabled.
 */

export type ServiceStatus = "registered-objective" | "pending-confirmation" | "proposed";
export type ServiceIcon = "education" | "medical" | "community" | "membership";

export type Service = {
  slug: string;
  href: string;
  title: string;
  shortTitle: string;
  icon: ServiceIcon;
  status: ServiceStatus;
  enabled: boolean;
  summary: string;
  metaDescription: string;
  overview: string[];
  objectives: string[];
  /** Activities formally approved and announced by the foundation. Empty until confirmed. */
  approvedActivities: { title: string; description: string }[];
  /** Ideas under consideration — always displayed with a "proposed" label. */
  potentialInitiatives: string[];
  eligibility?: string[];
  enquiry: string;
};

export const statusLabels: Record<ServiceStatus, { label: string; tone: "confirmed" | "pending" | "proposed" }> = {
  "registered-objective": { label: "Registered objective", tone: "confirmed" },
  "pending-confirmation": { label: "Pending confirmation", tone: "pending" },
  proposed: { label: "Proposed — subject to approval", tone: "proposed" },
};

export const services: Service[] = [
  {
    slug: "education-support",
    href: "/services/education-support",
    title: "Education Support",
    shortTitle: "Education",
    icon: "education",
    status: "registered-objective",
    enabled: true,
    summary:
      "Education is one of the registered objectives of H R Foundation. We aim to help children and young people continue learning with dignity.",
    metaDescription:
      "Education is a registered charitable objective of H R Foundation, Telangana. Learn about our aims and how to enquire about education support.",
    overview: [
      "We believe a good education opens doors that last a lifetime. Education is one of the charitable objectives for which H R Foundation was established.",
      "The foundation is preparing its first education programmes. Details of approved activities, eligibility and how to apply will be published on this page once they are finalised by the trustees.",
    ],
    objectives: [
      "Help deserving students continue their studies when money is a barrier.",
      "Encourage learning in families and communities with limited resources.",
      "Work fairly and transparently, with clear criteria for any support offered.",
    ],
    approvedActivities: [],
    potentialInitiatives: [
      "Learning resources such as books and study materials",
      "Educational assistance for students in need",
      "Guidance and encouragement for students and parents",
    ],
    enquiry:
      "If you would like to know when education support opens, or wish to support this work, please contact the foundation. We will reply once programme details are approved.",
  },
  {
    slug: "medical-relief",
    href: "/services/medical-relief",
    title: "Medical Relief",
    shortTitle: "Medical relief",
    icon: "medical",
    status: "registered-objective",
    enabled: true,
    summary:
      "Medical relief is a registered objective of the foundation. We aim to ease the burden of illness for people who cannot afford essential care.",
    metaDescription:
      "Medical relief is a registered charitable objective of H R Foundation, Telangana. Read about our aims and how to contact us about medical relief.",
    overview: [
      "Illness should never force a family to choose between treatment and their basic needs. Medical relief is one of the charitable objectives for which H R Foundation was established.",
      "The foundation has not yet announced an operational medical-relief programme. When the trustees approve specific activities, this page will explain what is offered, who can apply and how requests are assessed.",
    ],
    objectives: [
      "Support people facing hardship because of medical needs.",
      "Promote basic health awareness in the community.",
      "Assess every request carefully, fairly and with respect for privacy.",
    ],
    approvedActivities: [],
    potentialInitiatives: [
      "Assistance towards essential medical treatment",
      "Health awareness sessions",
      "Guidance on available public health services",
    ],
    eligibility: [
      "Eligibility criteria have not yet been published. They will be added here after approval by the trustees.",
    ],
    enquiry:
      "Please do not send medical records through the website. Contact the foundation first, and we will explain how to share information safely if a programme is open.",
  },
  {
    slug: "community-welfare",
    href: "/services/community-welfare",
    title: "Community Welfare",
    shortTitle: "Community welfare",
    icon: "community",
    status: "pending-confirmation",
    enabled: true,
    summary:
      "Relief of the poor and work of general public utility are among the trust's registered objects. Specific community-welfare activities are awaiting confirmation.",
    metaDescription:
      "Community welfare at H R Foundation, Telangana — relief of the poor and general public utility. Programme details are awaiting confirmation.",
    overview: [
      "The trust's registered objects include the relief of the poor, the preservation of the environment and other objects of general public utility.",
      "The foundation has not yet confirmed which community-welfare activities it will carry out. Nothing on this page should be read as a description of a running programme.",
    ],
    objectives: [
      "Support individuals and families experiencing poverty.",
      "Contribute to a cleaner, healthier local environment.",
      "Respond to community needs in ways that are fair and accountable.",
    ],
    approvedActivities: [],
    potentialInitiatives: [
      "Essential support for families in hardship",
      "Environmental care activities such as tree planting",
      "Community awareness activities",
    ],
    enquiry:
      "If you would like to suggest a community need or offer to help, please write to us through the contact page.",
  },
  {
    slug: "membership-support",
    href: "/services/membership-support",
    title: "Membership & Death-Benefit Support",
    shortTitle: "Membership support",
    icon: "membership",
    status: "proposed",
    enabled: true,
    summary:
      "A proposed membership scheme with a possible death-benefit provision of up to ₹2,00,000 for eligible members, subject to formal approval.",
    metaDescription:
      "Information about H R Foundation's proposed membership scheme and death-benefit provision. Subject to formal approval of terms and legal status.",
    overview: [
      "H R Foundation is designing a membership scheme through which members may be considered for a death-benefit support payment to their nominee.",
      "This scheme is proposed. It is not insurance, and it does not create a guaranteed payment or an automatic entitlement. Its final rules, funding arrangements and legal status must be approved by the foundation before it becomes operational.",
    ],
    objectives: [
      "Offer families a measure of support at a very difficult time.",
      "Run the scheme with clear rules, careful verification and full records.",
      "Protect the privacy of members and nominees.",
    ],
    approvedActivities: [],
    potentialInitiatives: [],
    enquiry:
      "Read the membership page and the proposed terms before applying, and contact the foundation if anything is unclear.",
  },
];

export const enabledServices = services.filter((s) => s.enabled);

export function getService(slug: string) {
  return services.find((s) => s.slug === slug && s.enabled);
}
