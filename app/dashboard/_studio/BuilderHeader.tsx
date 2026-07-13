"use client";

// Heading + lede + "Fill with AI" bar shown above each builder form. Replaces
// the title/lede the old CreatePageShell rendered, and adds the AI draft entry
// point. The builder component itself registers the handler that applies a
// draft to its fields (useRegisterBuilderDraft).
import { AiDraftBar } from "./AiDraftBar";

export function BuilderHeader({
  title,
  lede,
  aiPlaceholder,
}: {
  title: string;
  lede: string;
  aiPlaceholder: string;
}) {
  return (
    <div className="mb-6">
      <h1
        className="text-2xl font-semibold tracking-tight"
        style={{ color: "var(--ink)" }}
      >
        {title}
      </h1>
      <p className="mt-2.5 text-[15px] leading-relaxed" style={{ color: "var(--muted)" }}>
        {lede}
      </p>
      <AiDraftBar placeholder={aiPlaceholder} />
    </div>
  );
}
