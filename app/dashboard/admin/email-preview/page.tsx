/**
 * Admin → Email Preview: review the transactional auth emails (verification,
 * password reset, account deletion) exactly as `lib/auth/email.ts` renders
 * them, plus a "send a live test to my inbox" control.
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
 *
 * Moved here from a standalone `/email-preview` route that was only reachable
 * from a `next dev`-only footer link. Chrome (sidebar, top bar, theme toggle)
 * now comes from the dashboard shell, so this file renders content only.
 */
import type { Metadata } from "next";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { SITE_URL } from "@/lib/site";
import {
  AdminNarrow,
  AdminPageHeader,
  Panel,
  PanelBody,
  PanelHeader,
} from "../_components/shared";
import { EMAIL_TEMPLATES, SAMPLE_URL } from "./samples";
import { PreviewFrame, SendTestEmail } from "./EmailPreviewClient";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Email Preview",
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
    <AdminNarrow>
      <AdminPageHeader
        title="Email Preview"
        description="The transactional auth emails from lib/auth/email.ts, rendered exactly as they're sent via Resend. Links use a sample, non-functional token."
      />

      <Panel>
        <PanelHeader
          title="Send a live test"
          description="Delivers the real email to your own inbox, so you can check how a client renders it."
        />
        <PanelBody>
          <SendTestEmail
            templates={EMAIL_TEMPLATES.map((t) => ({ key: t.key, name: t.name }))}
          />
        </PanelBody>
      </Panel>

      <div className="mt-6 flex flex-col gap-6">
        {previews.map((p) => (
          <Panel key={p.key}>
            <PanelHeader
              title={p.name}
              description={
                <>
                  <span className="font-medium">Subject:</span> {p.subject}
                </>
              }
            />
            <PanelBody>
              <PreviewFrame title={`${p.name} email preview`} html={p.html} />
              <details className="mt-3">
                <summary className="cursor-pointer text-sm text-muted-foreground">
                  Plain-text version
                </summary>
                <pre className="mt-2 overflow-x-auto rounded-lg bg-zinc-500/[0.07] p-3 text-xs whitespace-pre-wrap dark:bg-white/[0.07]">
                  {p.text}
                </pre>
              </details>
            </PanelBody>
          </Panel>
        ))}
      </div>
    </AdminNarrow>
  );
}
