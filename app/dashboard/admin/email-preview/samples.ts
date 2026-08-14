/**
 * Shared catalog of the transactional auth emails, used by both the preview
 * page and the /api/email-preview route so the two can't drift. Server-only:
 * no "use client" and no client imports, so the API route can pull it into
 * the Worker runtime without dragging in React.
 */
import {
  deleteAccountEmail,
  resetPasswordEmail,
  verifyEmail,
} from "@/lib/auth/email";
import { SITE_URL } from "@/lib/site";

/**
 * A representative signed-link URL, for DESIGN PREVIEW ONLY. The token is
 * obviously fake and verifies nothing; it exists so the previewed (and test-
 * sent) emails wrap a realistically long link exactly like production does.
 */
export const SAMPLE_URL = `${SITE_URL}/api/auth/verify-email?token=PREVIEW-ONLY.not-a-real-token.abc123&callbackURL=%2Fpricing`;

export type PreviewKey = "verify" | "reset" | "delete";

export interface PreviewTemplate {
  key: PreviewKey;
  /** Human label shown on the preview page and in the send-status message. */
  name: string;
  /** Builds the `{ subject, html, text }` payload from a link URL. */
  build: (url: string) => { subject: string; html: string; text: string };
}

export const EMAIL_TEMPLATES: PreviewTemplate[] = [
  { key: "verify", name: "Email verification", build: verifyEmail },
  { key: "reset", name: "Password reset", build: resetPasswordEmail },
  { key: "delete", name: "Account deletion", build: deleteAccountEmail },
];
