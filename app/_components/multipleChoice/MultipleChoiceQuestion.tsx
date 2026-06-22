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
 *     react-markdown with GFM + KaTeX so authors can mix prose, lists,
 *     code, tables, and math equations. Code blocks are syntax-highlighted
 *     after render with highlight.js, which is loaded from jsDelivr on
 *     demand (see HLJS_CDN) rather than bundled — keeping it out of the
 *     client chunks and the OpenNext Worker bundle, like Plotly/Mermaid.
 */

import { useEffect, useId, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { Check, X, RotateCcw, MousePointerClick, ScrollText } from "lucide-react";
import { parseQuestion, type ParsedChoice } from "./parseQuestion";
import { HLJS_CDN } from "../runtime/cdn";
import styles from "./MultipleChoiceQuestion.module.css";

// highlight.js is fetched from jsDelivr on demand (see HLJS_CDN in runtime/cdn)
// and applied to the card's rendered code blocks, keeping it out of both the
// client bundle and the OpenNext Worker bundle — the same offload used for
// Plotly and Mermaid. The import is cached at module scope so every quiz card
// on a page shares a single fetch. `webpackIgnore`/`turbopackIgnore` stop the
// bundlers from trying to resolve the CDN URL at build time.
interface Hljs {
  highlightElement: (el: HTMLElement) => void;
}
let hljsPromise: Promise<Hljs> | null = null;
function loadHljs(): Promise<Hljs> {
  if (!hljsPromise) {
    hljsPromise = import(
      /* webpackIgnore: true */ /* turbopackIgnore: true */ HLJS_CDN
    ).then((m) => (m.default ?? m) as Hljs);
  }
  return hljsPromise;
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
      rehypePlugins={[rehypeKatex]}
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

  // Syntax-highlight the card's code blocks with highlight.js pulled from
  // jsDelivr. Runs after mount and after any state change that can reveal new
  // code (submitting an answer surfaces the per-choice and overall
  // explanations). highlight.js stamps each block it processes with
  // `data-highlighted`, so re-runs only touch the newly revealed blocks — the
  // `:not([data-highlighted])` filter also sidesteps its "already highlighted"
  // console warning.
  const cardRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = cardRef.current;
    if (!root) return;
    const blocks = root.querySelectorAll<HTMLElement>(
      "pre code:not([data-highlighted])",
    );
    if (blocks.length === 0) return;
    let cancelled = false;
    void loadHljs().then((hljs) => {
      if (cancelled) return;
      blocks.forEach((el) => {
        if (!el.dataset.highlighted) hljs.highlightElement(el);
      });
    });
    return () => {
      cancelled = true;
    };
  }, [parsed, submitted, selectedId]);

  return (
    <div className={styles.cardShell} ref={cardRef}>
    <section className={styles.card} aria-label="Multiple choice question">
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
