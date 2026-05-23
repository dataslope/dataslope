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

import MultipleChoiceQuestion, {
  type MultipleChoiceQuestionProps,
} from "./MultipleChoiceQuestion";

export default function MdxMultipleChoiceQuestion(
  props: MultipleChoiceQuestionProps,
) {
  return <MultipleChoiceQuestion {...props} />;
}
