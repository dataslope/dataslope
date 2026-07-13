"use client";

/**
 * The Studio AI assist panel: a full-height column beside the builder content.
 * Shows the drafting conversation, per-builder quick actions, and a prompt box.
 * Everything routes through useStudioAi().draft, which fills the active
 * builder's form. Rendered by the shell as a flex sibling of the main column so
 * it sits to the right, matching the design.
 */

import { useState } from "react";
import { Sparkles, X, ArrowUp } from "lucide-react";
import { useStudioAi } from "./StudioAiContext";
import type { DraftKind } from "@/lib/ai/draft";

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

  if (!open || !activeKind) return null;

  const send = () => {
    if (busy) return;
    const p = prompt.trim();
    if (!p) return;
    setPrompt("");
    void draft(p);
  };

  return (
    <aside
      aria-label="AI assist"
      className="flex w-[340px] flex-shrink-0 flex-col overflow-hidden"
      style={{ background: "var(--side-bg2)", borderRadius: "var(--main-radius, 0px)" }}
    >
      <div className="flex items-center gap-2 px-4 pb-3 pt-4">
        <Sparkles size={16} style={{ color: "var(--ai)" }} />
        <span className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
          AI assist
        </span>
        <button
          type="button"
          onClick={closePanel}
          aria-label="Close AI assist"
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
            <Sparkles size={13} className="ds-pulse" style={{ color: "var(--ai)" }} />
            Drafting…
          </div>
        ) : null}
      </div>

      {!busy && messages.length === 0 ? (
        <div className="flex flex-wrap gap-1.5 px-4 pb-2">
          {QUICK_ACTIONS[activeKind].map((label) => (
            <button
              key={label}
              type="button"
              onClick={() => void draft(label)}
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
            placeholder={PLACEHOLDER[activeKind]}
            className="w-full resize-none bg-transparent text-[13px] leading-normal outline-none"
            style={{ color: "var(--ink)" }}
          />
          <div className="flex items-center gap-2 pt-1">
            <span className="text-[11px]" style={{ color: "var(--faint)" }}>
              ⏎ to send
            </span>
            <button
              type="button"
              onClick={send}
              disabled={busy || !prompt.trim()}
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
