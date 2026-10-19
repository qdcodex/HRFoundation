import "server-only";

/**
 * Email transport via the Resend HTTP API (no SDK needed).
 * Configure RESEND_API_KEY and FORM_FROM_EMAIL (a verified sender). Returns "not_configured" when unset.
 */
export function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.FORM_FROM_EMAIL);
}

export async function sendEmail(message: {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
}): Promise<{ status: "sent" } | { status: "not_configured" } | { status: "failed"; error: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.FORM_FROM_EMAIL;
  if (!apiKey || !from) return { status: "not_configured" };
  try {
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
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return { status: "failed", error: `Email provider responded ${res.status}` };
    return { status: "sent" };
  } catch (error) {
    return { status: "failed", error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
