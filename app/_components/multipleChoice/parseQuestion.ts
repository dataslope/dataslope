/**
 * Parser for the Markdown-authored multiple-choice question syntax used by
 * `<MultipleChoiceQuestion>`. One question per document:
 *
 *   Question body (free Markdown) up to the first choice line.
 *
 *   - Incorrect choice
 *     > Optional per-choice explanation (blockquote).
 *   - [o] Correct choice (exactly one)
 *     continuation lines indented by 2+ spaces extend the choice text
 *
 *   Overall explanation: unmarked paragraph(s) after the final choice.
 *
 * Choice lines are `- ` at column 0 only; `*`/`1.` lists in the body are
 * never choices. Fenced code blocks inside a choice are captured verbatim.
 */

export interface ParsedChoice {
  /** Stable string id (0-based index, "0".."n-1"). */
  id: string;
  /** Markdown source for the choice label. */
  text: string;
  /** True when the choice was authored with the `[o]` marker. */
  correct: boolean;
  /** Per-choice explanation (Markdown source); empty when absent. */
  explanation: string;
}

export interface ParsedQuestion {
  /** Markdown source of everything before the first choice line. */
  body: string;
  /** Ordered list of choices in the order authored. */
  choices: ParsedChoice[];
  /** Markdown source of everything after the choices block. */
  explanation: string;
  /** Id of the correct choice (`[o]`), or null when none is marked. */
  correctId: string | null;
}

const CHOICE_RE = /^-\s+(?:\[(o|O| |x|X)\]\s+)?(.*)$/;
/** Matches the opening of a fenced code block (``` or ~~~, 3+ chars). */
const FENCE_OPEN_RE = /^(`{3,}|~{3,})/;
/** Matches a closing fence line, only the fence chars, nothing else. */
const FENCE_CLOSE_RE = /^(`{3,}|~{3,})\s*$/;

/** Parses a question in the syntax above. Never throws; malformed input
 *  produces a best-effort result. */
export function parseQuestion(source: string): ParsedQuestion {
  // Normalize CRLF line endings.
  const lines = source.replace(/\r\n?/g, "\n").split("\n");

  const bodyLines: string[] = [];
  const choices: ParsedChoice[] = [];
  const explanationLines: string[] = [];

  type Phase = "body" | "choices" | "explanation";
  let phase: Phase = "body";
  // Blank-line runs decide whether trailing indented text belongs to the
  // current choice or the overall explanation.
  let pendingBlanks = 0;

  // While true, all lines (blanks included) are captured verbatim into the
  // current choice until the closing fence.
  let inChoiceFence = false;
  // Blanks buffered inside a choice fence, flushed before the next content line.
  let pendingFenceBlanks = 0;

  const isChoiceLine = (line: string): RegExpMatchArray | null => {
    // Only unindented `- ` counts; `-` at column 0 is reserved for choices.
    if (!line.startsWith("- ")) return null;
    return line.match(CHOICE_RE);
  };

  const startChoice = (rawMarker: string | undefined, text: string) => {
    // Reset any unclosed fence from the previous choice (malformed input).
    inChoiceFence = false;
    pendingFenceBlanks = 0;
    const marker = (rawMarker || "").toLowerCase();
    const correct = marker === "o" || marker === "x";
    const trimmedText = text.trim();
    choices.push({
      id: String(choices.length),
      text: trimmedText,
      correct,
      explanation: "",
    });
    // A fence may open right on the choice line (`- ```python`).
    if (FENCE_OPEN_RE.test(trimmedText)) {
      inChoiceFence = true;
    }
  };

  // No trimming here: blank lines inside fences must survive. trimBlock()
  // runs on each choice in the final return.
  const appendToChoiceText = (text: string) => {
    const choice = choices[choices.length - 1];
    if (!choice) return;
    choice.text = choice.text + "\n" + text;
  };

  // Flush buffered fence blanks before the next content line.
  const flushFenceBlanks = () => {
    if (pendingFenceBlanks > 0 && choices.length > 0) {
      choices[choices.length - 1].text += "\n".repeat(pendingFenceBlanks);
      pendingFenceBlanks = 0;
    }
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
      if (phase === "choices" && inChoiceFence) {
        pendingFenceBlanks++;
        continue;
      }
      // Blanks terminate a choice continuation block but don't change phases.
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
      // A choice at column 0 starts fresh even inside an unclosed fence.
      const match = isChoiceLine(line);
      if (match) {
        pendingBlanks = 0;
        startChoice(match[1], match[2]);
        continue;
      }

      // Inside a fence every non-blank line belongs verbatim. Indentation is
      // not required: MDX strips the choice-level indent before the parser
      // ever runs, so fence content arrives with no leading whitespace.
      if (inChoiceFence) {
        flushFenceBlanks();
        appendToChoiceText(trimmed);
        if (FENCE_CLOSE_RE.test(trimmed)) {
          inChoiceFence = false;
        }
        pendingBlanks = 0;
        continue;
      }

      // A fence opening on the line after the choice marker arrives at column
      // 0 (MDX strips the authored indent), so the indented-continuation rule
      // below can't catch it; without this branch it would end the choices
      // block and swallow the remaining choices into the explanation.
      // `pendingBlanks === 0` keeps a genuine explanation-opening code block
      // (always blank-line separated) from being captured here.
      if (
        choices.length > 0 &&
        pendingBlanks === 0 &&
        FENCE_OPEN_RE.test(trimmed)
      ) {
        appendToChoiceText(trimmed);
        inChoiceFence = true;
        pendingFenceBlanks = 0;
        continue;
      }

      // Blockquote → per-choice explanation (unindented `>` tolerated).
      const blockquoteMatch = line.match(/^\s*>\s?(.*)$/);
      if (blockquoteMatch && choices.length > 0) {
        pendingBlanks = 0;
        appendToChoiceExplanation(blockquoteMatch[1]);
        continue;
      }

      // Indented continuation line for the previous choice text.
      if (/^ {2,}/.test(line) && choices.length > 0 && pendingBlanks === 0) {
        appendToChoiceText(trimmed);
        if (!inChoiceFence && FENCE_OPEN_RE.test(trimmed)) {
          inChoiceFence = true;
          pendingFenceBlanks = 0;
        }
        continue;
      }

      // Unindented non-choice text closes the choices block.
      phase = "explanation";
      pendingBlanks = 0;
      explanationLines.push(line);
      continue;
    }

    // phase === "explanation"
    explanationLines.push(line);
  }

  const correctChoice = choices.find((c) => c.correct);
  const trimBlock = (text: string) =>
    text.replace(/^\n+/, "").replace(/\n+$/, "");

  return {
    body: trimBlock(bodyLines.join("\n")),
    choices: choices.map((c) => ({ ...c, text: trimBlock(c.text) })),
    explanation: trimBlock(explanationLines.join("\n")),
    correctId: correctChoice ? correctChoice.id : null,
  };
}
