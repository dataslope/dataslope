/**
 * Transactional email for auth flows (password reset, email verification),
 * sent via Resend's HTTP API.
 *
 * Why Resend (and not SMTP): the Cloudflare Workers runtime can't open SMTP/TCP
 * sockets, only outbound `fetch`. Resend is a single authenticated POST, so it
 * works from the Worker with no SDK. Swapping to another provider (e.g. AWS SES
 * via `aws4fetch`) later means changing only `sendEmail` below; the Better Auth
 * wiring in server.ts calls these helpers and is provider-agnostic.
 *
 * Setup: verify your sending domain in Resend, set `RESEND_API_KEY` with
 * `wrangler secret put`, and (optionally) override the From address via the
 * `EMAIL_FROM` var. Until a domain is verified you can only send to your own
 * Resend account address using the `onboarding@resend.dev` sandbox From.
 */
import { SITE_URL } from "@/lib/site";

/** From address; overridable per-environment. Must be on a Resend-verified domain. */
const DEFAULT_FROM = "Dataslope <no-reply@dataslope.com>";

interface SendArgs {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/** Send one transactional email. Throws on a missing key or a non-2xx Resend
 *  response so the caller (Better Auth) surfaces a real error rather than
 *  silently dropping the message. */
export async function sendEmail(
  env: CloudflareEnv,
  { to, subject, html, text }: SendArgs,
): Promise<void> {
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not set, cannot send transactional email.");
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM ?? DEFAULT_FROM,
      to,
      subject,
      html,
      text,
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Resend send failed (${res.status}): ${detail}`);
  }
}

/** Minimal, client-agnostic HTML wrapper (inline styles, email clients ignore
 *  <style>/external CSS). A single call-to-action button plus a copy-paste URL
 *  fallback for clients that strip links. */
function layout(opts: { heading: string; body: string; cta: string; url: string }): string {
  return `<!doctype html>
<html>
  <body style="margin:0;background:#f6f8fa;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#24292f;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border:1px solid #d0d7de;border-radius:12px;padding:32px;">
          <tr><td>
            <a href="${SITE_URL}" style="font-size:18px;font-weight:600;color:#0550ae;text-decoration:none;">Dataslope</a>
            <h1 style="font-size:20px;margin:24px 0 8px;">${opts.heading}</h1>
            <p style="font-size:15px;line-height:1.6;color:#57606a;margin:0 0 24px;">${opts.body}</p>
            <a href="${opts.url}" style="display:inline-block;background:#0969da;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:10px 20px;border-radius:8px;">${opts.cta}</a>
            <p style="font-size:13px;line-height:1.6;color:#8b949e;margin:24px 0 0;word-break:break-all;">Or paste this link into your browser:<br/>${opts.url}</p>
          </td></tr>
        </table>
        <p style="font-size:12px;color:#8b949e;margin:16px 0 0;">If you didn't request this, you can safely ignore this email.</p>
      </td></tr>
    </table>
  </body>
</html>`;
}

/** Password-reset email content. */
export function resetPasswordEmail(url: string): Omit<SendArgs, "to"> {
  return {
    subject: "Reset your Dataslope password",
    text: `Reset your Dataslope password by opening this link:\n\n${url}\n\nIf you didn't request this, you can ignore this email.`,
    html: layout({
      heading: "Reset your password",
      body: "We received a request to reset the password for your Dataslope account. This link expires in 1 hour.",
      cta: "Reset password",
      url,
    }),
  };
}

/** Email-verification email content. */
export function verifyEmail(url: string): Omit<SendArgs, "to"> {
  return {
    subject: "Verify your Dataslope email",
    text: `Confirm your email for Dataslope by opening this link:\n\n${url}`,
    html: layout({
      heading: "Verify your email",
      body: "Confirm this address to finish setting up your Dataslope account.",
      cta: "Verify email",
      url,
    }),
  };
}

/** Account-deletion confirmation email content. The link completes an
 *  irreversible deletion, so the copy is unambiguous and the "ignore if you
 *  didn't request this" footer (added by `layout`) matters more than usual. */
export function deleteAccountEmail(url: string): Omit<SendArgs, "to"> {
  return {
    subject: "Confirm your Dataslope account deletion",
    text: `Confirm that you want to permanently delete your Dataslope account, including your cloud saves, share links, and custom content, by opening this link:\n\n${url}\n\nThis cannot be undone. If you didn't request this, ignore this email and your account stays exactly as it is.`,
    html: layout({
      heading: "Confirm account deletion",
      body: "Click below to permanently delete your Dataslope account, including your cloud saves, share links, and custom content. This can&rsquo;t be undone.",
      cta: "Delete my account",
      url,
    }),
  };
}
