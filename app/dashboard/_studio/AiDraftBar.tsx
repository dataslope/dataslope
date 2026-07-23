"use client";

/**
 * The "Fill with AI" bar shown at the top of each builder form. It is a
 * non-input affordance: clicking "Fill with AI" opens the AI Assist panel
 * WITHOUT drafting anything. Generation only starts once the user actually
 * types a description in that panel and sends it, so opening the panel never
 * spends a provider request (and can't surface a "the assistant is unavailable"
 * error before the user has asked for anything). A thin wrapper over the shared
 * AI state so every builder gets the same affordance with one line.
 */

import { Sparkle } from "lucide-react";
import { useStudioAi } from "./StudioAiContext";

export function AiDraftBar() {
  const { openPanel } = useStudioAi();

  return (
    <div
      className="mt-5 flex items-center gap-2 rounded-2xl py-2 pl-3.5 pr-2"
      style={{ background: "var(--ai-soft)" }}
    >
      <Sparkle size={15} className="flex-shrink-0" style={{ color: "var(--ai-text)" }} />
      <span
        className="flex h-9 min-w-0 flex-1 items-center text-[13px]"
        style={{ color: "var(--ai-text)", opacity: 0.6 }}
      >
        Let AI fill every field
      </span>
      <button
        type="button"
        onClick={openPanel}
        className="inline-flex h-[34px] flex-shrink-0 items-center gap-1.5 rounded-lg px-3.5 text-[13px] font-semibold transition-opacity"
        style={{ background: "var(--ai)", color: "var(--ai-btn-fg)" }}
      >
        <Sparkle size={13} />
        Fill with AI
      </button>
    </div>
  );
}
