import { RecordDonationForm } from "@/components/admin/finance/donation-actions";
import { PageHeader } from "@/components/admin/page-header";
import { AccessDenied } from "@/components/admin/ui/feedback";
import { guardPage } from "@/lib/auth/dal";
import { toIso, todayInIndia } from "@/lib/waiting-period";

export const instant = false;
export const metadata = { title: "Record donation" };

export default async function NewDonationPage() {
  const { allowed } = await guardPage("donations:manage");
  if (!allowed) return <AccessDenied />;
  return (
    <>
      <PageHeader title="Record a donation" crumbs={[{ label: "Donations", href: "/admin/donations" }, { label: "New" }]} />
      <div className="max-w-3xl">
        <RecordDonationForm today={toIso(todayInIndia())} />
      </div>
    </>
  );
}
