import { PaperApplicationForm } from "@/components/admin/membership/application-form";
import { PageHeader } from "@/components/admin/page-header";
import { AccessDenied } from "@/components/admin/ui/feedback";
import { guardPage } from "@/lib/auth/dal";
import { toIso, todayInIndia } from "@/lib/waiting-period";

/** Authenticated, per-request page: navigation waits for the server. */
export const instant = false;

export const metadata = { title: "Paper application" };

export default async function NewApplicationPage() {
  const { allowed } = await guardPage("membership:manage");
  if (!allowed) return <AccessDenied />;
  return (
    <>
      <PageHeader
        title="Enter a paper application"
        description="For applications received on a signed paper form. The application starts as Pending Payment."
        crumbs={[{ label: "Membership", href: "/admin/membership" }, { label: "Applications", href: "/admin/membership/applications" }, { label: "New" }]}
      />
      <div className="max-w-3xl">
        <PaperApplicationForm today={toIso(todayInIndia())} />
      </div>
    </>
  );
}
