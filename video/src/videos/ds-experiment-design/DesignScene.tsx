import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard, Tick } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, HAIRLINE, INK, INK_SOFT, PAPER, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { ds } from "../../theme/brand";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { Drift, Mark, MARK_OK, OK_INK, pulse, Strike, X0 } from "./parts";

const CARD_W = 800;
const CARD_TOP = 290;
const ROW_TOP = 344;
const ROW = 74;
const KEY_W = 210;
const RIGHT_X = 1010;

/**
 * Questions 1 and 2. The test plan written out before anything runs, one
 * line as each is named: hypothesis, primary metric, guardrail, unit, size,
 * duration, analysis. Then the primary metric chosen against three tests:
 * raw clicks fail the first, ninety-day retention the last, and seven-day
 * activation passes all three and is agreed before launch.
 */
export const DesignScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("design").from;
  const qAt = n.word("design", "Question");
  const textAt = n.word("design", "How would you design");
  const writeAt = n.word("design-plan", "Write the plan");
  const guardCheckAt = n.word("design-plan", "check the guardrails");
  const q2At = n.word("metric", "Question two");
  const q2TextAt = n.word("metric", "How do you choose");
  const tiedAt = n.word("metric", "tied to what the feature is for");
  const sensitiveAt = n.word("metric", "sensitive enough to move");
  const measurableAt = n.word("metric", "measurable inside the test window");
  const clicksAt = n.word("metric", "Raw clicks");
  const inflateAt = n.word("metric", "easy to inflate");
  const retentionAt = n.word("metric", "Ninety-day retention");
  const arriveAt = n.word("metric", "won't arrive");
  const activationAt = n.word("metric", "Seven-day activation");
  const passesAt = n.word("metric", "passes all three");
  const agreeAt = n.word("metric", "agree on it before launch");
  const switchAt = n.word("metric", "no one switches metrics");
  const splitAt = n.word("unit-in", "what exactly gets split");
  const clearAt = n.beat("unit-in").to - 6;

  const rows = [
    { key: "hypothesis", value: "the new onboarding raises 7-day activation", at: n.word("design-plan", "A hypothesis") },
    { key: "primary metric", value: "7-day activation", at: n.word("design-plan", "One primary metric") },
    { key: "guardrail", value: "page latency: must not get worse", at: n.word("design-plan", "a guardrail or two") },
    { key: "unit", value: "user", at: n.word("design-plan", "Randomize by user") },
    { key: "sample size", value: "smallest lift worth finding · 80% power · α 5%", at: n.word("design-plan", "Size the test") },
    { key: "duration", value: "whole weeks", at: n.word("design-plan", "Run it for whole weeks") },
    { key: "analysis", value: "test the difference, check the guardrails", at: n.word("design-plan", "Then test the difference") },
  ];

  const card = ease(frame, writeAt - 4, 16);
  const clear = 1 - ease(frame, clearAt, 10);
  const q2 = ease(frame, q2At, 14);

  const criteria = [
    { text: "tied to the goal", at: tiedAt },
    { text: "sensitive", at: sensitiveAt },
    { text: "measurable in the window", at: measurableAt },
  ];
  const candidates = [
    { text: "raw clicks", at: clicksAt, verdict: "easy to inflate", verdictAt: inflateAt, ok: false },
    { text: "90-day retention", at: retentionAt, verdict: "arrives after the test ends", verdictAt: arriveAt, ok: false },
    { text: "7-day activation", at: activationAt, verdict: "passes all three", verdictAt: passesAt, ok: true },
  ];

  return (
    <AbsoluteFill style={{ opacity: clear }}>
      <Sfx name="el-pencil" at={writeAt} level={-34} />
      {rows.map((r) => (
        <Sfx key={r.key} name="el-tap" at={r.at} level={-40} />
      ))}
      <Sfx name="el-scratch" at={inflateAt + 2} level={-34} />
      <Sfx name="el-scratch" at={arriveAt + 2} level={-34} />
      <Sfx name="el-pop" at={passesAt} level={-32} />

      <Drift from={from} to={n.beat("unit-in").to + 30}>
        <QuestionCard n={1} at={qAt - 4} textAt={textAt - 4} out={q2At - 4} size={60}>
          How would you design an A/B test for a new feature?
        </QuestionCard>
        <QuestionCard n={2} at={q2At} textAt={q2TextAt - 2} size={60}>
          How do you choose the primary metric?
        </QuestionCard>

        {/* The plan, written before anything runs. */}
        <div
          style={{
            position: "absolute",
            left: X0 - 20,
            top: y(CARD_TOP),
            width: CARD_W + 40,
            height: h(ROW_TOP - CARD_TOP + rows.length * ROW + 18),
            boxSizing: "border-box",
            border: `1.5px solid ${HAIRLINE}`,
            borderRadius: 10,
            background: ds("gray", 50),
            opacity: card,
            clipPath: `inset(0 ${(1 - card) * 100}% 0 0)`,
          }}
        />
        <Note at={writeAt} x={X0} y={y(CARD_TOP) + h(14)}>
          <span style={{ ...label(21, INK_SOFT), fontWeight: 700, whiteSpace: "nowrap", letterSpacing: "0.04em" }}>TEST PLAN · written before launch</span>
        </Note>
        {rows.map((r, i) => {
          const p = ease(frame, r.at - 2, 12);
          if (p <= 0) return null;
          const isMetric = i === 1;
          const isGuard = i === 2;
          const isUnit = i === 3;
          // Question 2 sets back every line but the metric; the bridge brings the unit back.
          const dim = isMetric ? 0 : ease(frame, q2At + 4, 16) * 0.45 * (isUnit ? 1 - ease(frame, splitAt - 6, 10) : 1);
          return (
            <div
              key={r.key}
              style={{
                position: "absolute",
                left: X0,
                top: y(ROW_TOP) + i * h(ROW),
                width: CARD_W,
                height: h(ROW),
                display: "flex",
                alignItems: "center",
                borderTop: i === 0 ? "none" : `1px solid color-mix(in srgb, ${INK_SOFT} 30%, transparent)`,
                opacity: p * (1 - dim),
                transform: `translateX(${(1 - p) * 12}px)`,
              }}
            >
              <span style={{ width: KEY_W, ...label(20, INK_SOFT), fontWeight: 650, whiteSpace: "nowrap" }}>{r.key}</span>
              <span style={{ ...note(isMetric ? 26 : 23, INK), fontWeight: isMetric ? 700 : 500, whiteSpace: "nowrap" }}>
                {isGuard ? (
                  <Mark at={guardCheckAt} out={q2At}>
                    {r.value}
                  </Mark>
                ) : isMetric ? (
                  <Mark at={agreeAt} color={MARK_OK}>
                    {r.value}
                  </Mark>
                ) : isUnit ? (
                  <Mark at={splitAt}>{r.value}</Mark>
                ) : (
                  r.value
                )}
              </span>
              {isMetric ? (
                <span style={{ marginLeft: 16, display: "inline-flex", alignItems: "center", gap: 6, opacity: ease(frame, agreeAt + 4, 10) }}>
                  <Tick at={agreeAt + 4} size={24} />
                  <span style={{ ...label(20, OK_INK), fontWeight: 700, whiteSpace: "nowrap" }}>agreed</span>
                </span>
              ) : null}
            </div>
          );
        })}

        {/* Question 2: three tests a primary metric has to pass. */}
        <div style={{ position: "absolute", left: RIGHT_X, top: y(310), display: "flex", gap: 14 }}>
        {criteria.map((c, i) => {
          const p = ease(frame, c.at - 2, 10);
          return (
            <div
              key={c.text}
              style={{
                padding: "6px 14px",
                borderRadius: 6,
                border: `2px solid ${INK}`,
                background: PAPER,
                ...note(22, INK),
                fontWeight: 650,
                whiteSpace: "nowrap",
                opacity: p * q2,
                transform: `translateY(${(1 - p) * 10}px) scale(${1 + 0.05 * pulse(frame, c.at, 14)})`,
              }}
            >
              {i + 1}. {c.text}
            </div>
          );
        })}
        </div>
        {candidates.map((c, i) => {
          const p = ease(frame, c.at - 2, 12);
          if (p <= 0) return null;
          const top = y(440) + i * h(120);
          return (
            <React.Fragment key={c.text}>
              <div style={{ position: "absolute", left: RIGHT_X, top, opacity: p, transform: `translateX(${(1 - p) * 14}px)` }}>
                <span style={{ ...note(34, c.ok ? OK_INK : INK), fontWeight: 700, whiteSpace: "nowrap" }}>
                  {c.ok ? <Mark at={c.verdictAt} color={MARK_OK}>{c.text}</Mark> : <Strike at={c.verdictAt + 2} color={ACCENT}>{c.text}</Strike>}
                </span>
              </div>
              <Note at={c.verdictAt} x={RIGHT_X + 40} y={top + h(50)}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                  {c.ok ? <Tick at={c.verdictAt + 2} size={24} /> : null}
                  <span style={{ ...note(25, c.ok ? OK_INK : ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>{c.verdict}</span>
                </span>
              </Note>
            </React.Fragment>
          );
        })}
        <Note at={switchAt - 2} x={RIGHT_X} y={y(800)}>
          <span style={{ ...note(25, INK_SOFT), whiteSpace: "nowrap" }}>agreed before launch: no switching after the results</span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
