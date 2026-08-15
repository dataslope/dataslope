/**
 * Admin → Email Preview: the transactional auth emails exactly as
 * lib/auth/email.ts renders them, each in an isolated <iframe srcDoc> so no
 * CSS leaks either way, plus a "send a live test" control. The preview inlines
 * the logo as a data URI (the real emails use the hosted URL, which may not
 * resolve in dev/preview); read at build time — this route is force-static,
 * so `fs` only runs during prerender.
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
