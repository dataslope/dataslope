/**
 * Serializer between the MCQ builder's structured draft and the Markdown
 * syntax parsed by app/_components/multipleChoice/parseQuestion.ts (the
 * storage + rendering format for `<MultipleChoiceQuestion>`).
 *
 * The builder edits structured fields (question, choices, explanations);
 * this module turns them into the `- [o]` markdown for storage and back
 * again for editing. Round-tripping is covered by
 * __tests__/customContent.test.ts (serialize → parseQuestion must
 * reproduce the draft).
 *
 * Pure module: safe on client, server, and in tests.
 */

import { parseQuestion } from "@/app/_components/multipleChoice/parseQuestion";

export interface McqDraftChoice {
  text: string;
  correct: boolean;
  /** Optional per-choice explanation shown after submitting. */
  explanation: string;
}

export interface McqDraft {
  /** Markdown question body. */
  question: string;
  choices: McqDraftChoice[];
  /** Optional overall explanation shown after submitting. */
  explanation: string;
}

/** Indent every line of a multi-line block by two spaces so the parser
 *  treats it as continuation text of the current choice. The first line
 *  is returned unindented (it follows the `- ` marker directly). */
function choiceLines(text: string): string[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  return lines.map((line, i) => (i === 0 ? line : line ? `  ${line}` : ""));
}

/** Render a per-choice explanation as indented blockquote lines. */
function explanationLines(text: string): string[] {
  return text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => (line ? `  > ${line}` : "  >"));
}

export function serializeMcqMarkdown(draft: McqDraft): string {
  const out: string[] = [];
  const question = draft.question.replace(/\r\n/g, "\n").trimEnd();
  if (question) {
    out.push(question);
    out.push("");
  }
  for (const choice of draft.choices) {
    const text = choice.text.replace(/\r\n/g, "\n").trimEnd();
    const [first = "", ...rest] = choiceLines(text);
    out.push(`- ${choice.correct ? "[o] " : ""}${first}`);
    out.push(...rest);
    const explanation = choice.explanation.trim();
    if (explanation) out.push(...explanationLines(explanation));
  }
  const overall = draft.explanation.replace(/\r\n/g, "\n").trim();
  if (overall) {
    out.push("");
    out.push(overall);
  }
  return out.join("\n");
}

/** Rebuild a structured draft from stored markdown (edit mode). Works for
 *  any markdown `parseQuestion` accepts, not just serializer output. */
export function mcqDraftFromMarkdown(markdown: string): McqDraft {
  const parsed = parseQuestion(markdown);
  return {
    question: parsed.body.trim(),
    choices: parsed.choices.map((c) => ({
      text: c.text,
      correct: c.correct,
      explanation: c.explanation,
    })),
    explanation: parsed.explanation.trim(),
  };
}
