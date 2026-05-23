/**
 * Parser for the Markdown-authored multiple-choice question syntax used
 * by `<MultipleChoiceQuestion>` on Learn pages.
 *
 * Syntax (one question per document):
 *
 *   Question body (free Markdown — paragraphs, lists, code, math).
 *   Everything up to the first choice line belongs here.
 *
 *   - Incorrect choice
 *     > Optional per-choice explanation (indented blockquote).
 *   - [o] Correct choice
 *     > Optional per-choice explanation.
 *     continuation lines indented by 2+ spaces extend the choice text
 *
 *   Overall explanation paragraph(s) appear after the final choice and
 *   are written without any special marker.
 *
 * Rules:
 *   - A choice line is `^- ` at column 0. `- [o] ...` marks the choice
 *     correct; otherwise it's incorrect.
 *   - `*` and `1.` may be used for lists in the question body — they're
 *     never interpreted as choices.
 *   - Lines starting with `>` (optionally indented) immediately under a
 *     choice attach to that choice as its explanation.
 *   - Lines indented by 2+ spaces that are not blockquotes are
 *     continuation text for the current choice.
 *   - The first unindented, non-blank, non-choice line after the choices
 *     block opens the overall explanation; everything after it is
 *     captured verbatim.
 *   - Multi-answer mode is auto-detected — when 2+ choices are flagged
 *     `[o]`, the renderer presents checkboxes; otherwise a radio group.
 */

export interface ParsedChoice {
  /** Stable string id (0-based index, "0".."n-1"). */
  id: string;
  /** Markdown source for the choice label. */
  text: string;
  /** True when the choice was authored with the `[o]` marker. */
  correct: boolean;
  /** Optional per-choice explanation (Markdown source); empty string
   *  when the author did not provide one. */
  explanation: string;
}

export interface ParsedQuestion {
  /** Markdown source of everything before the first choice line. */
  body: string;
  /** Ordered list of choices in the order authored. */
  choices: ParsedChoice[];
  /** Markdown source of everything after the choices block. */
  explanation: string;
  /** True when 2+ choices are flagged correct — checkbox preview. */
  multiAnswer: boolean;
  /** Set of choice ids that are correct (convenience). */
  correctIds: string[];
}

const CHOICE_RE = /^-\s+(?:\[(o|O| |x|X)\]\s+)?(.*)$/;

/** Parse a multiple-choice question authored in the syntax above.
 *  Returns a structured object; throws nothing — malformed input
 *  produces a best-effort result so authors get useful previews while
 *  iterating. */
export function parseQuestion(source: string): ParsedQuestion {
  // Normalise line endings so the line walker doesn't need to special-
  // case Windows files copy-pasted into MDX.
  const lines = source.replace(/\r\n?/g, "\n").split("\n");

  const bodyLines: string[] = [];
  const choices: ParsedChoice[] = [];
  const explanationLines: string[] = [];

  type Phase = "body" | "choices" | "explanation";
  let phase: Phase = "body";
  // Track blank-line runs so we can decide whether trailing indented
  // text belongs to the current choice (still inside the choices block)
  // or to the overall explanation (outside).
  let pendingBlanks = 0;

  const isChoiceLine = (line: string): RegExpMatchArray | null => {
    // Only unindented `- ` lines count as choices. Continuation text
    // for the question body's own `*` or `1.` lists is never confused
    // with choices because `-` at column 0 is reserved for the choices
    // block.
    if (!line.startsWith("- ")) return null;
    return line.match(CHOICE_RE);
  };

  const startChoice = (rawMarker: string | undefined, text: string) => {
    const marker = (rawMarker || "").toLowerCase();
    const correct = marker === "o" || marker === "x";
    choices.push({
      id: String(choices.length),
      text: text.trim(),
      correct,
      explanation: "",
    });
  };

  const appendToChoiceText = (text: string) => {
    const choice = choices[choices.length - 1];
    if (!choice) return;
    choice.text = (choice.text + "\n" + text).trim();
  };

  const appendToChoiceExplanation = (text: string) => {
    const choice = choices[choices.length - 1];
    if (!choice) return;
    const next = text.trim();
    choice.explanation = choice.explanation
      ? `${choice.explanation}\n${next}`
      : next;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed === "") {
      // Blank lines are buffered. They terminate a choice continuation
      // block but don't immediately change phases.
      if (phase === "body") bodyLines.push("");
      else if (phase === "explanation") explanationLines.push("");
      pendingBlanks++;
      continue;
    }

    if (phase === "body") {
      const match = isChoiceLine(line);
      if (match) {
        phase = "choices";
        pendingBlanks = 0;
        startChoice(match[1], match[2]);
        continue;
      }
      bodyLines.push(line);
      pendingBlanks = 0;
      continue;
    }

    if (phase === "choices") {
      const match = isChoiceLine(line);
      if (match) {
        pendingBlanks = 0;
        startChoice(match[1], match[2]);
        continue;
      }

      // Indented (2+ spaces) blockquote → per-choice explanation.
      // Tolerate an unindented `>` too — some authors omit the indent.
      const blockquoteMatch = line.match(/^\s*>\s?(.*)$/);
      if (blockquoteMatch && choices.length > 0) {
        pendingBlanks = 0;
        appendToChoiceExplanation(blockquoteMatch[1]);
        continue;
      }

      // Indented continuation line for the previous choice text.
      if (/^ {2,}\S/.test(line) && choices.length > 0 && pendingBlanks === 0) {
        appendToChoiceText(trimmed);
        continue;
      }

      // Unindented, non-`-`, non-blockquote text closes the choices
      // block and opens the overall explanation.
      phase = "explanation";
      pendingBlanks = 0;
      explanationLines.push(line);
      continue;
    }

    // phase === "explanation"
    explanationLines.push(line);
  }

  const correctIds = choices.filter((c) => c.correct).map((c) => c.id);
  const trimBlock = (text: string) =>
    text.replace(/^\n+/, "").replace(/\n+$/, "");

  return {
    body: trimBlock(bodyLines.join("\n")),
    choices,
    explanation: trimBlock(explanationLines.join("\n")),
    multiAnswer: correctIds.length > 1,
    correctIds,
  };
}
