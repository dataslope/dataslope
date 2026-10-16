import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { sx } from "../../editorial/charts";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, fmt, halo, headline, HIGHLIGHT, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import {
  BEST,
  DEGREES,
  exitDegree,
  MAX_DEGREE,
  N_TEST,
  N_TRAIN,
  NEW_COLOR,
  NEW_INK,
  RATIO,
  row,
  SWEEP,
  TRAIN_COLOR,
  TRAIN_INK,
} from "./data";
import { type Box, by, Curve, Grid, prose, Swatch, toPage } from "./parts";

const X = { lo: 1, hi: MAX_DEGREE, x0: 330, x1: 1430 };
const TOP_VALUE = 0.35;
/** Where the error on new points leaves the top of the chart. */
const EXIT_DEGREE = exitDegree("test", TOP_VALUE);

/**
 * Sweep, train, test, worse, blind: every degree from one to eleven, scored on
 * the twelve training points and on 1,000 new ones. Training error only
 * falls; the error on new points bottoms out at degree three and leaves the
 * chart after eight.
 */
export const ErrorScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  const start = n.beat("sweep").from;
  const trainAt = n.word("train", "twelve training");
  const fallsAt = n.word("train", "falls");
  const zeroAt = n.word("train", "zero");
  const newAt = n.word("test", "thousand");
  const threeAt = n.word("test", "degree three", { edge: "end" });
  const climbsAt = n.word("test", "climbs");
  const worseAt = n.word("worse", "two hundred");
  const warnAt = n.word("blind", "cannot warn");
  const improvesAt = n.word("blind", "improves");

  const box: Box = { x: X, top: y(300), base: y(820), lo: 0, hi: TOP_VALUE };
  const px = (d: number) => sx(X, d);
  const py = (v: number) => by(box, v);

  const trainReveal = X.x0 + (X.x1 - X.x0) * ease(frame, trainAt, Math.max(20, zeroAt - trainAt));
  const testReveal =
    ease(frame, climbsAt - 2, 22) > 0
      ? px(BEST.test) + (X.x1 + 10 - px(BEST.test)) * ease(frame, climbsAt - 2, 22)
      : X.x0 + (px(BEST.test) - X.x0) * ease(frame, newAt, Math.max(16, threeAt - newAt - 4));
  const trainPts = toPage(box, DEGREES, SWEEP.map((r) => r.train));
  const testPts = toPage(box, DEGREES, SWEEP.map((r) => r.test));
  const blind = ease(frame, improvesAt - 4, 12);
  const mark = ease(frame, warnAt - 2, 14);

  const best = row(BEST.test);
  const last = row(MAX_DEGREE);

  return (
    <AbsoluteFill>
      {/* One line in two inks; the second half follows the first in the flow. */}
      <div style={{ position: "absolute", left: 116, top: y(104), display: "flex", gap: "0.26em", ...headline(56) }}>
        <Ink at={fallsAt - 6} dur={20} style={{ position: "relative", whiteSpace: "nowrap" }}>
          <span style={{ position: "relative" }}>
            <span
              style={{
                position: "absolute",
                left: "-0.1em",
                top: "0.18em",
                height: "0.86em",
                width: `calc(${mark * 100}% + 0.2em)`,
                background: HIGHLIGHT,
                opacity: mark > 0 ? 1 : 0,
              }}
            />
            <span style={{ position: "relative" }}>Training error only falls.</span>
          </span>
        </Ink>
        <Ink
          at={climbsAt - 2}
          dur={18}
          style={{ position: "relative", ...headline(56, true), color: ACCENT_INK, whiteSpace: "nowrap" }}
        >
          Error on new points turns back up.
        </Ink>
      </div>

      <FigLabel n="2" title="Mean squared error by polynomial degree" at={start - 2} x={120} y={y(196)} />
      {/* The legend, at the right end of the label's line. */}
      <div
        style={{
          position: "absolute",
          right: 1920 - 1810,
          top: y(196) + 2,
          display: "flex",
          alignItems: "center",
          gap: 12,
          ...note(21, INK_SOFT),
          whiteSpace: "nowrap",
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 10, opacity: ease(frame, trainAt - 4, 12) }}>
          <Swatch color={TRAIN_COLOR} />
          <span style={{ color: TRAIN_INK, fontWeight: 650 }}>{N_TRAIN} training points</span>
        </span>
        <span style={{ width: 18 }} />
        <span style={{ display: "inline-flex", alignItems: "center", gap: 10, opacity: ease(frame, newAt - 4, 12) }}>
          <Swatch color={NEW_COLOR} />
          <span style={{ color: NEW_INK, fontWeight: 650 }}>{N_TEST.toLocaleString("en-US")} new points</span>
        </span>
      </div>

      <Grid
        box={box}
        yTicks={[0, 0.1, 0.2, 0.3]}
        yFormat={(v) => (v === 0 ? "0" : fmt(v, 1))}
        xTicks={DEGREES}
        at={start - 4}
      />
      <Ink at={start + 4} dur={14} style={{ left: X.x0, top: box.base + 52, width: X.x1 - X.x0, textAlign: "center" }}>
        <span style={label(20, INK_SOFT)}>Polynomial degree</span>
      </Ink>

      <Curve id="of-err-test" pts={testPts} box={box} reveal={testReveal} color={NEW_COLOR} width={4} />
      <Curve id="of-err-train" pts={trainPts} box={box} reveal={trainReveal} color={TRAIN_COLOR} width={4 + blind * 3} />
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        {SWEEP.map((r, i) => {
          const [tx, ty] = trainPts[i];
          const [nx, ny] = testPts[i];
          const trainDot = ease(frame, trainAt + ((tx - X.x0) / (X.x1 - X.x0)) * Math.max(20, zeroAt - trainAt) - 2, 6);
          const testDot = testReveal > X.x0 + 0.5 && tx <= testReveal + 1 ? 1 : 0;
          return (
            <g key={r.degree}>
              {r.test <= TOP_VALUE && testDot > 0 ? (
                <circle cx={nx} cy={ny} r={7} fill={NEW_COLOR} stroke={PAPER} strokeWidth={2} />
              ) : null}
              {trainDot > 0 ? <circle cx={tx} cy={ty} r={7 * trainDot} fill={TRAIN_COLOR} stroke={PAPER} strokeWidth={2} /> : null}
            </g>
          );
        })}
        {/* The lowest error on new points. */}
        <circle
          cx={px(best.degree)}
          cy={py(best.test)}
          r={15}
          fill="none"
          stroke={NEW_INK}
          strokeWidth={2.4}
          opacity={ease(frame, threeAt, 10)}
        />
      </svg>

      <Note at={threeAt + 2} x={px(best.degree) + 24} y={py(0.072) - 14}>
        <span style={{ ...note(22, NEW_INK), fontWeight: 650, whiteSpace: "nowrap", ...halo }}>
          lowest, {fmt(best.test, 3)} at degree {best.degree}
        </span>
      </Note>
      <Note at={zeroAt} x={X.x1 + 6} y={py(0) - 50} align="right" from="right">
        <span style={{ ...note(22, TRAIN_INK), fontWeight: 650, whiteSpace: "nowrap", ...halo }}>
          {fmt(last.train, 3)} at degree {last.degree}
        </span>
      </Note>
      <Note at={worseAt - 4} x={px(EXIT_DEGREE) + 24} y={box.top + 4}>
        <div style={{ ...note(24, NEW_INK), fontWeight: 700, whiteSpace: "nowrap", ...halo }}>
          {fmt(last.test, 1)} at degree {last.degree}, off the chart
        </div>
        <div style={{ ...note(21, INK_SOFT), marginTop: 6, whiteSpace: "nowrap", ...halo }}>
          {Math.round(RATIO)} times its lowest
        </div>
      </Note>

      <Note at={newAt + 10} x={1500} y={y(560)} width={310}>
        <span style={prose(20)}>
          The new points are {N_TEST.toLocaleString("en-US")} more draws from the same curve and noise. No fit saw
          them.
        </span>
      </Note>
    </AbsoluteFill>
  );
};
