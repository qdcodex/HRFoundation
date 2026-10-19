import { NewClaimForm } from "@/components/admin/claims/new-claim-form";
import { PageHeader } from "@/components/admin/page-header";
import { AccessDenied, Notice } from "@/components/admin/ui/feedback";
import { guardPage } from "@/lib/auth/dal";
import { toIso, todayInIndia } from "@/lib/waiting-period";

export const instant = false;
export const metadata = { title: "Record a claim" };

export default async function NewClaimPage({ searchParams }: PageProps<"/admin/claims/new">) {
  const { allowed } = await guardPage("claims:review");
  if (!allowed) return <AccessDenied />;
  const sp = await searchParams;
  return (
    <>
      <PageHeader title="Record a death-benefit claim" crumbs={[{ label: "Claims", href: "/admin/claims" }, { label: "New" }]} />
      <Notice className="mb-6 max-w-3xl">
        Record the claim as received. Recording a claim does not assess or approve it. Upload supporting documents on the next screen — never ask for documents
        through the public website.
      </Notice>
      <div className="max-w-3xl">
        <NewClaimForm today={toIso(todayInIndia())} defaultMembershipId={typeof sp.membershipId === "string" ? sp.membershipId : undefined} />
      </div>
    </>
  );
}
