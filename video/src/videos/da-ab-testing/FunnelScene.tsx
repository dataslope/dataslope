import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QMono, QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, BAR, BLUE_INK, INK, INK_SOFT, TABULAR, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { MONO } from "../../theme/fonts";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { FUNNEL, pct } from "./data";
import { Drift, Listing, MARK, MARK_BAD, OK_INK, pulse, X0 } from "./parts";

const HEAD_Y = 318;
const ROW0 = 360;
const PITCH = 58;
const BAR_X = 420;
const BAR_MAX = 470;
/** Column centres: the step conversion, then the people lost. For question
 *  5, LAG(users) takes the first and the step conversion moves to the second,
 *  so each row reads users, the stage before, and the division of the two. */
const STEP_X = 1150;
const SIDE_X = 1390;
const COL_W = 200;
const LIST_Y = 724;

const count = (v: number) => v.toLocaleString("en-US");

/**
 * Questions 4 and 5. The page's funnel, 42,000 landings to 3,900 purchases:
 * its stages name themselves as the scene cuts in on the bridge line, then
 * the bars, overall conversion, then the step conversion beside each stage,
 * then the people lost, where the top looks worst only because it is the
 * top. For question 5 the lost column goes, the step conversion slides into
 * its place, and LAG's column takes the step conversion's: each stage's
 * previous count slides down onto its own row, left of the division it
 * feeds, and the query that does it sits under the bars, with the weakest
 * step picked out.
 */
export const FunnelScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("funnel-in").from;
  // On the cut, so the bridge line is never said over a blank page.
  const namesAt = from - 4;
  const qAt = n.word("funnel", "Question four");
  const textAt = n.word("funnel", "What is a funnel");
  const stepsAt = n.word("funnel-steps", "the ordered steps");
  const overallAt = n.word("funnel-steps", "Overall conversion");
  const nineAt = n.word("funnel-steps", "about nine percent");
  const perStepAt = n.word("funnel-step", "Per-step conversion");
  const overStepAt = n.word("funnel-step", "over the step before");
  const lostAt = n.word("funnel-lost", "Count the people lost");
  const firstAt = n.word("funnel-lost", "fourteen thousand five hundred gone");
  const topAt = n.word("funnel-lost", "the top always loses the most");
  const q5At = n.word("lag", "Question five");
  const q5TextAt = n.word("lag", "What is a step-to-step");
  const overAt = n.word("lag", "over the stage before");
  const lagAt = n.word("lag", "Lag puts the previous");
  const rowAt = n.word("lag", "on the same row");
  const divAt = n.word("lag", "one division");
  const weakAt = n.word("lag", "The weakest step");
  const fiftyAt = n.word("lag", "fifty-two percent");
  const end = n.beat("abtest-in").to;

  const stages = FUNNEL.stages;
  const top = stages[0].users;
  const rowY = (i: number) => y(ROW0) + i * h(PITCH);
  const rowH = h(PITCH);
  const weakest = stages.reduce((w, s, i) => (s.step !== null && s.step < (stages[w].step ?? 1) ? i : w), 1);
  const lostOut = q5At - 2;
  const lowerOut = q5At - 2;
  // The step conversion slides from its own column into the lost one's.
  const slide = ease(frame, q5At + 6, 18);
  const stepX = STEP_X + (SIDE_X - STEP_X) * slide;

  const head = (x: number, text: React.ReactNode, at: number, out?: number) => (
    <div
      style={{
        position: "absolute",
        left: x - COL_W / 2,
        width: COL_W,
        top: y(HEAD_Y),
        textAlign: "center",
        ...label(20, INK_SOFT),
        whiteSpace: "nowrap",
        opacity: ease(frame, at, 10) * (out === undefined ? 1 : 1 - ease(frame, out, 10)),
      }}
    >
      {text}
    </div>
  );

  return (
    <AbsoluteFill>
      {stages.map((s, i) => (
        <Sfx key={s.stage} name="el-tap" at={stepsAt + i * 5} level={-38} />
      ))}
      <Sfx name="el-pop" at={nineAt} level={-32} />
      <Sfx name="el-scratch" at={firstAt} level={-34} />
      <Sfx name="el-sprinkle" at={rowAt} level={-34} />
      <Sfx name="el-pop" at={fiftyAt} level={-32} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={4} at={qAt - 4} textAt={textAt - 4} out={q5At - 4} size={58}>
          What is a funnel, and how do you measure conversion at each step?
        </QuestionCard>
        <QuestionCard n={5} at={q5At} textAt={q5TextAt - 2} size={58}>
          What is a step-to-step conversion, and how does <QMono>LAG</QMono> help?
        </QuestionCard>

        {/* ── The weakest step, picked out across its row ── */}
        <div
          style={{
            position: "absolute",
            left: X0 - 14,
            top: rowY(weakest) + rowH * 0.08,
            width: SIDE_X + COL_W / 2 - X0 + 28,
            height: rowH * 0.84,
            background: MARK,
            borderRadius: 4,
            opacity: ease(frame, weakAt, 12),
          }}
        />

        {/* ── The funnel: one bar per stage ── */}
        {head(BAR_X + 60, "users", stepsAt)}
        {stages.map((s, i) => {
          const at = stepsAt + i * 5;
          const p = ease(frame, at, 14);
          const named = ease(frame, namesAt + i * 4, 12);
          if (named <= 0) return null;
          const w = (s.users / top) * BAR_MAX;
          const yy = rowY(i);
          return (
            <React.Fragment key={s.stage}>
              <div style={{ position: "absolute", left: X0, top: yy, height: rowH, display: "flex", alignItems: "center", opacity: named, ...note(25, INK), whiteSpace: "nowrap" }}>
                {s.stage}
              </div>
              <div
                style={{
                  position: "absolute",
                  left: BAR_X,
                  top: yy + rowH * 0.2,
                  height: rowH * 0.6,
                  width: w * p,
                  background: BAR,
                  borderRadius: 3,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: BAR_X + w + 14,
                  top: yy,
                  height: rowH,
                  display: "flex",
                  alignItems: "center",
                  opacity: ease(frame, at + 8, 10),
                  ...note(23, BLUE_INK),
                  ...TABULAR,
                  whiteSpace: "nowrap",
                }}
              >
                {count(s.users)}
              </div>
            </React.Fragment>
          );
        })}

        {/* ── The step conversion ── */}
        <div style={{ position: "absolute", left: 0, top: 0, transform: `translateX(${stepX - STEP_X}px)` }}>
          {head(STEP_X, "step conversion", perStepAt)}
        </div>
        {stages.map((s, i) => {
          if (s.step === null) return null;
          const p = ease(frame, perStepAt + 4 + i * 3, 10);
          const swell = pulse(frame, divAt + i * 2, 16) + pulse(frame, overStepAt + i * 2, 16);
          const hot = i === weakest ? ease(frame, weakAt, 10) : 0;
          return (
            <div
              key={s.stage}
              style={{
                position: "absolute",
                left: stepX - COL_W / 2,
                width: COL_W,
                top: rowY(i),
                height: rowH,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: p,
                transform: `scale(${1 + 0.08 * swell})`,
                ...note(25, INK),
                fontWeight: hot > 0.5 ? 700 : 500,
                ...TABULAR,
              }}
            >
              {pct(s.step, 1)}
            </div>
          );
        })}

        {/* ── The people lost: the top looks worst ── */}
        {head(SIDE_X, "lost", lostAt, lostOut)}
        {stages.map((s, i) => {
          if (s.lost === null) return null;
          const p = ease(frame, lostAt + 4 + i * 3, 10);
          const o = ease(frame, lostOut + i, 10);
          if (p <= 0 || o >= 1) return null;
          return (
            <div
              key={s.stage}
              style={{
                position: "absolute",
                left: SIDE_X - COL_W / 2,
                width: COL_W,
                top: rowY(i),
                height: rowH,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: p * (1 - o),
              }}
            >
              <span
                style={{
                  ...note(25, ACCENT_INK),
                  ...TABULAR,
                  padding: "2px 10px",
                  borderRadius: 4,
                  background: i === 1 ? `color-mix(in srgb, ${MARK_BAD} ${ease(frame, firstAt, 10) * 100}%, transparent)` : undefined,
                  fontWeight: i === 1 && frame >= firstAt ? 700 : 500,
                }}
              >
                {count(s.lost)}
              </span>
            </div>
          );
        })}

        {/* ── LAG: the stage before, on this row ── */}
        {head(STEP_X, <span style={{ fontFamily: MONO, fontSize: 20 }}>LAG(users)</span>, lagAt)}
        {stages.map((s, i) => {
          const at = rowAt + i * 3;
          const p = ease(frame, at, 14);
          if (p <= 0) return null;
          const prev = i === 0 ? null : stages[i - 1].users;
          return (
            <div
              key={s.stage}
              style={{
                position: "absolute",
                left: STEP_X - COL_W / 2,
                width: COL_W,
                top: rowY(i),
                height: rowH,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: p,
                transform: `translateY(${(1 - p) * -rowH}px)`,
                ...(prev === null ? { fontFamily: MONO, fontSize: 22, color: INK_SOFT } : { ...note(25, BLUE_INK), ...TABULAR }),
              }}
            >
              {prev === null ? "null" : count(prev)}
            </div>
          );
        })}

        {/* ── Under the bars: the overall rate, then the query ── */}
        <Note at={overallAt - 2} x={X0} y={y(LIST_Y)} out={lowerOut}>
          <span style={{ ...note(28, INK), whiteSpace: "nowrap", ...TABULAR }}>
            overall: {count(stages[stages.length - 1].users)} of {count(top)} ={" "}
            <b style={{ color: OK_INK, opacity: ease(frame, nineAt - 2, 10) }}>{pct(FUNNEL.overall, 1)}</b>
          </span>
        </Note>
        <Note at={topAt} x={STEP_X - COL_W / 2} y={y(LIST_Y)} out={lowerOut}>
          <span style={{ ...note(26, INK_SOFT), whiteSpace: "nowrap" }}>the top loses most because it has the most people</span>
        </Note>
        <Listing
          lines={FUNNEL.step.lines}
          x={X0}
          top={y(LIST_Y)}
          width={900}
          size={19}
          at={overAt - 2}
          marks={[{ line: 1, at: lagAt + 6 }]}
        />
      </Drift>
    </AbsoluteFill>
  );
};
