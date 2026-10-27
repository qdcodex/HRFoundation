import { PageHeader } from "@/components/admin/page-header";
import { TaxCertificateCard, TaxDetailsForm } from "@/components/admin/system/tax-forms";
import { AccessDenied, Notice } from "@/components/admin/ui/feedback";
import { guardPage } from "@/lib/auth/dal";
import { isRegistrationActive, loadSettings, type TaxRegistration } from "@/lib/settings";

export const instant = false;
export const metadata = { title: "12A & 80G" };

const view = (r: TaxRegistration) => ({ number: r.number, validFrom: r.validFrom, validTo: r.validTo, fileName: r.fileName, hasFile: Boolean(r.fileId) });

export default async function TaxExemptionPage() {
  const { allowed } = await guardPage("settings:manage");
  if (!allowed) return <AccessDenied />;
  const t = await loadSettings("taxExemption");
  const active80G = isRegistrationActive(t.reg80G);
  return (
    <>
      <PageHeader
        title="12A & 80G"
        description="Tax-exemption registrations sent to donors with their donation receipts."
        crumbs={[{ label: "Administration" }, { label: "12A & 80G" }]}
      />
      <Notice tone={active80G ? "info" : "warning"} className="mb-6 max-w-3xl">
        {active80G ? (
          <>80G is <strong>active</strong>: receipts show the 80G and 12A details and donors receive the certificates by email and on the thank-you screen.</>
        ) : (
          <>
            80G is <strong>not active</strong>. Receipts say they do not certify a tax deduction, and no certificates are sent. Upload only the final approval
            orders (Form 10AC / 10AD) — never the Form 10A application or its acknowledgement.
          </>
        )}
      </Notice>
      <div className="grid max-w-5xl gap-6 lg:grid-cols-2">
        <div className="lg:col-span-2">
          <TaxDetailsForm value={{ trustPan: t.trustPan, reg12A: view(t.reg12A), reg80G: view(t.reg80G) }} />
        </div>
        <TaxCertificateCard kind="reg12A" title="12A" reg={view(t.reg12A)} />
        <TaxCertificateCard kind="reg80G" title="80G" reg={view(t.reg80G)} />
      </div>
    </>
  );
}
