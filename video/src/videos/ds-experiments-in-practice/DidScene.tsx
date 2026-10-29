import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, BLUE_INK, HIGHLIGHT, INK, INK_SOFT, TABULAR, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { DID, fixed } from "./data";
import { at, Axes, CONTROL, Curve, Drift, Mark, OK_INK, pulse, type Scale, TREAT, X0 } from "./parts";

const PLOT = { x0: 200, x1: 1240, top: 420, base: 820 };
const SUM_X = 1430;
const SUM_W = 420;

/**
 * Question 10. Two simulated cities over twelve weeks; a policy starts in the
 * treated one in week 7. Each city's before and after averages are drawn as
 * steps: the treated city rose 8.9, the comparison city 2.4 with no policy,
 * so the difference of differences is 6.5 against a true 6, written as the
 * subtraction it is. Then parallel trends: the dashed line is where the
 * treated city would have gone on the comparison city's path. That can't be
 * seen, but the weeks before the policy can: there the gap between the cities
 * held steady (its slope, from check.mjs, is the `preGap` printed in the band).
 */
export const DidScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("did").from;
  const qAt = n.word("did", "Question ten");
  const textAt = n.word("did", "What is a quasi-experiment");
  const cantAt = n.word("did", "Sometimes you can't randomize");
  const policyAt = n.word("did", "a policy starts in one city");
  const notAt = n.word("did", "not in another");
  const naturalAt = n.word("did", "that natural split");
  const simAt = n.word("did-math", "In this simulation");
  const roseAt = n.word("did-math", "rose eight point nine");
  const compAt = n.word("did-math", "The comparison city rose two point four");
  const noPolicyAt = n.word("did-math", "with no policy at all");
  const diffAt = n.word("did-math", "The difference of those differences");
  const sixFiveAt = n.word("did-math", "is six point five");
  const trueAt = n.word("did-math", "the true effect of six");
  const parallelAt = n.word("did-math", "It rests on parallel trends");
  const togetherAt = n.word("did-math", "kept moving together");
  const checkAt = n.word("did-check", "you can check the weeks before it");
  const beforeAt = n.word("did-check", "the two cities rose together");
  const end = n.beat("did-check").to;

  const x: Scale = { lo: 0.5, hi: 12.5, a: PLOT.x0, b: PLOT.x1 };
  const yS: Scale = { lo: 20, hi: 65, a: y(PLOT.base), b: y(PLOT.top) };
  const line = (vals: number[]) => vals.map((v, i) => [DID.weeks[i], v] as [number, number]);
  const split = DID.start - 0.5;
  const step = (before: number, after: number, at0: number, color: string) => {
    const p = ease(frame, at0, 16);
    if (p <= 0) return null;
    return (
      <g opacity={p}>
        <line x1={at(x, 0.6)} x2={at(x, split)} y1={at(yS, before)} y2={at(yS, before)} stroke={color} strokeWidth={3} strokeDasharray="10 6" />
        <line x1={at(x, split)} x2={at(x, 12.4)} y1={at(yS, after)} y2={at(yS, after)} stroke={color} strokeWidth={3} strokeDasharray="10 6" />
        <line x1={at(x, split) + 10} x2={at(x, split) + 10} y1={at(yS, before)} y2={at(yS, before) + (at(yS, after) - at(yS, before)) * p} stroke={color} strokeWidth={4} />
      </g>
    );
  };
  // Where the treated city would have gone on the comparison city's path.
  const counterfactual = DID.treatedBefore + DID.controlChange;
  const cf = ease(frame, parallelAt + 4, 16);
  const pre = ease(frame, checkAt, 14);
  const big = pulse(frame, sixFiveAt, 20);

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={policyAt + 4} level={-36} />
      <Sfx name="el-tap" at={roseAt} level={-36} />
      <Sfx name="el-tap" at={compAt + 4} level={-36} />
      <Sfx name="el-pop" at={sixFiveAt} level={-34} />
      <Sfx name="el-pencil" at={parallelAt + 4} level={-37} />
      <Sfx name="el-pop" at={checkAt + 2} level={-37} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={10} at={qAt - 4} textAt={textAt - 4} size={58}>
          What is a quasi-experiment, and how does difference-in-differences work?
        </QuestionCard>
        <Note at={cantAt} x={X0} y={y(330)}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
            No randomizing: <span style={{ opacity: ease(frame, policyAt, 10) }}>a policy starts in one city</span>
            <span style={{ opacity: ease(frame, notAt, 10) }}> and not in another.</span>
            <span style={{ color: BLUE_INK, opacity: ease(frame, naturalAt, 10) }}> A natural split.</span>
          </span>
        </Note>

        {/* Weeks before and after, and the two cities. */}
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          <rect x={at(x, 0.5)} y={y(PLOT.top)} width={(at(x, split) - at(x, 0.5)) * pre} height={y(PLOT.base) - y(PLOT.top)} fill={HIGHLIGHT} opacity={0.45} />
          <line
            x1={at(x, split)}
            x2={at(x, split)}
            y1={y(PLOT.top) - 10}
            y2={y(PLOT.top) - 10 + (y(PLOT.base) - y(PLOT.top) + 10) * ease(frame, policyAt + 4, 14)}
            stroke={INK}
            strokeWidth={2}
            strokeDasharray="4 6"
          />
          {step(DID.treatedBefore, DID.treatedAfter, roseAt - 2, TREAT)}
          {step(DID.controlBefore, DID.controlAfter, compAt + 2, CONTROL)}
          <line
            x1={at(x, split)}
            x2={at(x, split) + (at(x, 12.4) - at(x, split)) * cf}
            y1={at(yS, counterfactual)}
            y2={at(yS, counterfactual)}
            stroke={INK}
            strokeWidth={2.4}
            strokeDasharray="3 6"
            opacity={cf}
          />
        </svg>
        <Axes x={x} y={yS} xTicks={[1, 3, 5, 7, 9, 11]} yTicks={[20, 30, 40, 50, 60]} xTitle="week" yTitle="weekly sign-ups" at={policyAt - 6} />
        <Curve points={line(DID.control)} x={x} y={yS} at={notAt} dur={22} color={CONTROL} dots={5} />
        <Curve points={line(DID.treated)} x={x} y={yS} at={policyAt + 2} dur={22} color={TREAT} dots={5} />
        <Note at={policyAt + 10} x={at(x, split) + 12} y={y(PLOT.top) - h(12)}>
          <span style={{ ...label(21, INK), fontWeight: 700, whiteSpace: "nowrap" }}>the policy starts</span>
        </Note>
        <Note at={policyAt + 8} x={at(x, 12.4) + 12} y={at(yS, DID.treated[11]) - 16}>
          <span style={{ ...label(21, BLUE_INK), fontWeight: 750, whiteSpace: "nowrap" }}>treated city</span>
        </Note>
        {/* The evidence for parallel trends: the weeks before the policy. */}
        <Note at={beforeAt - 2} x={at(x, 0.6) + 12} y={y(PLOT.top) + h(58)}>
          <span style={{ ...label(21, INK), fontWeight: 700, whiteSpace: "nowrap" }}>before the policy, the two rose together</span>
        </Note>
        <Note at={beforeAt + 8} x={at(x, 0.6) + 12} y={y(PLOT.top) + h(88)}>
          <span style={{ ...label(19, INK_SOFT), fontWeight: 650, whiteSpace: "nowrap" }}>
            the gap between them drifted {fixed(DID.preGap, 2)} a week
          </span>
        </Note>
        <Note at={notAt + 8} x={at(x, 12.4) + 12} y={at(yS, DID.control[11]) - 16}>
          <span style={{ ...label(21, INK_SOFT), fontWeight: 750, whiteSpace: "nowrap" }}>comparison city</span>
        </Note>
        <Note at={simAt} x={PLOT.x0 - 100} y={y(PLOT.base) + h(44)}>
          <span style={{ ...label(20, INK_SOFT), fontWeight: 650, whiteSpace: "nowrap" }}>simulated</span>
        </Note>

        {/* The arithmetic. */}
        {[
          { text: "treated city", v: DID.treatedChange, at: roseAt + 2, ink: BLUE_INK },
          { text: "comparison city", v: DID.controlChange, at: compAt + 6, ink: INK_SOFT },
        ].map((r, i) => (
          <Note key={r.text} at={r.at} x={SUM_X} y={y(500) + i * h(60)}>
            <span style={{ display: "inline-flex", width: SUM_W, justifyContent: "space-between", ...note(27, r.ink), fontWeight: 700, ...TABULAR }}>
              <span>{r.text}</span>
              <span>{fixed(r.v, 1, true)}</span>
            </span>
          </Note>
        ))}
        <Note at={noPolicyAt} x={SUM_X} y={y(500) + h(100)}>
          <span style={{ ...label(20, INK_SOFT), fontWeight: 650, whiteSpace: "nowrap" }}>(with no policy at all)</span>
        </Note>
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          <line x1={SUM_X} x2={SUM_X + SUM_W * ease(frame, diffAt, 12)} y1={y(500) + h(140)} y2={y(500) + h(140)} stroke={INK} strokeWidth={2} />
        </svg>
        <Note at={diffAt + 4} x={SUM_X} y={y(500) + h(156)}>
          <span style={{ display: "inline-flex", width: SUM_W, justifyContent: "space-between", alignItems: "baseline", ...TABULAR }}>
            <span style={{ ...note(28, OK_INK), fontWeight: 750 }}>DiD</span>
            <span style={{ display: "inline-flex", alignItems: "baseline", gap: 12 }}>
              <span style={{ ...note(26, OK_INK), fontWeight: 650, ...TABULAR }}>
                {fixed(DID.treatedChange, 1)} − {DID.controlChange < 0 ? `(${fixed(DID.controlChange, 1)})` : fixed(DID.controlChange, 1)} =
              </span>
              <span style={{ ...note(40, OK_INK), fontWeight: 800, display: "inline-block", transform: `scale(${1 + 0.08 * big})`, transformOrigin: "right center" }}>
                <Mark at={sixFiveAt + 2}>{fixed(DID.did, 1, true)}</Mark>
              </span>
            </span>
          </span>
        </Note>
        <Note at={trueAt} x={SUM_X} y={y(500) + h(226)}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap", ...TABULAR }}>true effect in the simulation: +{DID.truth}</span>
        </Note>
        <Note at={parallelAt} x={SUM_X} y={y(780)} width={SUM_W}>
          <span style={{ ...note(25, ACCENT_INK), fontWeight: 700 }}>
            It rests on parallel trends<span style={{ fontWeight: 500, opacity: ease(frame, togetherAt - 6, 10) }}>: without the policy, the lines move together</span>
          </span>
        </Note>
        <Note at={parallelAt + 10} x={at(x, split) + 30} y={at(yS, counterfactual) + 10}>
          <span style={{ ...label(19, INK), fontWeight: 650, whiteSpace: "nowrap" }}>without the policy</span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
