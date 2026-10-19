import { Clock, Mail, MapPin, Phone } from "lucide-react";
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
  const { address } = site;
  const settings = await publicSettings("website");
  const contact = { phone: settings.phone || null, email: settings.email || null, hours: settings.hours || null };
  const mapQuery = encodeURIComponent(`${address.line1}, ${address.locality}, ${address.district}, ${address.state} ${address.postalCode}`);

  const details = [
    {
      Icon: MapPin,
      label: "Registered address",
      value: (
        <>
          {address.line1}, {address.locality}
          <br />
          {address.district}, {address.state} {address.postalCode}
          <br />
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-sm font-semibold text-emerald-ink underline underline-offset-2"
          >
            Open in Google Maps<span className="sr-only"> (opens in a new tab)</span>
          </a>
        </>
      ),
    },
    {
      Icon: Phone,
      label: "Phone",
      value: contact.phone ? <a href={`tel:${contact.phone.replace(/\s/g, "")}`}>{contact.phone}</a> : <span className="text-muted">To be announced</span>,
    },
    {
      Icon: Mail,
      label: "Email",
      value: contact.email ? <a href={`mailto:${contact.email}`}>{contact.email}</a> : <span className="text-muted">To be announced — please use the form</span>,
    },
    { Icon: Clock, label: "Office hours", value: contact.hours ?? <span className="text-muted">To be announced</span> },
  ];

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
              Contact details
            </h2>
            <address className="mt-8 space-y-6 not-italic">
              {details.map(({ Icon, label, value }) => (
                <div key={label} className="flex gap-4">
                  <span className="grid size-11 shrink-0 place-items-center rounded-full bg-sage text-forest">
                    <Icon aria-hidden className="size-5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-muted">{label}</p>
                    <div className="mt-1 leading-relaxed text-charcoal">{value}</div>
                  </div>
                </div>
              ))}
            </address>
            <p className="mt-10 rounded-2xl bg-forest p-6 text-sm leading-relaxed text-ivory/85">
              For your safety, please do not send bank details, identity numbers or medical records through this form. If we need
              documents, we will explain how to share them securely.
            </p>
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
