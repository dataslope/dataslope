import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard, Tick } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, INK, TABULAR, fmt, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { BIAS } from "./data";
import { at, Axes, type Box, Curve, Dots, Drift, Fade, Mark, OK, OK_INK, PanelTitle, pulse, type Scale, Svg } from "./parts";

const FIT: Box = { left: 160, right: 860, top: 400, bottom: 820 };
const ERR: Box = { left: 1080, right: 1740, top: 420, bottom: 770 };
const ERR_TOP = 0.5;

/**
 * Questions 1 and 2 on the video's own twenty points from a noisy sine. On
 * the left, three fits: a straight line (bias), degree 9 threading the noise
 * (variance) and degree 3 between them. On the right, both errors against
 * the degree: training error falling all the way, validation error bottoming
 * out at 3 and leaving the chart at 9. Then the overfitting gap read off at
 * degree 9, and the fixes, regularization marked on the bridge.
 */
export const BiasScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("bias").from;
  const qAt = n.word("bias", "Question");
  const textAt = n.word("bias", "Explain");
  const asked = n.beat("bias").to;
  const pointsAt = n.word("bias-fits", "Twenty noisy points");
  const lineAt = n.word("bias-fits", "A straight line");
  const biasAt = n.word("bias-fits", "That's bias");
  const nineAt = n.word("bias-fits", "A degree-nine polynomial");
  const varianceAt = n.word("bias-fits", "That's variance");
  const threeAt = n.word("bias-fits", "Degree three");
  const trainAt = n.word("bias-curve", "training error only falls");
  const valAt = n.word("bias-curve", "Validation error falls");
  const bottomAt = n.word("bias-curve", "bottoms out at degree three");
  const climbAt = n.word("bias-curve", "climbs again");
  const bestAt = n.word("bias-curve", "the bottom of that curve");
  const q2At = n.word("overfit", "Question two");
  const q2TextAt = n.word("overfit", "How do you detect");
  const gapAt = n.word("overfit", "Look for the gap");
  const trainNineAt = n.word("overfit", "point oh six");
  const valNineAt = n.word("overfit", "five point seven");
  const fixAt = n.word("overfit", "To fix it");
  const fixes = [
    { text: "more data", at: n.word("overfit", "more data") },
    { text: "a simpler model", at: n.word("overfit", "a simpler model") },
    { text: "regularization", at: n.word("overfit", "regularization") },
    { text: "early stopping", at: n.word("overfit", "early stopping") },
    { text: "cross-validation, so the estimate is honest", at: n.word("overfit", "and cross-validation") },
  ];
  const oneAt = n.word("reg-in", "One of those fixes");
  const ownAt = n.word("reg-in", "a question of its own");
  const end = n.beat("reg-in").to;

  // ── The fits ──
  const fx: Scale = { lo: 0, hi: 1, a: FIT.left, b: FIT.right };
  const fy: Scale = { lo: -2, hi: 2, a: y(FIT.bottom), b: y(FIT.top) };
  const fitBox: Box = { left: FIT.left - 10, right: FIT.right + 10, top: y(FIT.top) - 10, bottom: y(FIT.bottom) + 10 };
  const curve = (d: "1" | "3" | "9") => BIAS.grid.map((g, i) => [g, BIAS.curves[d][i]] as const);
  const end1 = BIAS.curves["1"][BIAS.curves["1"].length - 1];
  const dots = BIAS.points.map(([px, py], i) => ({ x: at(fx, px), y: at(fy, py), at: pointsAt + i * 1.2 }));

  // ── The errors ──
  const ex: Scale = { lo: 1, hi: 9, a: ERR.left, b: ERR.right };
  const ey: Scale = { lo: 0, hi: ERR_TOP, a: y(ERR.bottom), b: y(ERR.top) };
  const errBox: Box = { left: ERR.left - 12, right: ERR.right + 12, top: y(ERR.top) - 6, bottom: y(ERR.bottom) + 12 };
  const trainPts = BIAS.degrees.map((d, i) => [d, BIAS.train[i]] as const);
  const valPts = BIAS.degrees.map((d, i) => [d, BIAS.val[i]] as const);
  const best = BIAS.val.indexOf(Math.min(...BIAS.val));
  const bestX = at(ex, BIAS.degrees[best]);
  const bestY = at(ey, BIAS.val[best]);
  const nineX = at(ex, 9);
  const lastVal = BIAS.val[BIAS.val.length - 1];
  const lastTrain = BIAS.train[BIAS.train.length - 1];
  const bestP = ease(frame, bottomAt, 12);
  const swell = pulse(frame, bestAt, 22);

  return (
    <AbsoluteFill>
      <Sfx name="el-sprinkle" at={pointsAt} level={-34} />
      <Sfx name="el-pencil" at={lineAt + 4} level={-34} />
      <Sfx name="el-pencil" at={nineAt + 4} level={-34} />
      <Sfx name="el-pop" at={threeAt + 2} level={-32} />
      <Sfx name="el-pop" at={bottomAt + 2} level={-32} />
      <Sfx name="el-scratch" at={gapAt + 4} level={-32} />
      {fixes.map((f) => (
        <Sfx key={f.text} name="el-tap" at={f.at} level={-36} />
      ))}

      <Drift from={from} to={end + 40}>
        <QuestionCard n={1} at={qAt - 4} textAt={textAt - 4} out={q2At - 4} size={60}>
          Explain the bias–variance trade-off.
        </QuestionCard>
        <QuestionCard n={2} at={q2At} textAt={q2TextAt - 2} out={end - 6} size={60}>
          How do you detect and fix overfitting?
        </QuestionCard>

        {/* ── Left: three fits through twenty points ── */}
        <Fade from={asked - 8} out={fixAt - 4}>
          <PanelTitle x={FIT.left} y={y(FIT.top) - h(56)} at={pointsAt - 4}>
            twenty noisy points from a sine wave
          </PanelTitle>
          <Dots dots={dots} r={7} />
          <Curve points={curve("1")} x={fx} y={fy} at={lineAt + 2} dur={18} color={ACCENT} width={3} dash="10 8" clip={fitBox} dim={nineAt} />
          <Curve points={curve("9")} x={fx} y={fy} at={nineAt + 2} dur={34} color={ACCENT} width={3} clip={fitBox} dim={threeAt} />
          <Curve points={curve("3")} x={fx} y={fy} at={threeAt} dur={24} color={OK} width={4} clip={fitBox} />
          <Note at={biasAt - 2} x={FIT.right - 10} y={at(fy, end1) - h(56)} align="right" dim={nineAt}>
            <span style={{ ...note(26, ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>degree 1: bias</span>
          </Note>
          <Note at={varianceAt - 2} x={FIT.left} y={y(FIT.bottom) + h(14)} dim={threeAt}>
            <span style={{ ...note(26, ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>degree 9: variance</span>
          </Note>
          <Note at={threeAt + 2} x={FIT.left + 300} y={y(FIT.bottom) + h(14)}>
            <span style={{ ...note(26, OK_INK), fontWeight: 650, whiteSpace: "nowrap" }}>degree 3: between them</span>
          </Note>
        </Fade>

        {/* ── Right: the two errors against the degree ── */}
        <PanelTitle x={ERR.left} y={y(ERR.top) - h(64)} at={trainAt - 6}>
          error, as the model gets more flexible
        </PanelTitle>
        <Axes
          x={ex}
          y={ey}
          xTicks={BIAS.degrees}
          yTicks={[0, 0.25, 0.5]}
          yFormat={(v) => fmt(v)}
          xTitle="polynomial degree"
          at={trainAt - 8}
        />
        <Curve points={trainPts} x={ex} y={ey} at={trainAt} dur={26} color={BAR} width={3.4} clip={errBox} dots={6} />
        <Curve points={valPts} x={ex} y={ey} at={valAt} dur={climbAt + 10 - valAt} color={INK} width={3.4} clip={errBox} dots={6} />
        <Note at={trainAt + 16} x={at(ex, 3.6)} y={at(ey, BIAS.train[3]) + h(8)}>
          <span style={{ ...note(23, BLUE_INK), fontWeight: 650, whiteSpace: "nowrap" }}>training error</span>
        </Note>
        <Note at={climbAt} x={at(ex, 6.6) - 20} y={at(ey, BIAS.val[6]) - h(16)} align="right">
          <span style={{ ...note(23, INK), fontWeight: 650, whiteSpace: "nowrap" }}>validation error</span>
        </Note>
        <Svg opacity={bestP}>
          <circle cx={bestX} cy={bestY} r={(13 + 6 * swell) * bestP} fill="none" stroke={OK} strokeWidth={3.4} />
        </Svg>
        <Note at={bestAt - 2} x={bestX - 40} y={bestY + h(24)}>
          <span style={{ ...note(25, OK_INK), fontWeight: 650, whiteSpace: "nowrap" }}>lowest: degree 3</span>
        </Note>

        {/* ── Question 2: the gap at degree 9, up off the top of the chart ── */}
        <Svg opacity={ease(frame, gapAt, 14)}>
          <line
            x1={nineX + 26}
            x2={nineX + 26}
            y1={at(ey, lastTrain)}
            y2={at(ey, lastTrain) + (y(ERR.top) - 30 - at(ey, lastTrain)) * ease(frame, gapAt, 18)}
            stroke={ACCENT}
            strokeWidth={3}
          />
          <path
            d={`M${nineX + 16},${y(ERR.top) - 22} L${nineX + 26},${y(ERR.top) - 38} L${nineX + 36},${y(ERR.top) - 22}`}
            fill="none"
            stroke={ACCENT}
            strokeWidth={3}
            strokeLinejoin="round"
            opacity={ease(frame, gapAt + 14, 6)}
          />
        </Svg>
        <Note at={trainNineAt - 2} x={nineX - 14} y={at(ey, lastTrain) - h(46)} align="right">
          <span style={{ ...note(24, BLUE_INK), fontWeight: 650, whiteSpace: "nowrap", ...TABULAR }}>{fmt(lastTrain)}</span>
        </Note>
        <Note at={valNineAt - 2} x={nineX + 6} y={y(ERR.top) - h(46)} align="right">
          <span style={{ ...note(24, ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap", ...TABULAR }}>{fmt(lastVal)}</span>
        </Note>
        <Note at={gapAt + 4} x={ERR.left} y={y(ERR.bottom) + h(84)}>
          <span style={{ ...note(25, ACCENT_INK), whiteSpace: "nowrap" }}>good on training data, poor on held-out data</span>
        </Note>

        {/* ── The fixes, where the fits were ── */}
        {fixes.map((f, i) => {
          const isReg = f.text === "regularization";
          const rowY = y(FIT.top) + h(10) + i * h(70);
          return (
            <Note key={f.text} at={f.at - 2} x={FIT.left} y={rowY} dim={isReg ? undefined : ownAt}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <Tick at={f.at + 2} size={26} color={OK} />
                <span style={{ ...note(32, INK), whiteSpace: "nowrap" }}>
                  {isReg ? <Mark at={oneAt}>{f.text}</Mark> : f.text}
                </span>
              </div>
            </Note>
          );
        })}
        <Note at={fixAt} x={FIT.left} y={y(FIT.top) - h(56)} dim={ownAt}>
          <span style={{ ...note(26, OK_INK), fontWeight: 650, whiteSpace: "nowrap" }}>to fix it</span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
