import type { ReactNode } from "react";
import Link from "next/link";
import { BadgeCheck, ChevronDown, FileCheck2, Mail, ReceiptText, Share2, ShieldCheck } from "lucide-react";
import { OnlineDonationForm } from "@/components/forms/OnlineDonationForm";
import { PageHero } from "@/components/sections/PageHero";
import { TaxSavingsCalculator } from "@/components/sections/TaxSavingsCalculator";
import { ButtonLink } from "@/components/ui/Button";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { PendingNote } from "@/components/ui/States";
import { donation } from "@/content/donation";
import { registration, site, siteUrl } from "@/content/site";
import { fmtDate } from "@/lib/format";
import { pageMetadata } from "@/lib/metadata";
import { isRazorpayEnabled, isTestMode } from "@/lib/payments/razorpay";
import { isRegistrationActive, publicSettings } from "@/lib/settings";

export function generateMetadata() {
  return pageMetadata({
    title: "Donate and Save Tax under Section 80G",
    description:
      "Donate to H R Foundation and claim a 50% tax deduction under section 80G. Instant receipt with our 80G and 12A approval certificates, a tax-savings calculator and clear answers on how to claim.",
    path: "/save-tax",
  });
}

export default async function SaveTaxPage() {
  const tax = await publicSettings("taxExemption");
  const has80G = isRegistrationActive(tax.reg80G);
  const has12A = isRegistrationActive(tax.reg12A);
  const online = isRazorpayEnabled();
  const certificates = has12A ? "80G and 12A approval certificates" : "80G approval certificate";
  const until = tax.reg80G.validTo ? fmtDate(tax.reg80G.validTo) : null;
  const shareText = encodeURIComponent(`Donate to ${site.name} and save tax under section 80G: ${siteUrl}/save-tax`);

  if (!has80G) {
    return (
      <>
        <PageHero crumbs={[{ label: "Donate", href: "/donate" }, { label: "Save tax" }]} eyebrow="Tax benefits" title="Tax benefits on donations." />
        <section className="bg-ivory py-16">
          <div className="container-site max-w-3xl space-y-6">
            <PendingNote>
              Information on tax deductions for donations will be published here once the foundation&apos;s 80G approval is in place. Please do not assume a
              donation is tax-deductible until then.
            </PendingNote>
            <ButtonLink href="/donate" arrow>
              Donate to H R Foundation
            </ButtonLink>
          </div>
        </section>
      </>
    );
  }

  const highlights = [
    { Icon: BadgeCheck, title: "50% deduction", text: "of your donation under section 80G of the Income-tax Act." },
    { Icon: ReceiptText, title: "Instant receipt", text: `with our ${certificates}, on screen and by email.` },
    { Icon: FileCheck2, title: "Form 10BE", text: "issued to you after the year ends, to claim the deduction." },
  ];

  const steps = [
    { title: "Donate", text: "Pay online by UPI, card, net banking or wallet. Add your PAN so we can report your donation to the Income Tax Department." },
    { title: "Get your receipt instantly", text: `Your donation receipt shows our 80G approval number. It comes with our ${certificates}.` },
    {
      title: "Receive Form 10BE",
      text: "After the financial year, we file Form 10BD with the Income Tax Department and send you Form 10BE — the certificate for your claim — by 31 May.",
    },
    { title: "Claim in your return", text: "Claim the deduction in your income-tax return under section 80G (old tax regime), using the details on Form 10BE." },
  ];

  const faq: { q: string; a: ReactNode }[] = [
    {
      q: "What is section 80G?",
      a: (
        <>
          Section 80G of the Income-tax Act, 1961 lets you reduce your taxable income by donating to approved charitable organisations. {site.name} is approved
          under section 80G (URN <strong className="font-mono">{tax.reg80G.number}</strong>){until ? <> until {until}</> : null}.
        </>
      ),
    },
    {
      q: "How much tax can I save?",
      a: (
        <>
          You can deduct <strong>50% of your donation</strong> from your taxable income. The amount that qualifies is limited to 10% of your adjusted gross total
          income. For example, if you are in the 30% slab and donate ₹10,000, your taxable income falls by ₹5,000 and you save about ₹1,560 in tax
          (₹1,500 plus 4% cess). Use the calculator above for your own estimate.
        </>
      ),
    },
    {
      q: "I have chosen the new tax regime. Can I claim 80G?",
      a: <>No. The deduction under section 80G is available only under the old tax regime. Under the new (default) regime, donations do not reduce your tax.</>,
    },
    {
      q: "Which donations qualify?",
      a: (
        <>
          Donations by UPI, card, net banking, cheque or bank transfer qualify. <strong>Cash donations above ₹2,000 do not qualify</strong>. Donations in kind
          (goods or services) do not qualify either.
        </>
      ),
    },
    {
      q: "What documents will I receive?",
      a: (
        <>
          Straight after an online donation: your <strong>donation receipt</strong> with our PAN and 80G approval number, plus our {certificates} — on screen and
          by email. After the financial year ends: <strong>Form 10BE</strong>, which you need to claim the deduction.
        </>
      ),
    },
    {
      q: "Why do you ask for my PAN?",
      a: (
        <>
          Every year we must report donations to the Income Tax Department in Form 10BD, with each donor&apos;s PAN. Your deduction appears in your Form 10BE and
          tax records only if we have your PAN. It is optional, kept private and never published.
        </>
      ),
    },
    {
      q: "I donated by UPI QR code. Can I still get a receipt?",
      a: (
        <>
          Yes. Email{" "}
          <a href={`mailto:${site.contact.email}`} className="text-emerald-ink underline underline-offset-2">
            {site.contact.email}
          </a>{" "}
          with your name, PAN, address, the amount, date and UPI transaction reference (UTR). We verify the payment and send your receipt and certificates.
        </>
      ),
    },
    {
      q: "Can I donate from outside India?",
      a: (
        <>
          Donations from foreign sources need special registration (FCRA). Please{" "}
          <Link href="/contact" className="text-emerald-ink underline underline-offset-2">
            contact us
          </Link>{" "}
          before donating from a foreign bank account or card.
        </>
      ),
    },
  ];

  return (
    <>
      <PageHero
        crumbs={[{ label: "Donate", href: "/donate" }, { label: "Save tax" }]}
        eyebrow="Donate & save tax"
        title="Give to H R Foundation and save tax under 80G."
        intro="Your donation supports education, medical relief and families in need in Telangana — and earns you a 50% tax deduction under section 80G of the Income-tax Act."
        aside={
          <ul className="grid gap-3">
            {highlights.map(({ Icon, title, text }) => (
              <li key={title} className="flex gap-4 rounded-2xl bg-white p-5 ring-1 ring-line">
                <Icon aria-hidden className="mt-0.5 size-6 shrink-0 text-gold-ink" />
                <p className="leading-relaxed text-muted">
                  <strong className="font-display text-forest">{title}</strong> {text}
                </p>
              </li>
            ))}
          </ul>
        }
      >
        <div className="flex flex-col gap-3 sm:flex-row">
          <ButtonLink href="#donate-now" size="lg" arrow>
            Donate now
          </ButtonLink>
          <ButtonLink href="#calculator" size="lg" variant="outline">
            Calculate your tax saving
          </ButtonLink>
        </div>
      </PageHero>

      <section id="donate-now" className="scroll-mt-24 bg-ivory py-16 sm:py-24" aria-labelledby="donate-now-heading">
        <div className="container-site grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <SectionHeading
              id="donate-now-heading"
              index="01"
              eyebrow="Donate"
              title="Donate in a minute, get your 80G receipt instantly."
              intro="Choose an amount and pay securely. Add your PAN to have your donation reported for your 80G claim."
            />
            <ul className="mt-8 space-y-3 text-charcoal">
              {[
                "50% of your donation is deductible under section 80G",
                `Receipt + ${certificates} on screen and by email`,
                "Form 10BE sent to you after the financial year",
                "Secure payment by Razorpay — UPI, cards, net banking, wallets",
              ].map((t) => (
                <li key={t} className="flex gap-3">
                  <ShieldCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-emerald" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="lg:col-span-7">
            {online ? (
              <div className="rounded-[2rem] bg-white p-6 ring-1 ring-line sm:p-8">
                <OnlineDonationForm presets={donation.gateway.presetsInr} min={donation.gateway.minInr} max={donation.gateway.maxInr} testMode={isTestMode()} has80G />
              </div>
            ) : (
              <div className="rounded-[2rem] bg-white p-6 ring-1 ring-line sm:p-8">
                <p className="leading-relaxed text-charcoal">Donate by UPI on our donate page, then email us your details to receive your 80G receipt.</p>
                <ButtonLink href="/donate" className="mt-6" arrow>
                  Go to the donate page
                </ButtonLink>
              </div>
            )}
          </div>
        </div>
      </section>

      <section id="calculator" className="scroll-mt-24 bg-sage py-16 sm:py-24" aria-labelledby="calculator-heading">
        <div className="container-site grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <SectionHeading
              id="calculator-heading"
              index="02"
              eyebrow="Calculator"
              title="See what your donation saves you."
              intro="Half of your donation is deducted from your taxable income. The tax you save depends on your slab."
            />
          </div>
          <div className="lg:col-span-7">
            <TaxSavingsCalculator presets={[1000, 5000, 10000]} />
          </div>
        </div>
      </section>

      <section className="bg-ivory py-16 sm:py-24" aria-labelledby="how-heading">
        <div className="container-site">
          <SectionHeading id="how-heading" index="03" eyebrow="How it works" title="From donation to deduction." />
          <ol className="mt-12 grid gap-px overflow-hidden rounded-2xl bg-line sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, i) => (
              <li key={s.title} className="bg-white p-6">
                <span className="font-display text-sm font-bold text-gold-ink">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="mt-3 font-display text-lg font-bold text-forest">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-forest py-16 text-ivory sm:py-20" aria-labelledby="registrations-heading">
        <div className="container-site grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <SectionHeading
              id="registrations-heading"
              tone="dark"
              index="04"
              eyebrow="Registrations"
              title="Approved under 80G and 12A."
              intro="These details appear on every donation receipt, so you can check them."
            />
          </div>
          <dl className="grid gap-px overflow-hidden rounded-2xl bg-ivory/15 sm:grid-cols-2 lg:col-span-7">
            {[
              ["Name", site.name],
              ["PAN of the trust", tax.trustPan],
              ["80G approval (URN)", `${tax.reg80G.number}${tax.reg80G.validFrom ? ` · ${fmtDate(tax.reg80G.validFrom)} – ${fmtDate(tax.reg80G.validTo)}` : ""}`],
              ...(has12A ? [["12A registration (URN)", `${tax.reg12A.number}${tax.reg12A.validFrom ? ` · ${fmtDate(tax.reg12A.validFrom)} – ${fmtDate(tax.reg12A.validTo)}` : ""}`]] : []),
              ...registration.filter((r) => r.show && /Registration number|Darpan/.test(r.label)).map((r) => [r.label, r.value]),
            ]
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k} className="bg-forest p-5">
                  <dt className="text-xs font-semibold tracking-wide text-ivory/60 uppercase">{k}</dt>
                  <dd className="mt-1 font-mono text-sm break-words text-ivory">{v}</dd>
                </div>
              ))}
          </dl>
        </div>
      </section>

      <section className="bg-sage py-16 sm:py-24" aria-labelledby="faq-heading">
        <div className="container-site grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <SectionHeading id="faq-heading" index="05" eyebrow="Questions" title="80G, explained." intro="Straight answers about tax benefits on your donation." />
          </div>
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white lg:col-span-8">
            {faq.map((item) => (
              <li key={item.q}>
                <details className="group">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-display text-lg font-bold text-forest hover:bg-ivory/60 sm:px-6 [&::-webkit-details-marker]:hidden">
                    {item.q}
                    <ChevronDown aria-hidden className="size-5 shrink-0 transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="px-5 pb-5 leading-relaxed text-muted sm:px-6">{item.a}</div>
                </details>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-ivory py-16 sm:py-20" aria-labelledby="cta-heading">
        <div className="container-site flex flex-col items-start gap-6 rounded-[2rem] bg-gold-soft/50 p-8 ring-1 ring-gold/40 sm:p-12 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 id="cta-heading" className="font-display text-3xl font-extrabold text-forest">
              Get a 50% tax deduction under 80G.
            </h2>
            <p className="mt-2 max-w-xl leading-relaxed text-muted">Every donation helps a child stay in school or a family get through a hard time.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="#donate-now" size="lg" arrow>
              Donate now
            </ButtonLink>
            <a href={`https://wa.me/?text=${shareText}`} target="_blank" rel="noopener" className="inline-flex h-13 items-center gap-2 rounded-full border border-forest/30 px-6 font-display font-semibold text-forest hover:bg-white">
              <Share2 aria-hidden className="size-4" /> Share on WhatsApp
            </a>
            <a href={`mailto:?subject=${encodeURIComponent("Donate and save tax under 80G")}&body=${shareText}`} className="inline-flex h-13 items-center gap-2 rounded-full border border-forest/30 px-6 font-display font-semibold text-forest hover:bg-white">
              <Mail aria-hidden className="size-4" /> Email a friend
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
