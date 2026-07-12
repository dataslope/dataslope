"use client";

import { useRef, useState } from "react";
import type { PreviewKey } from "./samples";

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
      style={{ height }}
      className="w-full rounded-xl border border-[var(--ds-gray-200,#d0d7de)] bg-white"
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
    <div className="rounded-xl border border-[var(--ds-gray-200,#d0d7de)] bg-[var(--ds-gray-50,#f6f8fa)] p-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium text-[#121212] dark:text-white">
          Send a live test to your inbox:
        </label>
        <select
          value={key}
          onChange={(e) => setKey(e.target.value as PreviewKey)}
          disabled={sending}
          className="rounded-lg border border-[var(--ds-gray-200,#d0d7de)] bg-white px-3 py-1.5 text-sm text-[#121212] disabled:opacity-60 dark:bg-[#1a1a1a] dark:text-white"
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
          className="rounded-lg bg-[var(--ds-blue-700,#0064bd)] px-4 py-1.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {sending ? "Sending…" : "Send test email"}
        </button>
      </div>
      {status.type === "ok" && (
        <p className="mt-3 text-sm text-[var(--ds-green-700,#008b03)]">
          {status.msg}
        </p>
      )}
      {status.type === "error" && (
        <p className="mt-3 text-sm text-[var(--ds-red-700,#ba303a)]">
          {status.msg}
        </p>
      )}
      <p className="mt-3 text-xs text-[var(--ds-gray-500,#6b7280)]">
        Admin-only. The email is sent to your own account address using a sample
        (non-functional) link.
      </p>
    </div>
  );
}
