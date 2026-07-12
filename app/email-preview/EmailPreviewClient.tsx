"use client";

import { useRef, useState, type CSSProperties } from "react";
import type { PreviewKey } from "./samples";

/*
 * This dev page styles its chrome with inline styles rather than Tailwind
 * utility classes. The route is force-static and, under the project's CSS
 * chunking, the served stylesheet can omit common box-model utilities
 * (padding, radius, border-width) for this page — leaving the controls
 * unstyled. Inline styles don't depend on Tailwind generating or shipping a
 * class, so they render identically in dev, `next start`, and the deploy.
 * Colors reference the brand tokens from app/brand.css (loaded app-wide).
 */
const SUBTLE_BORDER = "1px solid var(--ds-gray-200)"; // #e5e7eb, very subtle
const CARD_BG = "var(--ds-gray-50)"; // #f9fafb
const BRAND_BLUE = "var(--ds-blue-700)"; // #0064bd
const MUTED = "var(--ds-gray-500)";

const cardStyle: CSSProperties = {
  border: SUBTLE_BORDER,
  background: CARD_BG,
  borderRadius: 12,
  padding: 16,
};
const rowStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 12,
};
const selectStyle: CSSProperties = {
  border: SUBTLE_BORDER,
  borderRadius: 8,
  background: "#fff",
  padding: "6px 10px",
  fontSize: 14,
  color: "#121212",
};
const buttonStyle: CSSProperties = {
  backgroundColor: BRAND_BLUE,
  color: "#ffffff",
  border: "none",
  borderRadius: 8,
  padding: "7px 16px",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
};

/**
 * Renders one email's HTML in an isolated <iframe srcDoc> and auto-sizes the
 * frame to the email's own content height on load, so each design shows in full
 * with no inner scrollbar (the emails differ in length). srcDoc is same-origin,
 * so reading the loaded document's scrollHeight is allowed.
 */
export function PreviewFrame({ title, html }: { title: string; html: string }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(560);

  function fit() {
    const doc = ref.current?.contentWindow?.document;
    if (doc) setHeight(doc.body.scrollHeight + 2);
  }

  return (
    <iframe
      ref={ref}
      title={title}
      srcDoc={html}
      onLoad={fit}
      style={{
        height,
        width: "100%",
        border: SUBTLE_BORDER,
        borderRadius: 12,
        background: "#fff",
      }}
    />
  );
}

interface TemplateChoice {
  key: PreviewKey;
  name: string;
}

type Status =
  | { type: "idle" }
  | { type: "sending" }
  | { type: "ok"; msg: string }
  | { type: "error"; msg: string };

/**
 * "Send test email" control for the preview page. POSTs the chosen template to
 * /api/email-preview, which sends a live copy to the signed-in admin's own
 * inbox (see the route for the guardrails). Non-admins get a 401/403 surfaced
 * here as an inline message rather than a silent no-op.
 */
export function SendTestEmail({ templates }: { templates: TemplateChoice[] }) {
  const [key, setKey] = useState<PreviewKey>(templates[0]?.key ?? "verify");
  const [status, setStatus] = useState<Status>({ type: "idle" });

  async function send() {
    setStatus({ type: "sending" });
    try {
      const res = await fetch("/api/email-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template: key }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        message?: string;
        error?: string;
      };
      if (!res.ok) {
        setStatus({
          type: "error",
          msg: data.error ?? `Request failed (${res.status}).`,
        });
        return;
      }
      setStatus({ type: "ok", msg: data.message ?? "Sent." });
    } catch {
      setStatus({ type: "error", msg: "Network error, please try again." });
    }
  }

  const sending = status.type === "sending";

  return (
    <div style={cardStyle}>
      <div style={rowStyle}>
        <label
          style={{ fontSize: 14, fontWeight: 500, color: "#121212" }}
          className="dark:text-white"
        >
          Send a live test to your inbox:
        </label>
        <select
          value={key}
          onChange={(e) => setKey(e.target.value as PreviewKey)}
          disabled={sending}
          style={{ ...selectStyle, opacity: sending ? 0.6 : 1 }}
        >
          {templates.map((t) => (
            <option key={t.key} value={t.key}>
              {t.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={send}
          disabled={sending}
          style={{ ...buttonStyle, opacity: sending ? 0.6 : 1 }}
        >
          {sending ? "Sending…" : "Send test email"}
        </button>
      </div>
      {status.type === "ok" && (
        <p style={{ marginTop: 12, fontSize: 14, color: "var(--ds-green-700)" }}>
          {status.msg}
        </p>
      )}
      {status.type === "error" && (
        <p style={{ marginTop: 12, fontSize: 14, color: "var(--ds-red-700)" }}>
          {status.msg}
        </p>
      )}
      <p style={{ marginTop: 12, fontSize: 12, color: MUTED }}>
        Admin-only. The email is sent to your own account address using a sample
        (non-functional) link.
      </p>
    </div>
  );
}
