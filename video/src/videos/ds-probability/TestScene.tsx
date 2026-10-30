import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BLUE_INK, HIGHLIGHT, INK, INK_SOFT, PAPER, TABULAR, label, note } from "../../editorial/style";
import { Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { pct, TEST } from "./data";
import { DATA, Drift, Mark, OK_INK, pulse, Svg } from "./parts";

const BOX_H = 66;
const GRID = { x: 1040, y: 340, cols: 33, pitch: 23, r: 8 };

type Box = { x: number; y: number; w: number };
const ROOT: Box = { x: 120, y: 500, w: 240 };
const SICK: Box = { x: 430, y: 360, w: 210 };
const WELL: Box = { x: 430, y: 640, w: 210 };
const TP: Box = { x: 710, y: 360, w: 240 };
const FP: Box = { x: 710, y: 640, w: 240 };

const thousands = (v: number) => v.toLocaleString("en-US");

/** A count in the tree, in a box. */
const Count: React.FC<{ b: Box; at: number; color?: string; children: React.ReactNode }> = ({ b, at: from, color = INK, children }) => {
  const { y } = useLayout();
  return (
    <Ink at={from} dur={14} style={{ left: b.x, top: y(b.y) - BOX_H / 2, width: b.w, height: BOX_H }}>
      <div
        style={{
          width: b.w,
          height: BOX_H,
          boxSizing: "border-box",
          border: `2px solid ${color}`,
          borderRadius: 10,
          background: PAPER,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          ...note(26, color),
          ...TABULAR,
          fontWeight: 600,
          whiteSpace: "nowrap",
        }}
      >
        {children}
      </div>
    </Ink>
  );
};

/**
 * Question 3, on the page's test (1% prevalence, 99% sensitivity, 5% false
 * positives) walked through the BaseRate video's ten thousand people: a
 * natural-frequency tree on the left, and every positive as a dot on the
 * right, the 99 sick in blue against the 495 false alarms in red. Then the
 * three numbers a positive needs, named on the branches they sit on.
 */
export const TestScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  const from = n.beat("test").from;
  const qAt = n.word("test", "Question");
  const textAt = n.word("test", "Why can a sensitive test");
  const tenAt = n.word("test-sick", "ten thousand people");
  const onePctAt = n.word("test-sick", "One percent are sick");
  const catchesAt = n.word("test-sick", "catches ninety-nine");
  const flagsAt = n.word("test-healthy", "flags five percent");
  const healthyAt = n.word("test-healthy", "nine thousand nine hundred");
  const alarmsAt = n.word("test-healthy", "four hundred and ninety-five false alarms");
  const positivesAt = n.word("test-share", "five hundred and ninety-four positives");
  const sickAt = n.word("test-share", "ninety-nine are sick");
  const sixAt = n.word("test-share", "One in six");
  const sensAt = n.word("test-words", "the sensitivity");
  const specAt = n.word("test-need", "the specificity");
  const clearsAt = n.word("test-need", "ninety-five percent");
  const baseAt = n.word("test-need", "the base rate");
  const end = n.beat("indep-in").to;

  const mid = (b: Box) => y(b.y);
  const edges: { a: Box; b: Box; at: number; text: string; mark: number; color: string }[] = [
    { a: ROOT, b: SICK, at: onePctAt, text: pct(TEST.sick / TEST.people), mark: baseAt, color: INK },
    { a: SICK, b: TP, at: catchesAt - 4, text: pct(TEST.truePos / TEST.sick), mark: sensAt, color: INK },
    { a: ROOT, b: WELL, at: healthyAt - 6, text: "", mark: 0, color: INK },
    { a: WELL, b: FP, at: flagsAt + 4, text: pct(TEST.falsePos / TEST.healthy), mark: specAt, color: INK },
  ];

  const dots = Array.from({ length: TEST.positives }, (_, i) => {
    const sick = i < TEST.truePos;
    const col = i % GRID.cols;
    const row = Math.floor(i / GRID.cols);
    const inAt = sick ? catchesAt + 4 + (i / TEST.truePos) * 16 : alarmsAt - 2 + ((i - TEST.truePos) / TEST.falsePos) * 34;
    return { x: GRID.x + col * GRID.pitch + GRID.r, y: y(GRID.y) + row * GRID.pitch + GRID.r, sick, inAt };
  });
  const rows = Math.ceil(TEST.positives / GRID.cols);
  const gridBottom = y(GRID.y) + rows * GRID.pitch;
  const sickSwell = pulse(frame, sickAt, 24);
  const alarmsDim = ease(frame, sickAt, 14) * 0.45;

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={tenAt + 2} level={-34} />
      <Sfx name="el-sprinkle" at={catchesAt + 4} level={-34} />
      <Sfx name="el-sprinkle" at={alarmsAt} level={-30} />
      <Sfx name="el-pop" at={sixAt + 2} level={-30} />
      <Sfx name="el-tap" at={sensAt} level={-34} />
      <Sfx name="el-tap" at={specAt} level={-34} />
      <Sfx name="el-tap" at={baseAt} level={-34} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={3} at={qAt - 4} textAt={textAt - 4} size={58}>
          Why can a sensitive test for a rare disease still give mostly false positives?
        </QuestionCard>

        {/* ── The tree, in people ── */}
        <Svg>
          {edges.map(({ a, b, at: t }, i) => {
            const p = ease(frame, t, 14);
            const x0 = a.x + a.w;
            const y0 = mid(a);
            const x1 = b.x;
            const y1 = mid(b);
            return (
              <path
                key={i}
                d={`M${x0},${y0} C${x0 + 40},${y0} ${x1 - 40},${y1} ${x1},${y1}`}
                fill="none"
                stroke={INK_SOFT}
                strokeWidth={2}
                pathLength={1}
                strokeDasharray={`${p} 1`}
              />
            );
          })}
        </Svg>
        {edges.map(({ a, b, at: t, text, mark }, i) =>
          text ? (
            <Note
              key={i}
              at={t + 6}
              // A straight edge takes its label centred above it; the curve out
              // of the root takes it to the left of its midpoint, clear of the line.
              x={a === ROOT ? a.x + a.w - 42 : (a.x + a.w + b.x) / 2 - 60}
              width={a === ROOT ? 64 : 120}
              y={a === ROOT ? (mid(a) + mid(b)) / 2 - 30 : (mid(a) + mid(b)) / 2 - 50}
              from="up"
              style={{ textAlign: a === ROOT ? "right" : "center" }}
            >
              <span style={{ ...label(24, INK), ...TABULAR }}>
                <Mark at={mark}>{text}</Mark>
              </span>
            </Note>
          ) : null,
        )}
        <Count b={ROOT} at={tenAt - 2}>
          {thousands(TEST.people)} people
        </Count>
        <Count b={SICK} at={onePctAt + 4} color={BLUE_INK}>
          {TEST.sick} sick
        </Count>
        <Count b={TP} at={catchesAt + 2} color={BLUE_INK}>
          {TEST.truePos} positive
        </Count>
        <Count b={WELL} at={healthyAt - 2}>
          {thousands(TEST.healthy)} healthy
        </Count>
        <Count b={FP} at={alarmsAt - 4} color={ACCENT_INK}>
          {TEST.falsePos} positive
        </Count>

        {/* The three numbers a positive needs, named where they sit. */}
        <Note at={sensAt + 2} x={TP.x} y={y(TP.y) - BOX_H / 2 - 40}>
          <span style={{ ...note(22, INK), fontWeight: 600, whiteSpace: "nowrap" }}>sensitivity, on the sick</span>
        </Note>
        {/* Sensitivity's other half: the healthy it clears. The 5% on the
            branch is what it does not. Figures only take TABULAR, so the
            hyphen in "false-positive" keeps its own width. */}
        <Note at={specAt + 2} x={WELL.x} y={y(FP.y) + BOX_H / 2 + 14}>
          <span style={{ ...note(22, INK), fontWeight: 600, whiteSpace: "nowrap" }}>
            specificity, on the healthy: <span style={TABULAR}>{pct(TEST.specificity)}</span> cleared
          </span>
        </Note>
        <Note at={clearsAt + 8} x={WELL.x} y={y(FP.y) + BOX_H / 2 + 48}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>
            false-positive rate = 1 − specificity = <span style={TABULAR}>{pct(TEST.fpRate)}</span>
          </span>
        </Note>
        <Note at={baseAt + 2} x={ROOT.x} y={y(ROOT.y) - BOX_H / 2 - 40}>
          <span style={{ ...note(22, INK), fontWeight: 600, whiteSpace: "nowrap" }}>the base rate</span>
        </Note>

        {/* ── Every positive, one dot each ── */}
        <Svg>
          {dots.map((d, i) => {
            const p = ease(frame, d.inAt, 8);
            if (p <= 0) return null;
            return (
              <circle
                key={i}
                cx={d.x}
                cy={d.y}
                r={GRID.r * p * (d.sick ? 1 + 0.25 * sickSwell : 1)}
                fill={d.sick ? DATA : ACCENT}
                opacity={d.sick ? 0.95 : 0.8 * (1 - alarmsDim)}
              />
            );
          })}
        </Svg>
        <Note at={positivesAt} x={GRID.x} y={y(GRID.y) - 44}>
          <span style={{ ...label(24, INK), ...TABULAR, whiteSpace: "nowrap" }}>{TEST.positives} positives</span>
        </Note>
        <Note at={sickAt} x={GRID.x} y={gridBottom + 18}>
          <span style={{ ...note(24, BLUE_INK), fontWeight: 650, whiteSpace: "nowrap", ...TABULAR }}>● {TEST.truePos} sick</span>
          <span style={{ ...note(24, ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap", ...TABULAR, marginLeft: 28 }}>
            ● {TEST.falsePos} false alarms
          </span>
        </Note>
        <Note at={sixAt} x={GRID.x} y={gridBottom + 68}>
          <span style={{ ...note(36, OK_INK), fontWeight: 700, whiteSpace: "nowrap", ...TABULAR }}>
            {TEST.truePos} of {TEST.positives}: <span style={{ background: HIGHLIGHT, padding: "0 6px", borderRadius: 4 }}>one in six</span>, about{" "}
            {pct(TEST.posteriorFloat)}
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
