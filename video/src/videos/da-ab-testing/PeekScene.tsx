import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, INK, INK_SOFT, TABULAR, fmt, label, note } from "../../editorial/style";
import { Note, Num } from "../../editorial/ui";
import { SANS } from "../../theme/fonts";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { PEEK } from "./data";
import { A_COLOR, at, Drift, MARK_BAD, OK, OK_INK, type Scale, Svg, X0 } from "./parts";

const CHART = { x0: 210, x1: 1640, base: 830, top: 430 };
const ALPHA = 0.05;

/**
 * Question 13, on the page's peeking chart: two identical arms, the p-value
 * recomputed every hundred users per arm. It dips under 0.05 at 800 and
 * stays under from 2,000 to 4,600, each a moment a watching team would have
 * stopped and shipped, and reads 0.19 at the planned 8,000. The line meets
 * each crossing as it is named. Then why: every look is one more chance to
 * cross by luck; and the fix, one planned look or a sequential test.
 */
export const PeekScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("peek-in").from;
  // The bridge line sets out the empty chart: its axes as the scene cuts in,
  // so the page is never blank, the line a p-value has to cross at the urge
  // to look.
  const axesAt = from - 6;
  const urgeAt = n.word("peek-in", "the urge to look");
  const qAt = n.word("peek", "Question thirteen");
  const textAt = n.word("peek", "What is peeking");
  const identicalAt = n.word("peek-run", "both arms are identical");
  const eightHundredAt = n.word("peek-run", "at eight hundred");
  const againAt = n.word("peek-run", "and again from two thousand");
  const runEndAt = n.word("peek-run", "four thousand six hundred");
  const stoppedAt = n.word("peek-run", "would have stopped and shipped");
  const plannedAt = n.word("peek-run", "At the planned eight thousand");
  const finalAt = n.word("peek-run", "point one nine");
  const lookAt = n.word("peek-why", "Every look is another chance");
  const farAt = n.word("peek-why", "far more than five percent");
  const fixAt = n.word("peek-fix", "Fix the sample size");
  const seqAt = n.word("peek-fix", "a sequential test");
  const stricterAt = n.word("peek-fix", "a stricter line");
  const end = n.beat("simpson-in").to;

  const xs: Scale = { lo: 0, hi: PEEK.planned, a: CHART.x0, b: CHART.x1 };
  const top = Math.max(...PEEK.rows.map(([, p]) => p));
  const ys: Scale = { lo: 0, hi: Math.ceil(top * 10) / 10, a: y(CHART.base), b: y(CHART.top) };
  const [firstCross, secondCross] = PEEK.crossings;
  const runEnd = Math.max(...PEEK.under.filter((u) => u >= secondCross));
  // The line draws from "both arms are identical" and meets each crossing as
  // the narration names it: piecewise linear through those moments.
  const keys: [number, number][] = [
    [0, identicalAt],
    [firstCross, eightHundredAt],
    [secondCross, againAt + 6],
    [runEnd, runEndAt],
    [PEEK.planned, plannedAt],
  ];
  const drawTo = (nn: number) => {
    const k = keys.findIndex(([v]) => v >= nn);
    if (k <= 0) return keys[0][1];
    const [v0, f0] = keys[k - 1];
    const [v1, f1] = keys[k];
    return f0 + ((f1 - f0) * (nn - v0)) / (v1 - v0);
  };
  const shownRows = PEEK.rows.filter(([nn]) => frame >= drawTo(nn) - 2);
  const path = shownRows.map(([nn, p], i) => `${i ? "L" : "M"}${at(xs, nn).toFixed(1)},${at(ys, p).toFixed(1)}`).join(" ");
  const alphaY = at(ys, ALPHA);
  const bandP = ease(frame, againAt + 6, 16);
  const flagP = ease(frame, stoppedAt - 2, 12);
  const finalP = ease(frame, finalAt - 4, 12);

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={identicalAt} level={-34} />
      <Sfx name="el-scratch" at={eightHundredAt + 4} level={-32} />
      <Sfx name="el-scratch" at={againAt + 6} level={-32} />
      <Sfx name="el-pop" at={finalAt} level={-32} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={13} at={qAt - 4} textAt={textAt - 4} size={60}>
          What is peeking, and why is it a problem?
        </QuestionCard>

        <Note at={identicalAt - 4} x={X0} y={y(CHART.top) - h(84)}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
            A and B identical: <b>nothing to find</b>
          </span>
        </Note>

        <Svg opacity={ease(frame, axesAt, 14)}>
          {/* The stretch from 2,000 on, shaded as the narration names it. */}
          <rect
            x={at(xs, secondCross) - 8}
            y={y(CHART.top)}
            width={(at(xs, runEnd) - at(xs, secondCross) + 16) * bandP}
            height={y(CHART.base) - y(CHART.top)}
            fill={MARK_BAD}
            opacity={0.7}
          />
          <line x1={CHART.x0} x2={CHART.x1} y1={y(CHART.base)} y2={y(CHART.base)} stroke={INK} strokeWidth={1.6} />
          <g opacity={ease(frame, urgeAt, 12)}>
            <line
              x1={CHART.x0}
              x2={CHART.x0 + (CHART.x1 - CHART.x0) * ease(frame, urgeAt, 20)}
              y1={alphaY}
              y2={alphaY}
              stroke={ACCENT}
              strokeWidth={1.6}
              strokeDasharray="6 6"
            />
            <text x={CHART.x1 + 14} y={alphaY + 7} style={{ fontFamily: SANS, fontSize: 19, fontWeight: 600, fill: ACCENT_INK }}>
              0.05
            </text>
          </g>
          {[0, 0.2, 0.4].map((t) => (
            <text key={t} x={CHART.x0 - 14} y={at(ys, t) + 7} textAnchor="end" style={{ fontFamily: SANS, fontSize: 19, fontWeight: 500, fill: INK_SOFT }}>
              {t === 0 ? "0" : t.toFixed(1)}
            </text>
          ))}
          {[0, 2000, 4000, 6000, 8000].map((t) => (
            <text key={t} x={at(xs, t)} y={y(CHART.base) + 30} textAnchor="middle" style={{ fontFamily: SANS, fontSize: 19, fontWeight: 500, fill: INK_SOFT }}>
              {t.toLocaleString("en-US")}
            </text>
          ))}
          <text x={CHART.x1} y={y(CHART.base) + 60} textAnchor="end" style={{ fontFamily: SANS, fontSize: 19, fontWeight: 650, fill: INK_SOFT }}>
            users per arm, checked every hundred
          </text>
          <text x={CHART.x0 - 14} y={y(CHART.top) - 18} style={{ fontFamily: SANS, fontSize: 19, fontWeight: 650, fill: INK_SOFT }}>
            p-value
          </text>
          {path ? <path d={path} fill="none" stroke={A_COLOR} strokeWidth={3} strokeLinejoin="round" /> : null}
          {shownRows
            .filter(([, p]) => p < ALPHA)
            .map(([nn, p]) => (
              <circle key={nn} cx={at(xs, nn)} cy={at(ys, p)} r={6} fill={ACCENT} />
            ))}
          {/* Where a watching team would have stopped. */}
          <g opacity={flagP}>
            <line x1={at(xs, firstCross)} x2={at(xs, firstCross)} y1={alphaY - 4} y2={y(CHART.top) + 30} stroke={ACCENT} strokeWidth={2.4} />
            <path d={`M${at(xs, firstCross)},${y(CHART.top) + 30} l46,12 l-46,12 Z`} fill={ACCENT} />
          </g>
          <circle cx={at(xs, PEEK.planned)} cy={at(ys, PEEK.final)} r={9 * finalP} fill={OK} />
        </Svg>
        <Note at={eightHundredAt + 2} x={at(xs, firstCross) - 40} width={80} y={y(CHART.base) + h(9)} from="up" style={{ textAlign: "center" }}>
          <span style={{ ...label(20, ACCENT_INK), whiteSpace: "nowrap", ...TABULAR }}>{firstCross.toLocaleString("en-US")}</span>
        </Note>
        <Note at={againAt + 10} x={at(xs, secondCross)} y={y(CHART.top) - h(36)}>
          <span style={{ ...label(20, ACCENT_INK), whiteSpace: "nowrap", ...TABULAR }}>
            under 0.05 from {secondCross.toLocaleString("en-US")} to {runEnd.toLocaleString("en-US")}
          </span>
        </Note>
        <Note at={stoppedAt + 4} x={at(xs, firstCross) + 56} y={y(CHART.top) + h(26)}>
          <span style={{ ...note(24, ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>&ldquo;Significant! Ship it.&rdquo;</span>
        </Note>
        <Note at={finalAt + 2} x={at(xs, PEEK.planned) - 20} width={260} y={at(ys, PEEK.final) + h(16)} align="right">
          <span style={{ ...note(24, OK_INK), fontWeight: 650, whiteSpace: "nowrap", ...TABULAR }}>planned: p = {fmt(PEEK.final, 2)}</span>
        </Note>
        {/* Why, then the fix, in the empty upper right. */}
        <Note at={lookAt - 2} x={X0 + 980} y={y(CHART.top) - h(84)}>
          <span style={{ ...note(25, ACCENT_INK), whiteSpace: "nowrap" }}>every look: one more chance to cross by luck</span>
          <div style={{ ...note(25, ACCENT_INK), whiteSpace: "nowrap", opacity: ease(frame, farAt - 2, 10) }}>
            false winners: far more than <Num>{Math.round(ALPHA * 100)}%</Num> of the time
          </div>
        </Note>
        <Note at={fixAt - 2} x={X0 + 980} y={y(CHART.top) + h(14)}>
          <span style={{ ...note(25, OK_INK), whiteSpace: "nowrap" }}>fix the sample size first and look once,</span>
          <div style={{ ...note(25, OK_INK), whiteSpace: "nowrap", opacity: ease(frame, seqAt - 2, 10) }}>
            or use a sequential test
            <span style={{ opacity: ease(frame, stricterAt - 2, 10) }}>: a stricter line per look</span>
          </div>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
