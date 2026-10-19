import { SiteFooter } from "@/components/layout/SiteFooter";
import { Suspense } from "react";
import { SiteHeader, SiteHeaderWithPath } from "@/components/layout/SiteHeader";
import { buildMainNav } from "@/content/navigation";
import { registeredObjects, site, siteUrl } from "@/content/site";
import { getServices } from "@/lib/cms";

/** Structured data limited to verified information. */
const organisationJsonLd = {
  "@context": "https://schema.org",
  "@type": "NGO",
  name: site.name,
  url: siteUrl,
  logo: `${siteUrl}/brand/hr-foundation-logo.png`,
  slogan: "People · Opportunity · Healthier Tomorrows",
  description: site.description,
  foundingDate: "2024-12-20",
  areaServed: { "@type": "State", name: "Telangana" },
  address: {
    "@type": "PostalAddress",
    streetAddress: `${site.address.line1}, ${site.address.locality}`,
    addressLocality: site.address.district,
    addressRegion: site.address.state,
    postalCode: site.address.postalCode,
    addressCountry: "IN",
  },
  knowsAbout: registeredObjects.slice(0, 3),
  ...(site.contact.email ? { email: site.contact.email } : {}),
  ...(site.contact.phone ? { telephone: site.contact.phone } : {}),
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organisationJsonLd).replace(/</g, "\\u003c") }}
      />
    </>
  );
}
