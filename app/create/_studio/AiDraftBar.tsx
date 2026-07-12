"use client";

/**
 * The "Fill with AI" bar shown at the top of each builder form. Typing a
 * description and pressing Enter (or clicking the button) drafts the whole item
 * via useStudioAi().draft, which fills the form below and opens the assist
 * panel. A thin wrapper over the shared AI state so every builder gets the same
 * affordance with one line.
 */

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { useStudioAi } from "./StudioAiContext";

export function AiDraftBar({ placeholder }: { placeholder: string }) {
  const { draft, busy } = useStudioAi();
  const [value, setValue] = useState("");

  const go = () => {
    if (busy) return;
    const p = value.trim();
    setValue("");
    void draft(p);
  };

  return (
    <div
      className="mt-5 flex items-center gap-2 rounded-2xl py-2 pl-3.5 pr-2"
      style={{ background: "var(--ai-soft)" }}
    >
      <Sparkles size={15} className="flex-shrink-0" style={{ color: "var(--ai-text)" }} />
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            go();
          }
        }}
        placeholder={placeholder}
        className="ds-ai-input h-9 min-w-0 flex-1 bg-transparent text-[13px] outline-none"
        style={{ color: "var(--ai-text)" }}
      />
      <button
        type="button"
        onClick={go}
        disabled={busy}
        className="inline-flex h-[34px] flex-shrink-0 items-center gap-1.5 rounded-lg px-3.5 text-[13px] font-semibold transition-opacity disabled:opacity-60"
        style={{ background: "var(--ai)", color: "var(--ai-btn-fg)" }}
      >
        <Sparkles size={13} />
        {busy ? "Drafting…" : "Fill with AI"}
      </button>
    </div>
  );
}
