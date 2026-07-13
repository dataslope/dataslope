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
import "@/app/tailwind.css";
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

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight text-[#121212] dark:text-white">
        Email preview
      </h1>
      <p className="mt-2 text-sm text-[var(--ds-gray-500)]">
        The transactional auth emails from{" "}
        <code className="rounded bg-[var(--ds-gray-100)] px-1 py-0.5 text-[0.8em]">
          lib/auth/email.ts
        </code>
        , rendered exactly as they’re sent via Resend. Links use a sample
        (non-functional) token.
      </p>

      <div className="mt-6">
        <SendTestEmail
          templates={EMAIL_TEMPLATES.map((t) => ({ key: t.key, name: t.name }))}
        />
      </div>

      <div className="mt-10 flex flex-col gap-10">
        {previews.map((p) => (
          <section key={p.key}>
            <div className="mb-3">
              <h2 className="text-lg font-semibold text-[#121212] dark:text-white">
                {p.name}
              </h2>
              <p className="mt-1 text-sm text-[var(--ds-gray-500)]">
                <span className="font-medium">Subject:</span> {p.subject}
              </p>
            </div>
            <PreviewFrame title={`${p.name} email preview`} html={p.html} />
            <details className="mt-2">
              <summary className="cursor-pointer text-sm text-[var(--ds-gray-500)]">
                Plain-text version
              </summary>
              <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-lg border border-[var(--ds-gray-200)] bg-[var(--ds-gray-50)] p-3 text-xs text-[#121212] dark:text-white">
                {p.text}
              </pre>
            </details>
          </section>
        ))}
      </div>
    </main>
  );
}
