"use client";

/**
 * `<MultipleChoiceQuestion>` — a self-contained quiz card authored in
 * Markdown. Parses the raw question source on mount via
 * `parseQuestion()` and renders the result with the same paper/badge
 * chrome as `<ChallengeCard>`.
 *
 * Behaviour:
 *   - Choices render as a radio group: the learner picks exactly one
 *     option. Selecting a choice immediately reveals per-choice verdicts
 *     and the overall explanation.
 *   - A "Try Again" button then resets the selection so learners can
 *     iterate as many times as they like (mirrors the "unlimited
 *     attempts" UX of the existing `<ChallengeCard>` Check-Answer flow).
 *   - All learner-visible Markdown — body, choice labels, per-choice
 *     explanations, overall explanation — is rendered through
 *     react-markdown with GFM + KaTeX + rehype-highlight so authors
 *     can mix prose, lists, code (with syntax colouring), tables, and
 *     math equations.
 */

import { useId, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import { Check, X, RotateCcw, MousePointerClick, ScrollText } from "lucide-react";
import { parseQuestion, type ParsedChoice } from "./parseQuestion";
import { useAskAiSource } from "../ai/contextRegistry";
import { describeMcq } from "../ai/widgetSnapshots";
import styles from "./MultipleChoiceQuestion.module.css";

/** First line of the question body, de-markdowned just enough to read as a
 *  chip label in the Ask AI panel. */
function questionChipLabel(body: string, badge: string): string {
  const firstLine =
    body
      .split("\n")
      .map((l) => l.trim())
      .find((l) => l && !l.startsWith("```")) ?? "";
  const plain = firstLine.replace(/[`*_#>]/g, "").trim();
  return `${badge}: ${plain.slice(0, 80) || "multiple choice"}`;
}

/** Choice verdict assigned after the learner picks an answer. Drives the
 *  per-choice colour ring + glyph and is read off `data-verdict` in the
 *  stylesheet. */
type Verdict =
  | "correct-selected"
  | "correct-missed"
  | "wrong-selected"
  | "neutral";

export interface MultipleChoiceQuestionProps {
  /** Raw Markdown source for the question. See `parseQuestion.ts` for
   *  the syntax. The component is intentionally markdown-in,
   *  React-out — authors should never need to construct the parsed
   *  shape by hand. */
  markdown: string;
  /** Optional label shown in the top-left badge. Defaults to
   *  "Question" so the card reads cleanly even when no badge is
   *  authored. */
  badge?: string;
}

function MarkdownInline({ source }: { source: string }) {
  // The shared markdown pipeline used by every text surface inside the
  // card: question body, choice labels, per-choice explanations, and
  // the overall explanation. Centralising the plugin list here keeps
  // math, GFM, and syntax highlighting consistent across all call sites.
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeKatex, rehypeHighlight]}
    >
      {source}
    </ReactMarkdown>
  );
}

function computeVerdict(
  choice: ParsedChoice,
  selected: boolean,
  submitted: boolean,
): Verdict {
  if (!submitted) return "neutral";
  if (choice.correct && selected) return "correct-selected";
  if (choice.correct && !selected) return "correct-missed";
  if (!choice.correct && selected) return "wrong-selected";
  return "neutral";
}

export default function MultipleChoiceQuestion({
  markdown,
  badge = "Question",
}: MultipleChoiceQuestionProps) {
  // Parse once per `markdown` prop. Authors editing MDX get instant
  // feedback because fumadocs hot-reloads the page, which re-mounts
  // this component with the new source.
  const parsed = useMemo(() => parseQuestion(markdown), [markdown]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const select = (id: string) => {
    // Picking a choice locks the card and reveals feedback immediately —
    // a single-answer question has no separate Submit step.
    if (submitted) return;
    setSelectedId(id);
    setSubmitted(true);
  };

  const onRetry = () => {
    // Reset the selection so the learner can try again. The overall
    // explanation hides again so the next attempt isn't trivially cued
    // by the previous reveal.
    setSelectedId(null);
    setSubmitted(false);
  };

  const result: "pass" | "fail" | null = submitted
    ? selectedId !== null && selectedId === parsed.correctId
      ? "pass"
      : "fail"
    : null;
  const groupName = useId();

  // Ask AI context: the question registers itself so the assistant can see
  // the question, its choices, and what the learner picked.
  const cardRef = useRef<HTMLElement | null>(null);
  useAskAiSource({
    kind: "mcq",
    label: questionChipLabel(parsed.body, badge),
    elementRef: cardRef,
    getSnapshot: () => ({
      content: describeMcq({
        body: parsed.body,
        choices: parsed.choices.map((c) => ({
          text: c.text,
          correct: c.correct,
          selected: selectedId === c.id,
        })),
        submitted,
        explanation: parsed.explanation,
      }),
    }),
  });

  return (
    <div className={styles.cardShell}>
    <section
      ref={cardRef}
      className={styles.card}
      aria-label="Multiple choice question"
    >
      <header className={styles.header}>
        <span className={styles.badge}>
          <ScrollText size={10} aria-hidden />
          {badge}
        </span>
        <span className={styles.modeLabel}>
          <MousePointerClick aria-hidden />
          Select one
        </span>
      </header>

      {parsed.body ? (
        <div className={styles.body}>
          <div className={styles.bodyMd}>
            <MarkdownInline source={parsed.body} />
          </div>
        </div>
      ) : null}

      {/* Choices are rendered as <div> block elements instead of <li>
          items so that block-level content (e.g. fenced code blocks)
          inside a choice label is valid HTML. */}
      <div
        className={styles.choiceList}
        role="radiogroup"
        aria-label="Answer choices"
      >
        {parsed.choices.map((choice) => {
          const isSelected = selectedId === choice.id;
          const verdict = computeVerdict(choice, isSelected, submitted);
          // Show explanations for all choices after submit so learners
          // can understand why each option is right or wrong.
          const showExplanation = submitted && choice.explanation;
          return (
            <div key={choice.id} className={styles.choiceItem}>
              {/* Use <div> rather than <label> so that block-level
                  content such as fenced code blocks is valid HTML.
                  Click handling is wired up manually: the outer div
                  handles mouse clicks on the non-input area, and
                  stopPropagation on the input prevents a double-toggle
                  when the input itself is clicked. */}
              <div
                className={styles.choice}
                data-locked={submitted ? "true" : "false"}
                data-verdict={verdict}
                onClick={() => !submitted && select(choice.id)}
              >
                <input
                  className={styles.choiceInput}
                  type="radio"
                  name={groupName}
                  value={choice.id}
                  checked={isSelected}
                  disabled={submitted}
                  onChange={() => select(choice.id)}
                  onClick={(e) => e.stopPropagation()}
                />
                <div className={styles.choiceContent}>
                  <div className={styles.choiceLabel}>
                    <MarkdownInline source={choice.text} />
                  </div>
                  {showExplanation ? (
                    <div className={styles.choiceExplanation}>
                      <MarkdownInline source={choice.explanation} />
                    </div>
                  ) : null}
                </div>
                {submitted && verdict !== "neutral" ? (
                  <span
                    className={styles.choiceMark}
                    aria-label={
                      verdict === "wrong-selected"
                        ? "Incorrect choice"
                        : "Correct choice"
                    }
                  >
                    {verdict === "wrong-selected" ? (
                      <X size={13} strokeWidth={3} aria-hidden />
                    ) : (
                      <Check size={13} strokeWidth={3} aria-hidden />
                    )}
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {/* Feedback first, action last: the verdict banner and explanation
          read before the "Try again" affordance, mirroring the usual
          quiz flow (see what happened → understand why → act).
          `role="status"` announces the verdict to screen readers when
          it appears. */}
      {result ? (
        <div className={styles.banner} data-state={result} role="status">
          <span className={styles.bannerIcon}>
            {result === "pass" ? (
              <Check size={14} strokeWidth={3} aria-hidden />
            ) : (
              <X size={14} strokeWidth={3} aria-hidden />
            )}
          </span>
          <span>
            {result === "pass" ? "Correct!" : "Not quite — try again"}
          </span>
        </div>
      ) : null}

      {submitted && parsed.explanation ? (
        <div className={styles.overall}>
          <div className={styles.overallLabel}>Explanation</div>
          <div className={styles.overallBody}>
            <MarkdownInline source={parsed.explanation} />
          </div>
        </div>
      ) : null}

      {submitted ? (
        <div className={styles.actionBar}>
          <button type="button" className={styles.retryBtn} onClick={onRetry}>
            <RotateCcw size={13} aria-hidden />
            Try again
          </button>
        </div>
      ) : null}
    </section>
    </div>
  );
}
