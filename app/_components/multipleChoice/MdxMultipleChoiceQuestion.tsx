"use client";

/**
 * MDX wrapper around `<MultipleChoiceQuestion>` (registered as
 * `<MultipleChoice>` in mdx-components.tsx). The quiz source is a `markdown`
 * string prop rather than MDX children so MDX never interprets the `-`
 * choice lines as its own list and the parser sees the exact authored text.
 */

import MultipleChoiceQuestion, {
  type MultipleChoiceQuestionProps,
} from "./MultipleChoiceQuestion";

export default function MdxMultipleChoiceQuestion(
  props: MultipleChoiceQuestionProps,
) {
  return <MultipleChoiceQuestion {...props} />;
}
