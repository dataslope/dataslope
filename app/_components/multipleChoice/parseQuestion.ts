/**
 * Parser for the Markdown-authored multiple-choice question syntax used
 * by `<MultipleChoiceQuestion>` on Learn pages.
 *
 * Syntax (one question per document):
 *
 *   Question body (free Markdown, paragraphs, lists, code, math).
 *   Everything up to the first choice line belongs here.
 *
 *   - Incorrect choice
 *     > Optional per-choice explanation (indented blockquote).
 *   - [o] Correct choice
 *     > Optional per-choice explanation.
 *     continuation lines indented by 2+ spaces extend the choice text
 *
 *   Fenced code blocks inside a choice are fully supported. The opening
 *   fence (e.g. ```python) may appear right after `- ` or as an indented
 *   continuation line. All lines, including blank lines, inside the
 *   fence are captured verbatim as part of the choice text; the fence is
 *   closed when an indented ``` or ~~~ line (matching 3+ chars) appears.
 *
 *   Overall explanation paragraph(s) appear after the final choice and
 *   are written without any special marker.
 *
 * Rules:
 *   - A choice line is `^- ` at column 0. `- [o] ...` marks the choice
 *     correct; otherwise it's incorrect.
 *   - `*` and `1.` may be used for lists in the question body, they're
 *     never interpreted as choices.
 *   - Lines starting with `>` (optionally indented) immediately under a
 *     choice attach to that choice as its explanation, unless the choice
 *     is inside a fenced code block.
 *   - Lines indented by 2+ spaces that are not blockquotes are
 *     continuation text for the current choice.
 *   - The first unindented, non-blank, non-choice line after the choices
 *     block opens the overall explanation; everything after it is
 *     captured verbatim.
 *   - Exactly one choice should be flagged `[o]`; the renderer presents
 *     the choices as a single-answer radio group.
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
  /** Id of the correct choice (`[o]`), or null when none is marked. */
  correctId: string | null;
}

const CHOICE_RE = /^-\s+(?:\[(o|O| |x|X)\]\s+)?(.*)$/;
/** Matches the opening of a fenced code block (``` or ~~~, 3+ chars). */
const FENCE_OPEN_RE = /^(`{3,}|~{3,})/;
/** Matches a closing fence line, only the fence chars, nothing else. */
const FENCE_CLOSE_RE = /^(`{3,}|~{3,})\s*$/;

/** Parse a multiple-choice question authored in the syntax above.
 *  Returns a structured object; throws nothing, malformed input
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

  // Fence tracking for code blocks inside choices.
  // When true, blank lines and all indented lines are captured verbatim
  // as part of the current choice until the closing fence is found.
  let inChoiceFence = false;
  // Blank lines buffered while inside a choice fence, flushed into the
  // choice text before the next non-blank continuation line.
  let pendingFenceBlanks = 0;

  const isChoiceLine = (line: string): RegExpMatchArray | null => {
    // Only unindented `- ` lines count as choices. Continuation text
    // for the question body's own `*` or `1.` lists is never confused
    // with choices because `-` at column 0 is reserved for the choices
    // block.
    if (!line.startsWith("- ")) return null;
    return line.match(CHOICE_RE);
  };

  const startChoice = (rawMarker: string | undefined, text: string) => {
    // Reset any open fence from the previous choice (best-effort
    // recovery for malformed input that never closed its fence).
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
    // Detect a code fence that begins right on the choice line
    // (e.g. `- ```python`).
    if (FENCE_OPEN_RE.test(trimmedText)) {
      inChoiceFence = true;
    }
  };

  // Append text to the current choice WITHOUT trimming so that blank
  // lines inside fences are preserved. trimBlock() is applied to every
  // choice's text in the final return.
  const appendToChoiceText = (text: string) => {
    const choice = choices[choices.length - 1];
    if (!choice) return;
    choice.text = choice.text + "\n" + text;
  };

  // Flush accumulated blank lines inside a code fence into the choice
  // text before appending the next content line.
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
      // Blank lines inside a choice fence are buffered and flushed into
      // the choice text when the next non-blank line arrives.
      if (phase === "choices" && inChoiceFence) {
        pendingFenceBlanks++;
        continue;
      }
      // Outside a fence, blank lines are buffered. They terminate a
      // choice continuation block but don't immediately change phases.
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
      // A new choice at column 0 always starts a fresh choice, even
      // if we're nominally inside a fence (fence was left unclosed).
      const match = isChoiceLine(line);
      if (match) {
        pendingBlanks = 0;
        startChoice(match[1], match[2]);
        continue;
      }

      // Inside a code fence every non-blank line belongs to the current
      // choice verbatim.  Indentation is NOT required, the MDX/Turbopack
      // compiler strips the 2-space choice-level indent from template
      // literals before the runtime string is evaluated, so fence content
      // arrives at the parser with no leading whitespace.
      if (inChoiceFence) {
        flushFenceBlanks();
        appendToChoiceText(trimmed);
        // Detect the closing fence marker.
        if (FENCE_CLOSE_RE.test(trimmed)) {
          inChoiceFence = false;
        }
        pendingBlanks = 0;
        continue;
      }

      // Indented (2+ spaces) blockquote → per-choice explanation.
      // Tolerate an unindented `>` too, some authors omit the indent.
      const blockquoteMatch = line.match(/^\s*>\s?(.*)$/);
      if (blockquoteMatch && choices.length > 0) {
        pendingBlanks = 0;
        appendToChoiceExplanation(blockquoteMatch[1]);
        continue;
      }

      // Indented continuation line for the previous choice text.
      if (/^ {2,}/.test(line) && choices.length > 0 && pendingBlanks === 0) {
        appendToChoiceText(trimmed);
        // Detect if this continuation line opens a code fence.
        if (!inChoiceFence && FENCE_OPEN_RE.test(trimmed)) {
          inChoiceFence = true;
          pendingFenceBlanks = 0;
        }
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

  const correctChoice = choices.find((c) => c.correct);
  const trimBlock = (text: string) =>
    text.replace(/^\n+/, "").replace(/\n+$/, "");

  return {
    body: trimBlock(bodyLines.join("\n")),
    // Apply trimBlock to each choice text so leading/trailing newlines
    // added during continuation-appending are stripped cleanly.
    choices: choices.map((c) => ({ ...c, text: trimBlock(c.text) })),
    explanation: trimBlock(explanationLines.join("\n")),
    correctId: correctChoice ? correctChoice.id : null,
  };
}
