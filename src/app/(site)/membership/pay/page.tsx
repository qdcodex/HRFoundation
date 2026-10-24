import Link from "next/link";
import { PayMembershipFeeForm } from "@/components/forms/PayMembershipFee";
import { PageHero } from "@/components/sections/PageHero";
import { PendingNote } from "@/components/ui/States";
import { site } from "@/content/site";
import { toMembershipView } from "@/lib/membership-view";
import { isRazorpayEnabled, isTestMode } from "@/lib/payments/razorpay";
import { publicSettings } from "@/lib/settings";

export const metadata = {
  title: "Pay membership fee",
  description: "Pay your H R Foundation membership fee securely online by card, net banking or UPI using your application reference and registered mobile number.",
  alternates: { canonical: "/membership/pay" },
};

export default async function PayMembershipPage() {
  const m = toMembershipView(await publicSettings("membershipRules"));
  const online = isRazorpayEnabled() && Boolean(m.feeLabel);
  return (
    <>
      <PageHero
        crumbs={[{ label: "Membership", href: "/membership" }, { label: "Pay fee" }]}
        eyebrow="Membership"
        title="Pay your membership fee."
        intro={
          m.feeLabel
            ? `The membership fee is ${m.feeLabel}. Enter your application reference and mobile number to pay securely online.`
            : "The membership fee will be confirmed by the foundation."
        }
      />
      <section className="bg-ivory py-16 sm:py-20">
        <div className="container-site max-w-3xl">
          {online ? (
            <div className="rounded-[2rem] bg-white p-6 ring-1 ring-line sm:p-8">
              <PayMembershipFeeForm feeLabel={m.feeLabel!} testMode={isTestMode()} />
            </div>
          ) : (
            <PendingNote>
              Online payment is not available at the moment. Please email{" "}
              <a href={`mailto:${site.contact.email}`} className="text-emerald-ink underline underline-offset-2">
                {site.contact.email}
              </a>{" "}
              with your application reference and we will tell you how to pay.
            </PendingNote>
          )}
          <p className="mt-6 text-sm text-muted">
            Have not applied yet?{" "}
            <Link href="/membership#register" className="font-semibold text-emerald-ink underline underline-offset-2">
              Apply for membership
            </Link>{" "}
            first. After your payment is confirmed, the foundation reviews your application and sends your membership ID, login
            details and certificate.
          </p>
        </div>
      </section>
    </>
  );
}
