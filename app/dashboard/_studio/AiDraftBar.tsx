"use client";

/**
 * "Fill with AI" bar at the top of each builder form. Clicking opens the AI
 * Assist panel WITHOUT drafting anything — opening never spends a provider
 * request; generation starts only when the user sends a description.
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
