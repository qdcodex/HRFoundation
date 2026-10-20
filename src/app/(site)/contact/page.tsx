import { Mail, MessageSquareCheck, Shield } from "lucide-react";
import { ContactForm } from "@/components/forms/ContactForm";
import { PageHero } from "@/components/sections/PageHero";
import { site } from "@/content/site";
import { publicSettings } from "@/lib/settings";
import { cmsPageMetadata } from "@/lib/metadata";
import { getPage } from "@/lib/cms";

export function generateMetadata() {
  return cmsPageMetadata("contact", "/contact");
}

export default async function ContactPage() {
  const page = await getPage("contact");
  const settings = await publicSettings("website");
  const email = settings.email || site.contact.email;

  return (
    <>
      <PageHero
        crumbs={[{ label: "Contact" }]}
        eyebrow="Contact us"
        title={page.title}
        intro={page.intro}
      />

      <section className="bg-ivory py-16 sm:py-24">
        <div className="container-site grid gap-12 lg:grid-cols-12">
          <aside className="lg:col-span-4" aria-labelledby="contact-details-heading">
            <h2 id="contact-details-heading" className="display-md text-forest">
              Get in touch
            </h2>
            <p className="mt-4 leading-relaxed text-muted">
              We welcome correspondence regarding our charitable programmes, membership, donations, and community initiatives.
            </p>

            <div className="mt-8 space-y-5">
              <div className="flex gap-4 rounded-2xl border border-line bg-white p-5 shadow-xs">
                <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-sage text-forest">
                  <Mail aria-hidden className="size-6 text-emerald" />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted">Email ID</p>
                  <a
                    href={`mailto:${email}`}
                    className="mt-1 block font-display text-base font-semibold text-forest hover:text-emerald-ink break-all transition-colors"
                  >
                    {email}
                  </a>
                  <p className="mt-1 text-xs text-muted">Primary contact channel</p>
                </div>
              </div>

              <div className="flex gap-4 rounded-2xl border border-line bg-white p-5 shadow-xs">
                <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-sage text-forest">
                  <MessageSquareCheck aria-hidden className="size-6 text-emerald" />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted">Web Enquiries</p>
                  <p className="mt-1 text-sm font-medium text-charcoal">
                    Send a message anytime using the form on this page.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 rounded-2xl bg-forest p-6 text-sm leading-relaxed text-ivory/85">
              <div className="flex items-center gap-2 font-semibold text-gold mb-2">
                <Shield className="size-4 shrink-0" />
                <span>Privacy & Safety Notice</span>
              </div>
              <p>
                For your safety, please do not send bank account passwords, UPI PINs, or confidential identity documents through web forms or unencrypted channels.
              </p>
            </div>
          </aside>

          <section className="rounded-[2rem] border border-line bg-white p-6 sm:p-10 lg:col-span-8" aria-labelledby="contact-form-heading">
            <h2 id="contact-form-heading" className="display-md text-forest">
              Send a message
            </h2>
            <div className="mt-8">
              <ContactForm />
            </div>
          </section>
        </div>
      </section>
    </>
  );
}
