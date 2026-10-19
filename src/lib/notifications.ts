import "server-only";
import { connectDb } from "@/lib/db/connect";
import { Notification } from "@/lib/db/models/system";
import { sendEmail } from "@/lib/server/email";
import { loadSettings, templateFor, type NotificationEvent } from "@/lib/settings";

function render(template: string, vars: Record<string, string>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, k: string) => vars[k] ?? "");
}

/**
 * Sends a notification for an event that has ALREADY been committed to the database,
 * and records the delivery outcome. Never throws — a failed email must not undo a saved change.
 */
export async function notify(
  event: NotificationEvent,
  to: string | null | undefined,
  vars: Record<string, string>,
  related?: { entity: string; id: string },
) {
  try {
    await connectDb();
    const settings = await loadSettings("notifications");
    const tpl = templateFor(settings, event);
    if (!tpl.enabled) return "disabled" as const;

    const subject = render(tpl.subject, vars);
    const body = render(tpl.body, vars);
    if (!to) {
      await Notification.create({ event, to: "(no email on record)", subject, body, status: "skipped", error: "No recipient email", related });
      return "skipped" as const;
    }
    const result = await sendEmail({ to, subject, text: body });
    await Notification.create({
      event,
      to,
      subject,
      body,
      status: result.status === "sent" ? "sent" : result.status === "failed" ? "failed" : "skipped",
      error: result.status === "failed" ? result.error : result.status === "not_configured" ? "Email delivery not configured" : null,
      related,
    });
    return result.status;
  } catch (error) {
    console.error("[notify]", event, error instanceof Error ? error.message : error);
    return "failed" as const;
  }
}
