"use client";

/**
 * Self-contained quiz card authored in Markdown (parsed via
 * `parseQuestion()`), with the same paper/badge chrome as `<ChallengeCard>`.
 * Selecting a choice immediately reveals verdicts and the explanation;
 * "Try Again" allows unlimited attempts. All learner-visible Markdown goes
 * through react-markdown with GFM + KaTeX + rehype-highlight.
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
 *  per-choice color ring + glyph and is read off `data-verdict` in the
 *  stylesheet. */
type Verdict =
  | "correct-selected"
  | "correct-missed"
  | "wrong-selected"
  | "neutral";

export interface MultipleChoiceQuestionProps {
  /** Raw Markdown source (syntax: `parseQuestion.ts`). */
  markdown: string;
  /** Label shown in the top-left badge. Defaults to "Question". */
  badge?: string;
}

function MarkdownInline({ source }: { source: string }) {
  // Shared markdown pipeline for every text surface in the card, so math,
  // GFM, and highlighting stay consistent.
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
  const parsed = useMemo(() => parseQuestion(markdown), [markdown]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const select = (id: string) => {
    // Picking a choice locks the card and reveals feedback; no Submit step.
    if (submitted) return;
    setSelectedId(id);
    setSubmitted(true);
  };

  const onRetry = () => {
    // Reset; the explanation hides again so the next attempt isn't cued.
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
          <ScrollText size={13} aria-hidden />
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

      {/* <div>s rather than <li>s so block-level content (fenced code) in a
          choice label is valid HTML. */}
      <div
        className={styles.choiceList}
        role="radiogroup"
        aria-label="Answer choices"
      >
        {parsed.choices.map((choice) => {
          const isSelected = selectedId === choice.id;
          const verdict = computeVerdict(choice, isSelected, submitted);
          const showExplanation = submitted && choice.explanation;
          return (
            <div key={choice.id} className={styles.choiceItem}>
              {/* <div> rather than <label> for valid block-level HTML; the
                  outer div handles clicks and stopPropagation on the input
                  prevents a double-toggle. */}
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
                  aria-labelledby={`${groupName}-${choice.id}`}
                  onChange={() => select(choice.id)}
                  onClick={(e) => e.stopPropagation()}
                />
                <div className={styles.choiceContent}>
                  <div
                    id={`${groupName}-${choice.id}`}
                    className={styles.choiceLabel}
                  >
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

      {/* Feedback before the "Try again" affordance. `role="status"`
          announces the verdict to screen readers. */}
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
            {result === "pass" ? "Correct!" : "Not quite, try again"}
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
