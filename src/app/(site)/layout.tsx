import { SiteFooter } from "@/components/layout/SiteFooter";
import { Suspense } from "react";
import { SiteHeader, SiteHeaderWithPath } from "@/components/layout/SiteHeader";
import { buildMainNav } from "@/content/navigation";
import { registeredObjects, registration, site, siteUrl } from "@/content/site";
import { getServices } from "@/lib/cms";
import { JsonLd, organisationId } from "@/lib/structured-data";

/** Structured data limited to verified information. */
const organisationJsonLd = {
  "@context": "https://schema.org",
  "@type": "NGO",
  "@id": organisationId,
  name: site.name,
  alternateName: site.shortName,
  url: siteUrl,
  logo: `${siteUrl}/brand/hr-foundation-logo.png`,
  slogan: "People · Opportunity · Healthier Tomorrows",
  description: site.description,
  foundingDate: "2024-12-20",
  areaServed: [
    { "@type": "AdministrativeArea", name: `${site.address.district} district, ${site.address.state}` },
    { "@type": "State", name: site.address.state },
  ],
  address: {
    "@type": "PostalAddress",
    addressLocality: site.address.district,
    addressRegion: site.address.state,
    addressCountry: "IN",
  },
  knowsAbout: registeredObjects.slice(0, 3),
  email: site.contact.email,
  identifier: registration
    .filter((r) => r.show && /Registration number|Darpan/.test(r.label))
    .map((r) => ({ "@type": "PropertyValue", name: r.label, value: r.value })),
  ...(site.social.length ? { sameAs: site.social.map((s) => s.href) } : {}),
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: site.name,
  url: siteUrl,
  inLanguage: "en-IN",
  publisher: { "@id": organisationId },
};

export default async function SiteLayout({ children }: LayoutProps<"/">) {
  const nav = buildMainNav(await getServices());
  return (
    <>
      <a
        href="#main"
        className="sr-only z-[60] rounded-full bg-forest px-5 py-3 font-semibold text-ivory focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to main content
      </a>
      <Suspense fallback={<SiteHeader nav={nav} />}>
        <SiteHeaderWithPath nav={nav} />
      </Suspense>
      <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
        {children}
      </main>
      <SiteFooter />
      <JsonLd data={[organisationJsonLd, websiteJsonLd]} />
    </>
  );
}
