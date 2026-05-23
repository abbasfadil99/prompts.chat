/**
 * Email service using Resend API (https://resend.com).
 * Falls back silently when RESEND_API_KEY is not set (dev / self-hosted).
 *
 * Required env vars:
 *   RESEND_API_KEY   – API key from resend.com
 *   EMAIL_FROM       – Sender address, e.g. "prompts.chat <no-reply@prompts.chat>"
 *   NEXTAUTH_URL     – Base URL used in email links
 */

const RESEND_API = "https://api.resend.com/emails";

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(opts: SendEmailOptions): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    // Email not configured — log in dev, fail silently in prod
    if (process.env.NODE_ENV !== "production") {
      console.log("[email] RESEND_API_KEY not set. Would have sent:", opts.subject, "to", opts.to);
    }
    return { ok: true };
  }

  const from = process.env.EMAIL_FROM ?? "prompts.chat <no-reply@prompts.chat>";

  try {
    const res = await fetch(RESEND_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [opts.to],
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("[email] Resend error:", res.status, body);
      return { ok: false, error: `Resend error ${res.status}` };
    }

    return { ok: true };
  } catch (err) {
    console.error("[email] Failed to send email:", err);
    return { ok: false, error: String(err) };
  }
}

// ---------------------------------------------------------------------------
// Email templates
// ---------------------------------------------------------------------------

function baseLayout(content: string, appName = "prompts.chat"): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${appName}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">
        <!-- Header -->
        <tr><td style="background:#6366f1;padding:24px 32px;">
          <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700;">${appName}</h1>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:32px;">
          ${content}
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#f4f4f5;padding:16px 32px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#6b7280;">
            You received this email because you have an account on ${appName}.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function welcomeEmail(opts: { name: string; username: string; appName?: string; baseUrl?: string }): { subject: string; html: string; text: string } {
  const appName = opts.appName ?? "prompts.chat";
  const baseUrl = opts.baseUrl ?? process.env.NEXTAUTH_URL ?? "https://prompts.chat";
  const subject = `Welcome to ${appName}!`;

  const html = baseLayout(`
    <h2 style="margin:0 0 8px;font-size:22px;color:#111827;">Welcome, ${opts.name || opts.username}!</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
      Your account has been created. Start discovering, sharing, and collecting AI prompts.
    </p>
    <a href="${baseUrl}/discover" style="display:inline-block;background:#6366f1;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:600;font-size:14px;">
      Explore prompts →
    </a>
    <p style="margin:24px 0 0;font-size:13px;color:#6b7280;">
      Your username: <strong>@${opts.username}</strong>
    </p>
  `, appName);

  const text = `Welcome to ${appName}!\n\nYour account is ready. Visit ${baseUrl}/discover to start exploring.\n\nYour username: @${opts.username}`;
  return { subject, html, text };
}

export function passwordResetEmail(opts: { name: string; resetUrl: string; appName?: string }): { subject: string; html: string; text: string } {
  const appName = opts.appName ?? "prompts.chat";
  const subject = `Reset your ${appName} password`;

  const html = baseLayout(`
    <h2 style="margin:0 0 8px;font-size:22px;color:#111827;">Reset your password</h2>
    <p style="margin:0 0 8px;font-size:15px;color:#374151;line-height:1.6;">
      Hi ${opts.name || "there"},
    </p>
    <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
      We received a request to reset the password for your account. Click the button below to choose a new password.
      This link expires in <strong>1 hour</strong>.
    </p>
    <a href="${opts.resetUrl}" style="display:inline-block;background:#6366f1;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:600;font-size:14px;">
      Reset password →
    </a>
    <p style="margin:24px 0 0;font-size:13px;color:#6b7280;">
      If you didn't request a password reset, you can safely ignore this email.
      Your password won't change.
    </p>
    <p style="margin:8px 0 0;font-size:12px;color:#9ca3af;word-break:break-all;">
      ${opts.resetUrl}
    </p>
  `, appName);

  const text = `Reset your ${appName} password\n\nClick the link below to reset your password (expires in 1 hour):\n${opts.resetUrl}\n\nIf you didn't request this, ignore this email.`;
  return { subject, html, text };
}

export function commentNotificationEmail(opts: {
  recipientName: string;
  actorUsername: string;
  promptTitle: string;
  promptUrl: string;
  commentContent: string;
  type: "COMMENT" | "REPLY";
  appName?: string;
}): { subject: string; html: string; text: string } {
  const appName = opts.appName ?? "prompts.chat";
  const action = opts.type === "REPLY" ? "replied to your comment on" : "commented on your prompt";
  const subject = `@${opts.actorUsername} ${action} "${opts.promptTitle}"`;
  const preview = opts.commentContent.slice(0, 200) + (opts.commentContent.length > 200 ? "…" : "");

  const html = baseLayout(`
    <h2 style="margin:0 0 8px;font-size:20px;color:#111827;">New ${opts.type === "REPLY" ? "reply" : "comment"}</h2>
    <p style="margin:0 0 16px;font-size:15px;color:#374151;">
      <strong>@${opts.actorUsername}</strong> ${action} <em>"${opts.promptTitle}"</em>
    </p>
    <blockquote style="margin:0 0 24px;padding:12px 16px;background:#f9fafb;border-left:3px solid #6366f1;border-radius:0 4px 4px 0;font-size:14px;color:#374151;line-height:1.6;">
      ${preview}
    </blockquote>
    <a href="${opts.promptUrl}" style="display:inline-block;background:#6366f1;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:600;font-size:14px;">
      View comment →
    </a>
  `, appName);

  const text = `@${opts.actorUsername} ${action} "${opts.promptTitle}"\n\n${preview}\n\n${opts.promptUrl}`;
  return { subject, html, text };
}
