import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { sx } from "../../editorial/charts";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, body, fmt, halo, headline, INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import {
  BEST,
  DEGREES,
  FOLDS,
  ILLUSTRATIONS,
  MAX_DEGREE,
  N_TRAIN,
  NEW_COLOR,
  NEW_INK,
  POINTS,
  row,
  SWEEP,
  TRAIN_COLOR,
  VIDEO,
} from "./data";
import { type Box, by, Curve, Dot, Grid, prose, toPage } from "./parts";

/** Panel a: one row per round, the twelve points left to right. */
const ROUND_Y = (i: number) => 384 + i * 84;
const DOT_X = (j: number) => 312 + j * 54;
const DOT_R = 12;
/** Panel b: the cross-validated error by degree. */
const X = { lo: 1, hi: MAX_DEGREE, x0: 1160, x1: 1770 };
const TOP_VALUE = 0.35;

const ROUNDS = Array.from({ length: FOLDS }, (_, k) => k);
const foldSizes = ROUNDS.map((k) => POINTS.filter((p) => p.fold === k).length);
const listed = (xs: readonly number[]) => `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;

/**
 * Hold-out and cross-validation: keep data back and score on it, or rotate a
 * held-out fold through the twelve training points. Panel b is the average
 * error over the five rounds, lowest at degree three as on the new points.
 */
export const CvScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = useNarration();
  const { y } = useLayout();

  const start = n.beat("holdout").from;
  const scoreAt = n.word("holdout", "score");
  const cvFrom = n.beat("cv").from;
  const splitAt = n.word("cv", "Split");
  const fourAt = n.word("cv", "Train on four");
  const fifthAt = n.word("cv", "fifth");
  const rotateAt = n.word("cv", "rotate");
  const resultFrom = n.beat("cvresult").from;
  const lowestAt = n.word("cvresult", "lowest");
  const againAt = n.word("cvresult", "again");

  const box: Box = { x: X, top: y(380), base: y(736), lo: 0, hi: TOP_VALUE };
  const cvPts = toPage(box, DEGREES, SWEEP.map((r) => r.cv));
  const cvReveal = X.x0 + (X.x1 - X.x0 + 10) * ease(frame, resultFrom - 4, 30);
  const best = row(BEST.cv);
  const box2 = pop(frame, start + 2, fps, 16);

  /** When round k's held-out fold turns orange: the first on "fifth", the
   *  rest one after another up to "rotate". */
  const heldAt = (k: number) => (k === 0 ? fifthAt - 2 : rotateAt - 6 + (k - 1) * 7);

  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 116, top: y(104), display: "flex", gap: "0.26em", ...headline(56) }}>
        <Ink at={start - 12} dur={20} style={{ position: "relative", whiteSpace: "nowrap" }}>
          Keep some data back,
        </Ink>
        <Ink
          at={scoreAt - 4}
          dur={18}
          style={{ position: "relative", ...headline(56, true), color: ACCENT_INK, whiteSpace: "nowrap" }}
        >
          and score the model on that.
        </Ink>
      </div>
      {ILLUSTRATIONS ? (
        <Illustration
          video={VIDEO}
          id="overfitting-strongbox"
          style={{
            position: "absolute",
            left: 1500,
            top: y(84),
            width: 300,
            height: y(290) - y(84),
            opacity: box2,
            transform: `translateY(${bob(frame, 5, 110) + (1 - box2) * 30}px)`,
          }}
        />
      ) : null}

      <FigLabel n="3" title={`Five-fold cross-validation on the ${N_TRAIN} training points`} at={cvFrom - 6} x={120} y={y(232)} />

      {/* a: who is held out in each round. */}
      <Ink at={splitAt - 8} dur={14} style={{ left: 120, top: y(300), display: "flex", alignItems: "baseline", gap: 14 }}>
        <span style={label(22, INK_SOFT)}>a</span>
        <span style={{ ...body(30, true), color: INK }}>Who is held out, round by round</span>
      </Ink>
      {ROUNDS.map((k) => {
        const rowAt = splitAt + k * 4;
        const cy = y(ROUND_Y(k));
        const held = ease(frame, heldAt(k), 10);
        return (
          <React.Fragment key={k}>
            <Ink at={rowAt - 2} dur={12} style={{ left: 120, top: cy - 15 }}>
              <span style={{ ...label(21, INK_SOFT), whiteSpace: "nowrap" }}>Round {k + 1}</span>
            </Ink>
            <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
              {POINTS.map((p, j) => {
                const s = pop(frame, rowAt + j, fps, 14);
                if (s <= 0) return null;
                const out = p.fold === k;
                return (
                  <g key={j}>
                    <circle cx={DOT_X(j)} cy={cy} r={DOT_R * s} fill={TRAIN_COLOR} stroke={PAPER} strokeWidth={2} />
                    {out && held > 0 ? <circle cx={DOT_X(j)} cy={cy} r={DOT_R * s * held} fill={NEW_COLOR} /> : null}
                  </g>
                );
              })}
            </svg>
          </React.Fragment>
        );
      })}
      <Note at={fourAt - 4} x={DOT_X(0) - DOT_R} y={y(ROUND_Y(FOLDS - 1)) + 44}>
        <span style={{ ...note(21, INK_SOFT), display: "inline-flex", alignItems: "center", gap: 10, whiteSpace: "nowrap" }}>
          <Dot color={TRAIN_COLOR} /> fitted on
          <span style={{ width: 22 }} />
          <span style={{ display: "inline-flex", alignItems: "center", gap: 10, opacity: ease(frame, fifthAt - 2, 10) }}>
            <Dot color={NEW_COLOR} /> scored on
          </span>
        </span>
      </Note>

      {/* b: the error averaged over the five rounds. */}
      <Ink at={rotateAt - 4} dur={14} style={{ left: 1080, top: y(300), display: "flex", alignItems: "baseline", gap: 14 }}>
        <span style={label(22, INK_SOFT)}>b</span>
        <span style={{ ...body(30, true), color: INK }}>Average error on the held-out fold</span>
      </Ink>
      <Grid
        box={box}
        yTicks={[0, 0.1, 0.2, 0.3]}
        yFormat={(v) => (v === 0 ? "0" : fmt(v, 1))}
        xTicks={DEGREES}
        at={rotateAt}
      />
      <Ink at={rotateAt + 6} dur={14} style={{ left: X.x0, top: box.base + 52, width: X.x1 - X.x0, textAlign: "center" }}>
        <span style={label(20, INK_SOFT)}>Polynomial degree</span>
      </Ink>
      <Curve id="of-cv" pts={cvPts} box={box} reveal={cvReveal} color={NEW_COLOR} width={4} />
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        {SWEEP.map((r, i) => {
          const [cx, cy] = cvPts[i];
          if (r.cv > TOP_VALUE || cvReveal <= X.x0 + 0.5 || cx > cvReveal) return null;
          return <circle key={r.degree} cx={cx} cy={cy} r={6.5} fill={NEW_COLOR} stroke={PAPER} strokeWidth={2} />;
        })}
        <circle
          cx={sx(X, best.degree)}
          cy={by(box, best.cv)}
          r={14}
          fill="none"
          stroke={NEW_INK}
          strokeWidth={2.4}
          opacity={ease(frame, lowestAt, 10)}
        />
      </svg>
      <Note at={lowestAt + 2} x={sx(X, best.degree) + 22} y={by(box, 0.026) - 13}>
        <span style={{ ...note(22, NEW_INK), fontWeight: 650, whiteSpace: "nowrap", ...halo }}>
          lowest, {fmt(best.cv, 3)} at degree {best.degree}
        </span>
      </Note>
      <Note at={againAt} x={X.x1 + 6} y={box.top + 4} align="right" from="right">
        <span style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap", ...halo }}>
          the new points agree: degree {BEST.test}
        </span>
      </Note>

      <Note at={fourAt + 6} x={120} y={y(860)}>
        <span style={prose(20)}>
          scikit-learn KFold, shuffled with seed 0. The rounds hold out {listed(foldSizes)} points.
        </span>
      </Note>
    </AbsoluteFill>
  );
};
