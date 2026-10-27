import { BadgeInfo, CreditCard, MessageSquareText, ReceiptText, ShieldCheck } from "lucide-react";
import { CallToAction } from "@/components/sections/CallToAction";
import { OnlineDonationForm } from "@/components/forms/OnlineDonationForm";
import { DonationPanel } from "@/components/sections/DonationPanel";
import { PageHero } from "@/components/sections/PageHero";
import { TextLink } from "@/components/ui/Button";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { EmptyState } from "@/components/ui/States";
import { donation } from "@/content/donation";
import { cmsPageMetadata } from "@/lib/metadata";
import { getPage } from "@/lib/cms";
import { isRazorpayEnabled, isTestMode } from "@/lib/payments/razorpay";
import { isRegistrationActive, publicSettings } from "@/lib/settings";

export function generateMetadata() {
  return cmsPageMetadata("donate", "/donate");
}

export default async function DonatePage() {
  const page = await getPage("donate");
  const online = isRazorpayEnabled();
  const tax = await publicSettings("taxExemption");
  const has80G = isRegistrationActive(tax.reg80G);
  const has12A = isRegistrationActive(tax.reg12A);
  const steps = [
    { title: "Scan or copy", text: "Scan the QR code with any UPI app (such as BHIM, Google Pay, PhonePe or Paytm), or copy the UPI ID." },
    { title: "Check and pay", text: "Confirm the UPI ID, enter the amount you wish to give and complete the payment in your app." },
    { title: "Keep your reference", text: "Note the UPI transaction reference (UTR) shown by your app after payment." },
    { title: "Tell us (optional)", text: "To receive an acknowledgement or receipt, send us your name, amount, date and UTR." },
  ];

  return (
    <>
      <PageHero
        crumbs={[{ label: "Donate" }]}
        eyebrow="Support our mission"
        title={page.title}
        intro={page.intro}
      />

      <section className="bg-ivory py-16 sm:py-24" aria-labelledby="give-heading">
        <div className="container-site grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <SectionHeading id="give-heading" index="01" eyebrow="Give by UPI" title="Donate in under a minute." />
            <ol className="mt-10 space-y-6">
              {steps.map((s, i) => (
                <li key={s.title} className="flex gap-5">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full border border-gold font-display text-sm font-bold text-gold-ink">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="font-display text-lg font-bold text-forest">{s.title}</h3>
                    <p className="mt-1 leading-relaxed text-muted">{s.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <div className="lg:col-span-7">
            {donation.upi.enabled ? (
              <DonationPanel />
            ) : (
              <EmptyState title="Donation details coming soon">
                The foundation&apos;s approved donation channel will be published here shortly.
              </EmptyState>
            )}
            <div className="mt-6 flex gap-3 rounded-2xl bg-sage p-5 text-sm leading-relaxed text-charcoal">
              <ShieldCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-emerald" />
              <p>
                H R Foundation will never ask you for your UPI PIN, OTP or bank password. Only enter your PIN inside your own UPI
                app to approve a payment you started.
              </p>
            </div>
          </div>
        </div>
      </section>

      {online && (
        <section id="online" className="scroll-mt-24 bg-white py-16 sm:py-24" aria-labelledby="online-heading">
          <div className="container-site grid gap-12 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <SectionHeading
                id="online-heading"
                index="02"
                eyebrow="Give online"
                title="Card, net banking, UPI or wallet."
                intro="Choose an amount and pay securely through Razorpay. You receive an email confirmation straight away."
              />
            </div>
            <div className="lg:col-span-7">
              <div className="rounded-[2rem] bg-ivory p-6 ring-1 ring-line sm:p-8">
                <OnlineDonationForm presets={donation.gateway.presetsInr} min={donation.gateway.minInr} max={donation.gateway.maxInr} testMode={isTestMode()} has80G={has80G} />
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="bg-forest py-16 text-ivory sm:py-24" aria-labelledby="receipts-heading">
        <div className="container-site">
          <SectionHeading
            id="receipts-heading"
            tone="dark"
            index={online ? "03" : "02"}
            eyebrow="Transparency & receipts"
            title="Know what you will receive."
          />
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            <div className="rounded-2xl bg-forest-soft p-7">
              <ReceiptText aria-hidden className="size-7 text-gold" />
              <h3 className="mt-5 font-display text-xl font-bold">Donation receipt</h3>
              <p className="mt-2 leading-relaxed text-ivory/80">
                Issued to you for your specific donation. Request one by writing to us with your name, amount, date and
                UPI transaction reference.
              </p>
              <TextLink href="/contact" className="mt-5 text-gold hover:text-ivory">
                Request a receipt
              </TextLink>
            </div>
            <div className="rounded-2xl bg-forest-soft p-7">
              <ShieldCheck aria-hidden className="size-7 text-gold" />
              <h3 className="mt-5 font-display text-xl font-bold">Accountability & records</h3>
              <p className="mt-2 leading-relaxed text-ivory/80">
                Every donation is recorded and checked against the foundation&apos;s bank statement before a receipt is issued.
              </p>
              <TextLink href="/about" className="mt-5 text-gold hover:text-ivory">
                About our trust
              </TextLink>
            </div>
            <div className="rounded-2xl border border-gold/40 p-7">
              <BadgeInfo aria-hidden className="size-7 text-gold" />
              <h3 className="mt-5 font-display text-xl font-bold">Tax deductions</h3>
              <p className="mt-2 leading-relaxed text-ivory/80">
                {has80G
                  ? `Donations are eligible for deduction under section 80G, subject to the conditions of that section. Your receipt comes with the foundation's ${has12A ? "80G and 12A certificates" : "80G approval certificate"}.`
                  : "Please do not assume your donation is tax-deductible. Information on eligibility will be published only after the relevant approval has been received and verified."}
              </p>
              {has80G && (
                <TextLink href="/save-tax" className="mt-5 text-gold hover:text-ivory">
                  How 80G works &amp; tax calculator
                </TextLink>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-ivory py-16 sm:py-20" aria-labelledby="other-ways-heading">
        <div className="container-site grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-line bg-white p-7">
            <CreditCard aria-hidden className="size-7 text-emerald" />
            <h2 id="other-ways-heading" className="mt-5 font-display text-xl font-bold text-forest">
              Card and net-banking payments
            </h2>
            <p className="mt-2 leading-relaxed text-muted">
              {online
                ? "You can also donate online by card, net banking, UPI or wallet in the “Give online” section above."
                : "Online card and net-banking donations are not available yet. UPI is currently the only approved way to donate online."}
            </p>
          </div>
          <div className="rounded-2xl border border-line bg-white p-7">
            <MessageSquareText aria-hidden className="size-7 text-emerald" />
            <h2 className="mt-5 font-display text-xl font-bold text-forest">Questions about giving?</h2>
            <p className="mt-2 leading-relaxed text-muted">
              If you would like to discuss a larger gift, a donation in kind or support for a particular objective, please get in
              touch.
            </p>
            <TextLink href="/contact" className="mt-5">
              Contact the foundation
            </TextLink>
          </div>
        </div>
      </section>

      <CallToAction
        title="Not ready to donate? You can still help."
        text="Volunteer your time, share our work with others, or explore membership."
        primary={{ label: "Get involved", href: "/get-involved" }}
        secondary={{ label: "Membership", href: "/membership" }}
      />
    </>
  );
}
