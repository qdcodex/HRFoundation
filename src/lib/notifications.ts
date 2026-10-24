import "server-only";
import { site, siteUrl } from "@/content/site";
import { connectDb } from "@/lib/db/connect";
import { Notification } from "@/lib/db/models/system";
import { senderAddress, sendEmail, type EmailAttachment } from "@/lib/server/email";
import { loadSettings, NOTIFICATION_EVENTS, templateFor, type NotificationEvent } from "@/lib/settings";

function render(template: string, vars: Record<string, string>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, k: string) => vars[k] ?? "");
}

/**
 * Where foundation alerts and copies go: Website Settings → enquiry inbox, then FORM_TO_EMAIL,
 * then the foundation's official email (src/content/site.ts), then the sending mailbox.
 */
export async function adminInbox() {
  const website = await loadSettings("website").catch(() => null);
  return website?.enquiryInbox || process.env.FORM_TO_EMAIL || site.contact.email || senderAddress();
}

const HIDDEN = "(sent to the recipient only)";

async function deliver(
  event: NotificationEvent,
  to: string | null | undefined,
  subject: string,
  body: string,
  storedBody: string,
  related?: { entity: string; id: string },
  attachments?: EmailAttachment[],
) {
  if (!to) {
    await Notification.create({ event, to: "(no email on record)", subject, body: storedBody, status: "skipped", error: "No recipient email", related });
    return "skipped" as const;
  }
  const result = await sendEmail({ to, subject, text: body, attachments });
  await Notification.create({
    event,
    to,
    subject,
    body: storedBody,
    status: result.status === "sent" ? "sent" : result.status === "failed" ? "failed" : "skipped",
    error: result.status === "failed" ? result.error : result.status === "not_configured" ? "Email delivery not configured" : null,
    related,
  });
  return result.status;
}

/**
 * Sends a notification for an event that has ALREADY been committed to the database,
 * and records the delivery outcome. Never throws — a failed email must not undo a saved change.
 *
 * - Emails to members, donors and claimants are also copied to the foundation's admin inbox
 *   (Notification settings → "Copy to admin"), so staff see everything that was sent — including
 *   when the person has no email address on record.
 * - `privateVars` (e.g. a temporary password) go only to the recipient: they are replaced in the
 *   admin copy and in the stored notification log.
 */
export async function notify(
  event: NotificationEvent,
  to: string | null | undefined,
  vars: Record<string, string>,
  related?: { entity: string; id: string },
  opts: { privateVars?: string[]; attachments?: EmailAttachment[] } = {},
) {
  try {
    await connectDb();
    const settings = await loadSettings("notifications");
    const tpl = templateFor(settings, event);
    if (!tpl.enabled) return "disabled" as const;

    const masked = { ...vars };
    for (const k of opts.privateVars ?? []) if (k in masked) masked[k] = HIDDEN;
    const subject = render(tpl.subject, vars);
    const status = await deliver(event, to, subject, render(tpl.body, vars), render(tpl.body, masked), related, opts.attachments);

    const toFoundation = NOTIFICATION_EVENTS[event].to === "foundation";
    if (!toFoundation && settings.adminCopy) {
      const inbox = await adminInbox();
      if (inbox && inbox.toLowerCase() !== to?.toLowerCase()) {
        const copyBody = [
          `Copy of an email ${to ? `sent to ${to}` : "that could not be sent (no email address on record)"} — ${NOTIFICATION_EVENTS[event].label}.`,
          "",
          "----------",
          render(tpl.body, masked),
          "----------",
          "",
          `Admin dashboard: ${siteUrl}/admin`,
        ].join("\n");
        await deliver(event, inbox, `[Copy] ${subject}`, copyBody, copyBody, related, opts.attachments);
      }
    }
    return status;
  } catch (error) {
    console.error("[notify]", event, error instanceof Error ? error.message : error);
    return "failed" as const;
  }
}
