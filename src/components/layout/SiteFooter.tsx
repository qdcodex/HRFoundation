import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { buildFooterNav, legalNav } from "@/content/navigation";
import { getServices } from "@/lib/cms";
import { publicSettings } from "@/lib/settings";
import { registration, site } from "@/content/site";
import { BrandLogo } from "@/components/ui/Brand";

export async function SiteFooter() {
  const { address } = site;
  const [settings, services] = await Promise.all([publicSettings("website"), getServices()]);
  const contact = { phone: settings.phone || null, email: settings.email || null };
  const footerNav = buildFooterNav(services);
  const regNo = registration.find((r) => r.label === "Registration number");
  const darpan = registration.find((r) => r.label.startsWith("NGO Darpan"));

  return (
    <footer className="bg-forest-deep text-ivory" aria-labelledby="footer-heading">
      <h2 id="footer-heading" className="sr-only">
        Site footer
      </h2>
      <div className="container-site grid gap-12 pt-16 pb-12 lg:grid-cols-12 lg:pt-20">
        <div className="lg:col-span-4">
          <Link href="/" aria-label="H R Foundation — home" className="block w-56 rounded-2xl bg-ivory px-5 py-4">
            <BrandLogo sizes="224px" />
          </Link>
          <p className="mt-6 max-w-sm leading-relaxed text-ivory/75">
            A charitable trust in Peddapalli, Telangana, working towards education, medical relief and the relief of the poor.
          </p>

          <address className="mt-8 space-y-4 text-sm not-italic text-ivory/85">
            <p className="flex gap-3">
              <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-gold" />
              <span>
                {address.line1}, {address.locality}
                <br />
                {address.district}, {address.state} {address.postalCode}
              </span>
            </p>
            <p className="flex gap-3">
              <Phone aria-hidden className="mt-0.5 size-4 shrink-0 text-gold" />
              {contact.phone ? (
                <a className="hover:text-gold" href={`tel:${contact.phone.replace(/\s/g, "")}`}>
                  {contact.phone}
                </a>
              ) : (
                <span className="text-ivory/60">Public phone number to be announced</span>
              )}
            </p>
            <p className="flex gap-3">
              <Mail aria-hidden className="mt-0.5 size-4 shrink-0 text-gold" />
              {contact.email ? (
                <a className="hover:text-gold" href={`mailto:${contact.email}`}>
                  {contact.email}
                </a>
              ) : (
                <Link className="underline underline-offset-4 hover:text-gold" href="/contact">
                  Write to us through our contact form
                </Link>
              )}
            </p>
          </address>
        </div>

        <nav aria-label="Footer" className="grid grid-cols-2 gap-10 sm:grid-cols-3 lg:col-span-8 lg:pl-12">
          {footerNav.map((group) => (
            <div key={group.title}>
              <h3 className="eyebrow text-gold">{group.title}</h3>
              <ul className="mt-5 space-y-3">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="link-underline text-[0.95rem] text-ivory/85 hover:text-ivory">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>

      <div className="border-t border-ivory/10">
        <div className="container-site flex flex-col gap-4 py-6 text-sm text-ivory/65 md:flex-row md:items-center md:justify-between">
          <p>
            © {site.name}
            {regNo?.show && <> · Trust Reg. No. {regNo.value.replace(/\s*\(.*\)/, "")}</>}
            {darpan?.show && <> · NGO Darpan ID {darpan.value}</>}
          </p>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {legalNav.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="hover:text-ivory">
                  {l.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/documents" className="hover:text-ivory">
                Public documents
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
