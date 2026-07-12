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
 *
 * Preview the rendered design at /email-preview (a dev-only page), which can
 * also send a live test copy to the signed-in admin's own inbox.
 */
import { SITE_URL } from "@/lib/site";

/** From address; overridable per-environment. Must be on a Resend-verified domain. */
const DEFAULT_FROM = "Dataslope <no-reply@dataslope.com>";

/**
 * Font stack for the email. `Inter` first as progressive enhancement, then the
 * system UI stack. Only clients that support web fonts (Apple Mail, iOS Mail)
 * actually load Inter — via the `@import` in `layout`'s <head> — or use it if
 * the recipient has it installed locally; Gmail and Outlook ignore web fonts
 * and fall back to the near-identical system faces below, so the layout never
 * shifts. Declared inline on every text element because email clients strip
 * <style> rules that aren't inlined.
 */
const FONT_STACK =
  "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

/**
 * Absolute URL of the raster brand mark shown in the header. Email clients
 * (Gmail, Outlook, Yahoo) don't render SVG, so the vector logo is rasterized to
 * a small PNG under public/email/ for mail. Absolute on purpose: an email has
 * no base URL, so a relative src wouldn't resolve. Served from the production
 * origin so the image is reachable from any recipient's client.
 */
const LOGO_URL = `${SITE_URL}/email/dataslope-logo-blue.png`;

/** Brand blue used for the CTA button and links. Blue 700 (`--ds-blue-700`),
 *  the palette's AA-on-white "ink" shade (see AGENTS.md), so white button text
 *  and the link color both clear WCAG AA contrast. */
const BRAND_BLUE = "#0064bd";

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
 *  non-inlined <style>/external CSS). A brand lockup (blue mark + wordmark), a
 *  single call-to-action button, and a copy-paste URL fallback for clients that
 *  strip links. The header pairs the raster mark with the "Dataslope" wordmark
 *  text: if a client blocks images (many do by default), the empty-alt mark
 *  simply disappears and the wordmark still carries the brand. */
function layout(opts: { heading: string; body: string; cta: string; url: string }): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="x-apple-disable-message-reformatting" />
    <meta name="color-scheme" content="light" />
    <meta name="supported-color-schemes" content="light" />
    <title>${opts.heading}</title>
    <style>
      /* Progressive enhancement only. Apple Mail / iOS Mail honour this import
         and render Inter; Gmail and Outlook ignore web fonts and fall back to
         the system stack declared inline on every element, so nothing reflows. */
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
      body { margin: 0; padding: 0; }
    </style>
  </head>
  <body style="margin:0;padding:0;background:#f6f8fa;font-family:${FONT_STACK};color:#1f2328;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="padding:32px 16px;background:#f6f8fa;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;background:#ffffff;border-radius:12px;box-shadow:0 1px 3px rgba(27,31,36,0.06);">
          <tr><td style="padding:32px;">
            <a href="${SITE_URL}" style="text-decoration:none;color:inherit;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td valign="middle" style="vertical-align:middle;padding-right:9px;">
                    <img src="${LOGO_URL}" width="35" height="22" alt="" style="display:block;width:35px;height:22px;border:0;outline:none;text-decoration:none;" />
                  </td>
                  <td valign="middle" style="vertical-align:middle;">
                    <span style="font-family:${FONT_STACK};font-size:20px;font-weight:600;letter-spacing:-0.02em;color:#1f2328;">Dataslope</span>
                  </td>
                </tr>
              </table>
            </a>
            <h1 style="font-family:${FONT_STACK};font-size:22px;font-weight:600;letter-spacing:-0.02em;margin:24px 0 8px;color:#1f2328;">${opts.heading}</h1>
            <p style="font-family:${FONT_STACK};font-size:15px;line-height:1.6;color:#57606a;margin:0 0 24px;">${opts.body}</p>
            <a href="${opts.url}" style="display:inline-block;background:${BRAND_BLUE};color:#ffffff;font-family:${FONT_STACK};font-size:15px;font-weight:600;letter-spacing:-0.01em;text-decoration:none;padding:11px 22px;border-radius:8px;">${opts.cta}</a>
            <p style="font-family:${FONT_STACK};font-size:13px;line-height:1.6;color:#8b949e;margin:24px 0 0;">Or paste this link into your browser:<br/><a href="${opts.url}" style="color:${BRAND_BLUE};text-decoration:underline;word-break:break-all;">${opts.url}</a></p>
          </td></tr>
        </table>
        <p style="font-family:${FONT_STACK};font-size:12px;color:#8b949e;margin:16px 0 0;">If you didn't request this, you can safely ignore this email.</p>
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
