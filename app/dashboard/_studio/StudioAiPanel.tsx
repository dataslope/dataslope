"use client";

/**
 * The Studio AI Assist panel: a full-height column beside the builder content.
 * Shows the drafting conversation, per-builder quick actions, and a prompt box.
 * Everything routes through useStudioAi().draft, which fills the active
 * builder's form. Rendered by the shell as a flex sibling of the main column so
 * it sits to the right, matching the design.
 *
 * Drafting spends the member's shared daily Ask AI budget (same counter as the
 * "Ask AI" chat), so the composer shows a "N left today" quota ring for free
 * members: fetched from /api/ai/usage on open and decremented optimistically as
 * drafts are billed.
 */

import { useEffect, useState } from "react";
import { Sparkle, X, ArrowUp } from "lucide-react";
import { useStudioAi } from "./StudioAiContext";
import type { DraftKind } from "@/lib/ai/draft";
import type { AskAiUsageResponse } from "@/lib/ai/types";

const QUICK_ACTIONS: Record<DraftKind, string[]> = {
  code: [
    "A Python challenge: group a list of (category, amount) sales by category",
    "Reverse a linked list in place",
    "Flatten a nested dictionary",
  ],
  sql: [
    "Top customers by total revenue, highest first",
    "Monthly active users from an events table",
    "Orders that have no matching shipment",
  ],
  mcq: [
    "A question about the pandas groupby method",
    "How JavaScript closures capture variables",
    "Big-O of common sorting algorithms",
  ],
  quiz: [
    "A pandas fundamentals practice quiz",
    "A SQL joins practice set",
  ],
};

const PLACEHOLDER: Record<DraftKind, string> = {
  code: "Describe the coding challenge to draft…",
  sql: "Describe the SQL exercise to draft…",
  mcq: "Describe the question to draft…",
  quiz: "Describe the quiz to assemble…",
};

const INTRO: Record<DraftKind, string> = {
  code: "Describe a coding challenge and I'll draft the instructions, starter code, solution, and tests. Review everything before publishing.",
  sql: "Describe a SQL exercise and I'll write the schema, seed data, solution query, and checks.",
  mcq: "Describe the concept to test and I'll draft the question, choices, and per-choice explanations.",
  quiz: "Give me a topic and I'll draft a title and description for the quiz set.",
};

export function StudioAiPanel() {
  const { open, activeKind, messages, busy, draft, closePanel } = useStudioAi();
  const [prompt, setPrompt] = useState("");

  // ── Daily prompt quota (shared with Ask AI chat) ───────────────────────
  const [usage, setUsage] = useState<AskAiUsageResponse | null>(null);
  // Optimistic decrement: bumped once per billed draft so the ring updates
  // immediately, without waiting for the server's usage write to land.
  const [sentSinceFetch, setSentSinceFetch] = useState(0);
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/ai/usage");
        if (!res.ok) return;
        const body = (await res.json()) as AskAiUsageResponse;
        if (!cancelled) {
          setUsage(body);
          // Reset the optimistic counter exactly when the fresh count lands.
          setSentSinceFetch(0);
        }
      } catch {
        // display-only; the counter just doesn't render
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const isFreeTier = usage ? usage.tier !== "pro" : false;
  const promptsLeft = usage
    ? Math.max(0, usage.requestsRemaining - sentSinceFetch)
    : null;
  const outOfPrompts = usage !== null && isFreeTier && promptsLeft === 0;

  if (!open || !activeKind) return null;

  // Run a draft and, when the server billed it, decrement the local quota.
  const runDraft = (text: string) => {
    void draft(text).then((counted) => {
      if (counted) setSentSinceFetch((n) => n + 1);
    });
  };

  const send = () => {
    if (busy || outOfPrompts) return;
    const p = prompt.trim();
    if (!p) return;
    setPrompt("");
    runDraft(p);
  };

  return (
    <aside
      aria-label="AI Assist"
      className="flex w-[340px] flex-shrink-0 flex-col overflow-hidden"
      style={{ background: "var(--side-bg2)", borderRadius: "var(--main-radius, 0px)" }}
    >
      <div className="flex items-center gap-2 px-4 pb-3 pt-4">
        <Sparkle size={16} style={{ color: "var(--ai)" }} />
        <span className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
          AI Assist
        </span>
        <button
          type="button"
          onClick={closePanel}
          aria-label="Close AI Assist"
          className="ml-auto inline-flex h-7 w-7 items-center justify-center rounded-md"
          style={{ color: "var(--muted)" }}
        >
          <X size={15} />
        </button>
      </div>
      <p className="px-4 text-xs leading-relaxed" style={{ color: "var(--faint)" }}>
        Drafts fill the form on the left — you review and edit everything before
        publishing.
      </p>

      <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto p-4">
        <Bubble who="ai" text={INTRO[activeKind]} />
        {messages.map((m, i) => (
          <Bubble key={i} who={m.who} text={m.text} />
        ))}
        {busy ? (
          <div
            className="inline-flex items-center gap-2 self-start rounded-xl px-3 py-2 text-[13px]"
            style={{ background: "var(--input)", color: "var(--muted)" }}
          >
            <Sparkle size={13} className="ds-pulse" style={{ color: "var(--ai)" }} />
            Drafting…
          </div>
        ) : null}
      </div>

      {!busy && !outOfPrompts && messages.length === 0 ? (
        <div className="flex flex-wrap gap-1.5 px-4 pb-2">
          {QUICK_ACTIONS[activeKind].map((label) => (
            <button
              key={label}
              type="button"
              onClick={() => runDraft(label)}
              className="h-7 rounded-full px-2.5 text-left text-xs font-medium"
              style={{ background: "var(--input)", color: "var(--text)" }}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}

      <div className="px-4 pb-4">
        <div className="rounded-lg p-2.5" style={{ background: "var(--input)" }}>
          <textarea
            rows={2}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={
              outOfPrompts
                ? "You're out of prompts for today."
                : PLACEHOLDER[activeKind]
            }
            disabled={outOfPrompts}
            className="w-full resize-none bg-transparent text-[13px] leading-normal outline-none disabled:opacity-60"
            style={{ color: "var(--ink)" }}
          />
          <div className="flex items-center gap-2 pt-1">
            <span className="text-[11px]" style={{ color: "var(--faint)" }}>
              ⏎ to send
            </span>
            {usage && isFreeTier && promptsLeft !== null ? (
              <span
                className="inline-flex items-center gap-1 text-[11px] font-medium"
                style={{ color: outOfPrompts ? "var(--danger)" : "var(--muted)" }}
                title={`${promptsLeft} of ${usage.requestsLimit} free Ask AI prompts left today. Resets at midnight UTC.`}
              >
                <QuotaRing
                  remaining={promptsLeft}
                  total={usage.requestsLimit}
                  out={outOfPrompts}
                />
                {promptsLeft} left today
              </span>
            ) : null}
            <button
              type="button"
              onClick={send}
              disabled={busy || !prompt.trim() || outOfPrompts}
              className="ml-auto inline-flex h-7 items-center gap-1.5 rounded-md px-3 text-xs font-semibold disabled:opacity-50"
              style={{ background: "var(--ai)", color: "var(--ai-btn-fg)" }}
            >
              Generate
              <ArrowUp size={12} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

/** Circular quota ring (r=6, circumference ≈ 37.7), mirroring the Ask AI
 *  widget's ring. `remaining/total` drives the dash offset; `out` swaps the
 *  progress stroke to the danger color. */
function QuotaRing({
  remaining,
  total,
  out,
}: {
  remaining: number;
  total: number;
  out: boolean;
}) {
  const frac = total > 0 ? Math.min(1, Math.max(0, remaining / total)) : 0;
  const offset = 37.7 * (1 - frac);
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden>
      <circle
        cx="8"
        cy="8"
        r="6"
        fill="none"
        strokeWidth="2.5"
        stroke="var(--divider)"
      />
      <circle
        cx="8"
        cy="8"
        r="6"
        fill="none"
        strokeWidth="2.5"
        stroke={out ? "var(--danger)" : "var(--ai)"}
        strokeDasharray="37.7"
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 8 8)"
      />
    </svg>
  );
}

function Bubble({ who, text }: { who: "user" | "ai"; text: string }) {
  const isUser = who === "user";
  return (
    <div
      className="max-w-[92%] whitespace-pre-wrap rounded-xl px-3 py-2 text-[13px] leading-relaxed"
      style={{
        alignSelf: isUser ? "flex-end" : "flex-start",
        background: isUser ? "var(--ai-soft)" : "var(--input)",
        color: isUser ? "var(--ai-text)" : "var(--text)",
      }}
    >
      {text}
    </div>
  );
}
