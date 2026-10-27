import { PageHeader } from "@/components/admin/page-header";
import { WebsiteSettingsForm } from "@/components/admin/system/system-forms";
import { AccessDenied, Notice } from "@/components/admin/ui/feedback";
import { guardPage } from "@/lib/auth/dal";
import { isEmailConfigured } from "@/lib/server/email";
import { loadSettings } from "@/lib/settings";

export const instant = false;
export const metadata = { title: "Website settings" };

export default async function WebsiteSettingsPage() {
  const { allowed } = await guardPage("settings:manage");
  if (!allowed) return <AccessDenied />;
  const s = await loadSettings("website");
  return (
    <>
      <PageHeader title="Website settings" crumbs={[{ label: "Administration" }, { label: "Website settings" }]} />
      <Notice tone="info" className="mb-6 max-w-3xl">
        Email delivery is <strong>{isEmailConfigured() ? "configured" : "not configured"}</strong>. It is set by the server environment variables EMAIL_USER and
        EMAIL_PASS (see README); secrets are never stored in the dashboard.
      </Notice>
      <div className="max-w-3xl">
        <WebsiteSettingsForm value={{ phone: s.phone, whatsapp: s.whatsapp, email: s.email, hours: s.hours, enquiryInbox: s.enquiryInbox }} />
      </div>
    </>
  );
}
