import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

/**
 * Email transport.
 * - SMTP (preferred): EMAIL_USER + EMAIL_PASS. Defaults to Gmail (smtp.gmail.com:465); use a Google
 *   "App password", not the account password. SMTP_HOST / SMTP_PORT override the server.
 * - Resend HTTP API (fallback): RESEND_API_KEY + FORM_FROM_EMAIL.
 * Returns "not_configured" when neither is set.
 */
export function isEmailConfigured() {
  return smtpConfigured() || Boolean(process.env.RESEND_API_KEY && process.env.FORM_FROM_EMAIL);
}

function smtpConfigured() {
  return Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS);
}

/** The foundation's own mailbox, used as the default admin inbox when none is set in Website Settings. */
export function senderAddress() {
  return process.env.EMAIL_USER || null;
}

let transporter: Transporter | null = null;
function smtp() {
  const port = Number(process.env.SMTP_PORT || 465);
  transporter ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port,
    secure: port === 465,
    pool: true, // reuse one connection for the several emails a single action can send
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
  return transporter;
}

export type EmailAttachment = { filename: string; content: Uint8Array; contentType: string };

export async function sendEmail(message: {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
  attachments?: EmailAttachment[];
}): Promise<{ status: "sent" } | { status: "not_configured" } | { status: "failed"; error: string }> {
  try {
    if (smtpConfigured()) {
      await smtp().sendMail({
        from: process.env.EMAIL_FROM || `"H R Foundation" <${process.env.EMAIL_USER}>`,
        to: message.to,
        replyTo: message.replyTo || undefined,
        subject: message.subject,
        text: message.text,
        html: message.html,
        attachments: message.attachments?.map((a) => ({ filename: a.filename, content: Buffer.from(a.content), contentType: a.contentType })),
      });
      return { status: "sent" };
    }

    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.FORM_FROM_EMAIL;
    if (!apiKey || !from) return { status: "not_configured" };
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [message.to],
        reply_to: message.replyTo || undefined,
        subject: message.subject,
        text: message.text,
        html: message.html,
        attachments: message.attachments?.map((a) => ({ filename: a.filename, content: Buffer.from(a.content).toString("base64") })),
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return { status: "failed", error: `Email provider responded ${res.status}` };
    return { status: "sent" };
  } catch (error) {
    // Never include credentials in the stored error.
    const msg = error instanceof Error ? error.message : "Unknown error";
    return { status: "failed", error: msg.replace(process.env.EMAIL_PASS || "\u0000", "[redacted]").slice(0, 300) };
  }
}

export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
