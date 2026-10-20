import Link from "next/link";
import { Mail } from "lucide-react";
import { buildFooterNav, legalNav } from "@/content/navigation";
import { getServices } from "@/lib/cms";
import { publicSettings } from "@/lib/settings";
import { registration, site } from "@/content/site";
import { BrandLogo } from "@/components/ui/Brand";

export async function SiteFooter() {
  const [settings, services] = await Promise.all([publicSettings("website"), getServices()]);
  const email = settings.email || site.contact.email;
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

          <div className="mt-8 space-y-3 text-sm text-ivory/85">
            <p className="eyebrow text-gold">Official contact</p>
            <p className="flex items-center gap-3">
              <Mail aria-hidden className="size-4 shrink-0 text-gold" />
              <a className="font-medium hover:text-gold transition-colors" href={`mailto:${email}`}>
                {email}
              </a>
            </p>
            <p className="text-xs text-ivory/60">
              For enquiries, support, or receipt requests, please write to our official email or use our{" "}
              <Link href="/contact" className="underline underline-offset-4 hover:text-gold">
                contact form
              </Link>
              .
            </p>
          </div>
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
          </ul>
        </div>
      </div>
    </footer>
  );
}
