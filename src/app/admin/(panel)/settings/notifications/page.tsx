import { PageHeader } from "@/components/admin/page-header";
import { SimpleTable } from "@/components/admin/simple-table";
import { NotificationTemplatesForm } from "@/components/admin/system/system-forms";
import { Badge } from "@/components/admin/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/admin/ui/card";
import { AccessDenied, Notice } from "@/components/admin/ui/feedback";
import { guardPage } from "@/lib/auth/dal";
import { connectDb } from "@/lib/db/connect";
import { Notification } from "@/lib/db/models/system";
import { fmtDateTime } from "@/lib/format";
import { adminInbox } from "@/lib/notifications";
import { isEmailConfigured } from "@/lib/server/email";
import { loadSettings, NOTIFICATION_EVENTS, templateFor, type NotificationEvent } from "@/lib/settings";

export const instant = false;
export const metadata = { title: "Notification settings" };

export default async function NotificationSettingsPage() {
  const { allowed } = await guardPage("settings:manage");
  if (!allowed) return <AccessDenied />;
  await connectDb();
  const [settings, log] = await Promise.all([loadSettings("notifications"), Notification.find().sort({ createdAt: -1 }).limit(25).lean()]);
  const events = Object.entries(NOTIFICATION_EVENTS).map(([key, e]) => ({ key, label: e.label, to: e.to, vars: [...e.vars] }));
  const inbox = await adminInbox();
  const templates = Object.fromEntries(events.map((e) => [e.key, templateFor(settings, e.key as NotificationEvent)]));
  return (
    <>
      <PageHeader
        title="Notification settings"
        description={`Emails are sent only after the related change has been saved, and every attempt is logged below. Admin inbox: ${inbox ?? "not set (Website settings → enquiry inbox)"}.`}
        crumbs={[{ label: "Administration" }, { label: "Notifications" }]}
      />
      {!isEmailConfigured() && (
        <Notice className="mb-6 max-w-4xl">
          Email delivery is not configured, so notifications are recorded as “skipped”. Set EMAIL_USER and EMAIL_PASS (Gmail app password) on the server to enable sending. SMS is
          not configured in this installation.
        </Notice>
      )}
      <div className="grid gap-6 2xl:grid-cols-5">
        <div className="2xl:col-span-3">
          <NotificationTemplatesForm events={events} templates={templates} adminCopy={settings.adminCopy} />
        </div>
        <Card className="h-fit 2xl:col-span-2">
          <CardHeader>
            <CardTitle>Recent delivery log</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <SimpleTable
              caption="Notification delivery log"
              headers={["When", "Event", "Status"]}
              empty="No notifications yet."
              rows={log.map((n) => [
                <span key="w" className="text-xs whitespace-nowrap">
                  {fmtDateTime(n.createdAt)}
                </span>,
                <span key="e" className="text-xs">
                  {NOTIFICATION_EVENTS[n.event as NotificationEvent]?.label ?? n.event}
                </span>,
                <span key="s" className="flex flex-col gap-0.5">
                  <Badge tone={n.status === "sent" ? "success" : n.status === "failed" ? "danger" : "neutral"}>{n.status}</Badge>
                  {n.error && <span className="text-xs text-muted">{n.error}</span>}
                </span>,
              ])}
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
