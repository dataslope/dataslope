"use client";

/**
 * `<MultipleChoiceQuestion>` — a self-contained quiz card authored in
 * Markdown. Parses the raw question source on mount via
 * `parseQuestion()` and renders the result with the same paper/badge
 * chrome as `<ChallengeCard>`.
 *
 * Behaviour:
 *   - Single-answer questions render as a radio group; questions with
 *     2+ `[o]` choices render as checkboxes (auto-detected by the
 *     parser).
 *   - Submit reveals per-choice verdicts + the overall explanation.
 *     A "Try Again" button then resets the selection while leaving the
 *     attempt count visible, so learners can iterate as many times as
 *     they like (mirrors the "unlimited attempts" UX of the existing
 *     `<ChallengeCard>` Check-Answer flow).
 *   - All learner-visible Markdown — body, choice labels, per-choice
 *     explanations, overall explanation — is rendered through
 *     react-markdown with GFM + KaTeX so authors can mix prose, lists,
 *     code, tables, and math equations.
 */

import { useId, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { Check, X, RotateCcw, ListChecks, Circle } from "lucide-react";
import {
  parseQuestion,
  type ParsedChoice,
  type ParsedQuestion,
} from "./parseQuestion";
import styles from "./MultipleChoiceQuestion.module.css";

/** Choice verdict assigned after Submit. Drives the per-choice colour
 *  ring + glyph and is read off `data-verdict` in the stylesheet. */
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
  // math + GFM consistent across all four call sites.
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

function summariseResult(
  parsed: ParsedQuestion,
  selectedIds: Set<string>,
): "pass" | "fail" | "partial" {
  // Treat the answer set as a set comparison: every correct choice
  // must be selected, and no incorrect choice may be selected. In
  // multi-answer questions, picking *some* of the correct choices
  // without any wrong ones earns a "partial" banner — useful feedback
  // even though the question isn't fully right.
  const correct = new Set(parsed.correctIds);
  let selectedCorrect = 0;
  let selectedWrong = 0;
  for (const id of selectedIds) {
    if (correct.has(id)) selectedCorrect++;
    else selectedWrong++;
  }
  const allCorrectPicked = selectedCorrect === correct.size;
  if (allCorrectPicked && selectedWrong === 0) return "pass";
  if (parsed.multiAnswer && selectedCorrect > 0 && selectedWrong === 0) {
    return "partial";
  }
  return "fail";
}

export default function MultipleChoiceQuestion({
  markdown,
  badge = "Question",
}: MultipleChoiceQuestionProps) {
  // Parse once per `markdown` prop. Authors editing MDX get instant
  // feedback because fumadocs hot-reloads the page, which re-mounts
  // this component with the new source.
  const parsed = useMemo(() => parseQuestion(markdown), [markdown]);

  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [submitted, setSubmitted] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const toggle = (id: string) => {
    if (submitted) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (parsed.multiAnswer) {
        if (next.has(id)) next.delete(id);
        else next.add(id);
      } else {
        next.clear();
        next.add(id);
      }
      return next;
    });
  };

  const onSubmit = () => {
    if (selected.size === 0) return;
    setSubmitted(true);
    setAttempts((n) => n + 1);
  };

  const onRetry = () => {
    // Reset selection but keep the attempt counter — the learner has
    // earned that. The overall explanation hides again so the second
    // attempt isn't trivially cued by the previous reveal.
    setSelected(new Set());
    setSubmitted(false);
  };

  const result = submitted ? summariseResult(parsed, selected) : null;
  const inputType = parsed.multiAnswer ? "checkbox" : "radio";
  const groupName = useId();

  const correctCount = parsed.correctIds.length;

  return (
    <section className={styles.card} aria-label="Multiple choice question">
      <header className={styles.header}>
        <span className={styles.badge}>
          <span className={styles.badgeDot} aria-hidden />
          {badge}
        </span>
        <span className={styles.modeLabel}>
          {parsed.multiAnswer ? (
            <>
              <ListChecks aria-hidden />
              Select all that apply ({correctCount})
            </>
          ) : (
            <>
              <Circle aria-hidden />
              Select one
            </>
          )}
        </span>
        <span className={styles.headerStatus}>
          {attempts > 0 ? (
            <span className={styles.attemptCount}>
              {attempts} {attempts === 1 ? "attempt" : "attempts"}
            </span>
          ) : null}
        </span>
      </header>

      {parsed.body ? (
        <div className={styles.body}>
          <div className={styles.bodyMd}>
            <MarkdownInline source={parsed.body} />
          </div>
        </div>
      ) : null}

      <ul className={styles.choiceList} role={parsed.multiAnswer ? "group" : "radiogroup"}>
        {parsed.choices.map((choice) => {
          const isSelected = selected.has(choice.id);
          const verdict = computeVerdict(choice, isSelected, submitted);
          // Whether to surface this choice's authored explanation.
          // Authors typically put the explanation on the wrong/correct
          // pivot — show it for any choice that was selected and any
          // correct choice the learner missed.
          const showExplanation =
            submitted &&
            choice.explanation &&
            (isSelected || (choice.correct && !isSelected));
          return (
            <li key={choice.id}>
              <label
                className={styles.choice}
                data-selected={isSelected ? "true" : "false"}
                data-locked={submitted ? "true" : "false"}
                data-verdict={verdict}
              >
                <input
                  className={styles.choiceInput}
                  type={inputType}
                  name={groupName}
                  value={choice.id}
                  checked={isSelected}
                  disabled={submitted}
                  onChange={() => toggle(choice.id)}
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
              </label>
            </li>
          );
        })}
      </ul>

      <div className={styles.actionBar}>
        {!submitted ? (
          <button
            type="button"
            className={styles.submitBtn}
            onClick={onSubmit}
            disabled={selected.size === 0}
          >
            Submit
          </button>
        ) : (
          <button type="button" className={styles.retryBtn} onClick={onRetry}>
            <RotateCcw size={13} aria-hidden />
            Try again
          </button>
        )}
        {!submitted && parsed.multiAnswer ? (
          <span className={styles.actionHint}>
            Pick every option that applies, then submit.
          </span>
        ) : null}
      </div>

      {result ? (
        <div className={styles.banner} data-state={result}>
          <span className={styles.bannerIcon}>
            {result === "pass" ? (
              <Check size={14} strokeWidth={3} aria-hidden />
            ) : result === "partial" ? (
              <ListChecks size={14} strokeWidth={2.5} aria-hidden />
            ) : (
              <X size={14} strokeWidth={3} aria-hidden />
            )}
          </span>
          <span>
            {result === "pass"
              ? "Correct!"
              : result === "partial"
                ? "Partially correct"
                : "Not quite — try again"}
            <span className={styles.bannerSub}>
              {result === "pass"
                ? parsed.multiAnswer
                  ? "You selected every correct option."
                  : "Great choice."
                : result === "partial"
                  ? `You picked ${selected.size} of ${correctCount} correct options.`
                  : "Review the explanations and give it another go."}
            </span>
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
    </section>
  );
}
