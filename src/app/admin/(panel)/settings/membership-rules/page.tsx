import { PageHeader } from "@/components/admin/page-header";
import { MembershipRulesForm } from "@/components/admin/system/system-forms";
import { AccessDenied, Notice } from "@/components/admin/ui/feedback";
import { guardPage } from "@/lib/auth/dal";
import { paiseToRupeesInput } from "@/lib/money";
import { loadSettings } from "@/lib/settings";

export const instant = false;
export const metadata = { title: "Membership rules" };

export default async function MembershipRulesPage() {
  const { allowed } = await guardPage("rules:manage");
  if (!allowed) return <AccessDenied />;
  const r = await loadSettings("membershipRules");
  return (
    <>
      <PageHeader
        title="Membership rules"
        description="These values drive waiting-period calculations, eligibility checks, claim limits and the public membership pages."
        crumbs={[{ label: "Administration" }, { label: "Membership rules" }]}
      />
      <Notice className="mb-6 max-w-3xl">
        Changing the waiting period or age limit changes how every member is assessed. Record the foundation&apos;s decision before changing rules; every change
        is kept in the audit log.
      </Notice>
      <div className="max-w-3xl">
        <MembershipRulesForm
          value={{
            schemeApproved: r.schemeApproved,
            registrationOpen: r.registrationOpen,
            fee: paiseToRupeesInput(r.feePaise),
            feePeriod: r.feePeriod,
            waitingPeriodMonths: r.waitingPeriodMonths,
            maxBenefit: paiseToRupeesInput(r.maxBenefitPaise),
            benefitAgeLimit: r.benefitAgeLimit,
            minApplicantAge: r.minApplicantAge,
            termsVersion: r.termsVersion,
            approachingDays: r.approachingDays,
            claimTargetDays: r.claimTargetDays,
          }}
        />
      </div>
    </>
  );
}
