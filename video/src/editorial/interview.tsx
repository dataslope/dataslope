import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { during, ease } from "../components/motion";
import { ds, inkOf } from "../theme/brand";
import { MONO } from "../theme/fonts";
import { useLayout, LayoutContext, layoutFor } from "./layout";
import { ACCENT_INK, HIGHLIGHT, INK, INK_SOFT, PAPER, TABULAR, headline, label, note } from "./style";
import { Ink } from "./ui";

/**
 * The interview-prep videos' own pieces, written once for every role
 * (agent-outputs/20261021-2314-data-analyst-interview-video-plan.md):
 *
 * - `QuestionCard`: the interview question as the scene's headline, with its
 *   number as the kicker. The question is read aloud word for word, so it is
 *   never text nobody says.
 * - `RapidFire`: the closing round. Each question is a row in a numbered
 *   list, current while its answer is on the right and ticked once the next
 *   one starts, so the picture changes every few seconds.
 *
 * Numbering. These videos number their questions, not their figures: the
 * question in the kicker is what a viewer looks for when they come back to
 * one, and a "Fig. 3" beside a "Question 5" would be two counters for one
 * thing. A figure is titled by its table names and notes instead.
 *
 * Colors keep one meaning each across the series: red (ACCENT) is the trap,
 * the wrong answer or the error; green (OK) is the right answer; yellow
 * (HIGHLIGHT) is what the narration is pointing at; blue is data.
 */

/** The right answer's green. */
export const OK = ds("green", 600);
export const OK_INK = inkOf.green;

/**
 * Code inside a question or a list label, at the text's own size. A mono space
 * is 0.6em, so `LEFT JOIN` beside sans text read as a double space; the word
 * spacing brings it back to about a sans space.
 */
export const QMono: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ fontFamily: MONO, fontSize: "0.84em", fontStyle: "normal", fontWeight: 600, fontVariantLigatures: "none", wordSpacing: "-0.3em" }}>
    {children}
  </span>
);

/** A question's hyphenated words, each kept on one line: balanced wrapping
 *  would otherwise break "built-in" at its hyphen. */
const keepHyphenated = (children: React.ReactNode) =>
  React.Children.map(children, (child) =>
    typeof child === "string"
      ? child.split(/(\S+-\S+)/).map((part, i) =>
          i % 2 ? (
            <span key={i} style={{ whiteSpace: "nowrap" }}>
              {part}
            </span>
          ) : (
            part
          ),
        )
      : child,
  );

/**
 * "Question 3" over the question itself. The number inks in on `at` (the
 * word "Question"), the question on `textAt` (its first word). A question too
 * long for one line wraps within `width`.
 */
export const QuestionCard: React.FC<{
  n: number;
  at: number;
  textAt?: number;
  out?: number;
  /** Replaces "Question n" (a scene that carries a question on). */
  kicker?: React.ReactNode;
  size?: number;
  width?: number;
  children: React.ReactNode;
}> = ({ n, at, textAt, out, kicker, size = 66, width = 1720, children }) => {
  const { y } = useLayout();
  return (
    <>
      <Ink at={at} dur={14} out={out} style={{ left: 96, top: y(112), whiteSpace: "nowrap" }}>
        <span style={{ ...label(22, ACCENT_INK), fontWeight: 700 }}>{kicker ?? `Question ${n}`}</span>
      </Ink>
      {/* Balanced, so a question that wraps breaks into even lines rather than
          leaving one word on the last; the line count is the same either way. */}
      <Ink at={textAt ?? at + 8} dur={20} out={out} style={{ left: 92, top: y(150), width, ...headline(size), textWrap: "balance" }}>
        {keepHyphenated(children)}
      </Ink>
    </>
  );
};

/** A tick, drawn on `at`, in the right answer's green. */
export const Tick: React.FC<{ at: number; size?: number; color?: string }> = ({ at, size = 22, color = OK }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 10);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block", overflow: "visible" }}>
      <path
        d="M4 12.5 L10 18 L20 6"
        fill="none"
        stroke={color}
        strokeWidth={3.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        strokeDasharray={`${p} 1`}
      />
    </svg>
  );
};

export type RapidItem = {
  n: number;
  /** The list's name for the question: a few words. */
  label: React.ReactNode;
  /** When its answer starts. */
  at: number;
  /** Its answer, drawn in page coordinates while the item is current. */
  body?: React.ReactNode;
};

/**
 * The rapid-fire round: a numbered list down the left, every row inked in
 * from `at`, and the current item's answer (its `body`) on the rest of the
 * page. An item is current from its own `at` to the next one's, then ticked;
 * the last is current until `end`, when the whole list stands ticked.
 */
export const RapidFire: React.FC<{
  items: readonly RapidItem[];
  x: number;
  /** The first row's top, a page position (already through `y()`). */
  top: number;
  rowH: number;
  width: number;
  at: number;
  end: number;
}> = ({ items, x, top, rowH, width, at, end }) => {
  const frame = useCurrentFrame();
  return (
    <>
      {items.map((item, i) => {
        const next = items[i + 1]?.at ?? end;
        const current = during(frame, item.at - 2, next, 8);
        const done = ease(frame, next - 2, 10);
        const rowTop = top + i * rowH;
        return (
          <Ink key={item.n} at={at + i * 2} dur={12} style={{ left: x, top: rowTop, width, height: rowH }}>
            <div style={{ position: "relative", width, height: rowH, display: "flex", alignItems: "center", gap: 14 }}>
              <div
                style={{
                  position: "absolute",
                  left: -12,
                  right: 0,
                  top: 5,
                  bottom: 5,
                  background: HIGHLIGHT,
                  borderRadius: 4,
                  opacity: current * 0.55,
                }}
              />
              <span style={{ position: "relative", width: 26, height: 26, display: "flex", alignItems: "center" }}>
                {done > 0 ? <Tick at={next - 2} size={24} /> : null}
              </span>
              <span
                style={{
                  position: "relative",
                  ...label(21, current > 0.5 ? ACCENT_INK : INK_SOFT),
                  ...TABULAR,
                  width: 30,
                  textAlign: "right",
                  fontWeight: 700,
                }}
              >
                {item.n}
              </span>
              <span
                style={{
                  position: "relative",
                  ...note(23, INK),
                  fontWeight: current > 0.5 ? 650 : 500,
                  whiteSpace: "nowrap",
                  opacity: 0.42 + 0.58 * Math.max(current, done),
                }}
              >
                {item.label}
              </span>
            </div>
          </Ink>
        );
      })}
      {items.map((item, i) => {
        const next = items[i + 1]?.at ?? end;
        const o = during(frame, item.at - 6, next - 2, 8);
        if (o <= 0 || !item.body) return null;
        return (
          <AbsoluteFill key={item.n} style={{ opacity: o }}>
            {item.body}
          </AbsoluteFill>
        );
      })}
    </>
  );
};

/**
 * The kit on one page, for reviewing it: a question card, then a rapid-fire
 * list with three answers going by. Registered under Assets as
 * `InterviewKit`; scrub it in the Studio.
 */
export const InterviewKit: React.FC = () => {
  const items: RapidItem[] = [
    { n: 11, label: "Self join", at: 40 },
    { n: 12, label: <><QMono>UNION</QMono> or <QMono>UNION ALL</QMono></>, at: 70 },
    { n: 13, label: <QMono>EXCEPT</QMono>, at: 100 },
    { n: 14, label: <QMono>CASE</QMono>, at: 130 },
  ].map((it) => ({
    ...it,
    body: (
      <div style={{ position: "absolute", left: 760, top: 420, ...headline(44) }}>
        The answer to question {it.n}
      </div>
    ),
  }));
  return (
    <LayoutContext.Provider value={layoutFor(false)}>
      <AbsoluteFill style={{ background: PAPER }}>
        <QuestionCard n={1} at={4}>
          What&apos;s the difference between <QMono>WHERE</QMono> and <QMono>HAVING</QMono>?
        </QuestionCard>
        <RapidFire items={items} x={120} top={380} rowH={46} width={520} at={24} end={150} />
        <div style={{ position: "absolute", left: 760, top: 360, ...note(21, INK_SOFT) }}>
          The current answer appears here
        </div>
        <div style={{ position: "absolute", left: 120, top: 330, ...label(21, INK) }}>Rapid fire</div>
      </AbsoluteFill>
    </LayoutContext.Provider>
  );
};
