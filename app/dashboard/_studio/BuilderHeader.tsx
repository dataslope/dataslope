"use client";

// Heading + lede + "Fill with AI" bar shown at the top of each builder's form
// column. The builder component itself registers the handler that applies a
// draft to its fields (useRegisterBuilderDraft).
import { AiDraftBar } from "./AiDraftBar";

export function BuilderHeader({
  title,
  lede,
}: {
  title: string;
  lede: string;
}) {
  return (
    <div className="mb-6">
      <h1 className="ds-h1">{title}</h1>
      <p className="mt-2.5 text-[15px] leading-relaxed" style={{ color: "var(--muted)" }}>
        {lede}
      </p>
      <AiDraftBar />
    </div>
  );
}
