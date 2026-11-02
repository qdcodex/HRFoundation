import { isValidElement, type ReactNode } from "react";
import { siteUrl } from "@/content/site";

type Json = Record<string, unknown>;

/** Renders schema.org JSON-LD. `<` is escaped so content can never close the script tag. */
export function JsonLd({ data }: { data: Json | Json[] }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

/** Plain text of simple JSX (strings, fragments, inline elements), for FAQ answers in structured data. */
export function nodeText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) return nodeText(node.props.children);
  return "";
}

const absolute = (href: string) => (href.startsWith("http") ? href : `${siteUrl}${href === "/" ? "" : href}`);

export function breadcrumbJsonLd(trail: { label: string; href?: string }[]): Json {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.label,
      ...(c.href && i < trail.length - 1 ? { item: absolute(c.href) } : {}),
    })),
  };
}

export function faqJsonLd(items: { q: string; a: ReactNode }[]): Json {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: nodeText(item.a).replace(/\s+/g, " ").trim() },
    })),
  };
}

export const organisationId = `${siteUrl}/#organization`;
