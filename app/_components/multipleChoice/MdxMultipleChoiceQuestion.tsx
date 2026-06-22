"use client";

/**
 * MDX-friendly wrapper around `<MultipleChoiceQuestion>`.
 *
 * Authors register this component as `<MultipleChoice>` in
 * `mdx-components.tsx` and pass the raw quiz markdown as a `markdown`
 * prop (template literal). Keeping the source in a string prop —
 * rather than MDX children — means MDX never tries to interpret the
 * `-` choice lines as a Markdown list of its own, so the parser sees
 * the exact text the author typed.
 *
 * Usage in MDX:
 *
 * ```mdx
 * <MultipleChoice
 *   markdown={`Which tool is commonly used for dashboards?
 *
 * - Microsoft Word
 * - [o] Tableau
 *   > Correct! Tableau is the canonical answer.
 * - Notepad
 *
 * Tableau is widely used for interactive visual analytics.`}
 * />
 * ```
 */

import dynamic from "next/dynamic";
import type { MultipleChoiceQuestionProps } from "./MultipleChoiceQuestion";

// Load the quiz card client-side only. It renders entirely in the browser —
// react-markdown + remark/rehype (KaTeX) plus the jsDelivr-loaded highlight.js
// — and none of that needs to run during SSR, so `ssr: false` keeps the whole
// markdown stack out of the OpenNext Worker bundle's render path. (The home
// page hero loads the same component the same way; see HeroInteractive.) The
// placeholder reserves vertical space to limit layout shift while the chunk and
// its CDN dependencies load.
const MultipleChoiceQuestion = dynamic(
  () => import("./MultipleChoiceQuestion"),
  {
    ssr: false,
    loading: () => <div aria-hidden style={{ minHeight: 180 }} />,
  },
);

export default function MdxMultipleChoiceQuestion(
  props: MultipleChoiceQuestionProps,
) {
  return <MultipleChoiceQuestion {...props} />;
}
