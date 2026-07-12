/**
 * /email-preview, a dev-only page to review the transactional auth emails
 * (verification, password reset, account deletion) exactly as `lib/auth/email.ts`
 * renders them, plus an admin-only "send a live test to my inbox" control.
 *
 * Each design is rendered inside an isolated <iframe srcDoc>, so the email's own
 * <html>/<body> and inline styles render faithfully without the app's CSS
 * leaking in (or vice versa).
 *
 * The real emails reference the hosted production logo URL (Gmail blocks inline
 * data-URI images), but for on-page preview we inline the mark as a data URI so
 * it shows in every environment, local dev and preview deploys included, where
 * the production asset URL may not resolve yet. Read at build time; this route
 * is force-static, so `fs` only runs during prerender, never at the edge.
 */
import type { Metadata } from "next";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { SITE_URL } from "@/lib/site";
import { EMAIL_TEMPLATES, SAMPLE_URL } from "./samples";
import { PreviewFrame, SendTestEmail } from "./EmailPreviewClient";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Email preview",
  description:
    "Development preview of the transactional auth emails sent via Resend.",
  robots: { index: false, follow: false },
};

const LOGO_URL = `${SITE_URL}/email/dataslope-logo-blue.png`;

/** Inline the brand mark so the preview shows it regardless of environment. */
function logoDataUri(): string {
  const buf = readFileSync(
    join(process.cwd(), "public", "email", "dataslope-logo-blue.png"),
  );
  return `data:image/png;base64,${buf.toString("base64")}`;
}

export default function EmailPreviewPage() {
  const dataUri = logoDataUri();
  const previews = EMAIL_TEMPLATES.map((t) => {
    const { subject, html, text } = t.build(SAMPLE_URL);
    return {
      key: t.key,
      name: t.name,
      subject,
      text,
      html: html.split(LOGO_URL).join(dataUri),
    };
  });

  // Styled with inline styles (not Tailwind) for the same reason as
  // EmailPreviewClient: this force-static route can be served a CSS bundle that
  // omits common box-model utilities, so relying on classes leaves the page
  // unstyled. Inline styles always apply. Light-themed on purpose — the emails
  // it previews are light, so the surrounding chrome matches.
  const muted = "var(--ds-gray-500)";
  return (
    <main
      style={{
        maxWidth: 768,
        margin: "0 auto",
        padding: "48px 16px",
        color: "#121212",
      }}
    >
      <h1
        style={{
          fontSize: 28,
          fontWeight: 600,
          letterSpacing: "-0.02em",
          margin: 0,
        }}
      >
        Email preview
      </h1>
      <p style={{ marginTop: 8, fontSize: 14, lineHeight: 1.6, color: muted }}>
        The transactional auth emails from{" "}
        <code
          style={{
            background: "var(--ds-gray-100)",
            borderRadius: 4,
            padding: "2px 5px",
            fontSize: "0.85em",
          }}
        >
          lib/auth/email.ts
        </code>
        , rendered exactly as they’re sent via Resend. Links use a sample
        (non-functional) token.
      </p>

      <div style={{ marginTop: 24 }}>
        <SendTestEmail
          templates={EMAIL_TEMPLATES.map((t) => ({ key: t.key, name: t.name }))}
        />
      </div>

      <div
        style={{
          marginTop: 40,
          display: "flex",
          flexDirection: "column",
          gap: 40,
        }}
      >
        {previews.map((p) => (
          <section key={p.key}>
            <div style={{ marginBottom: 12 }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>
                {p.name}
              </h2>
              <p style={{ marginTop: 4, fontSize: 14, color: muted }}>
                <span style={{ fontWeight: 500 }}>Subject:</span> {p.subject}
              </p>
            </div>
            <PreviewFrame title={`${p.name} email preview`} html={p.html} />
            <details style={{ marginTop: 8 }}>
              <summary
                style={{ cursor: "pointer", fontSize: 14, color: muted }}
              >
                Plain-text version
              </summary>
              <pre
                style={{
                  marginTop: 8,
                  overflowX: "auto",
                  whiteSpace: "pre-wrap",
                  border: "1px solid var(--ds-gray-200)",
                  background: "var(--ds-gray-50)",
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 12,
                  color: "#121212",
                }}
              >
                {p.text}
              </pre>
            </details>
          </section>
        ))}
      </div>
    </main>
  );
}
