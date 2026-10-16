import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { sx } from "../../editorial/charts";
import { useLayout } from "../../editorial/layout";
import {
  ACCENT_INK,
  fmt,
  halo,
  headline,
  HIGHLIGHT,
  INK,
  INK_SOFT,
  body,
  label,
  note,
  PAPER,
} from "../../editorial/style";
import { FigLabel, Ink, Leader, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import {
  FIT_COLOR,
  FIT_INK,
  FITS,
  GRID,
  ILLUSTRATIONS,
  N_TRAIN,
  POINTS,
  row,
  SHOWN,
  type Shown,
  signed,
  TRAIN_COLOR,
  TRUTH,
  VIDEO,
} from "./data";
import { type Box, by, Curve, Grid, prose, Swatch, toPage } from "./parts";

const X = { lo: 0, hi: 4, x0: 210, x1: 1250 };
const Y_LO = -1.5;
const Y_HI = 1.5;
/** The right-hand column: the training error of each fit as it is drawn. */
const COL_X = 1370;
const COL_W = 440;
const ROW_Y: Record<Shown, number> = { 1: 506, 3: 604, 11: 702 };
const WORDS: Record<Shown, string> = { 1: "too stiff", 3: "follows the curve", 11: "through every point" };

/**
 * Hook, sample and the three fits: twelve noisy points, a line, a cubic and a
 * degree-eleven polynomial that passes through every point and leaves the
 * chart past both ends. The column at the right keeps each fit's training
 * error.
 */
export const FitScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = useNarration();
  const { y } = useLayout();

  const hookAt = n.beat("hook").from;
  const failAt = n.word("hook", "still fail");
  const nameAt = n.word("hook", "overfitting");
  const sampleFrom = n.beat("sample").from;
  const pointsAt = n.word("sample", "twelve points");
  const curveAt = n.word("sample", "smooth curve");
  const noiseAt = n.word("sample", "noise");
  const lineAt = n.word("line", "straight line");
  const cubicAt = n.word("cubic", "Degree three");
  const elevenAt = n.word("eleven", "Degree eleven");
  const zeroAt = n.word("eleven", "zero");
  const wobbleAt = n.word("eleven", "wobbles");
  const offAt = n.word("eleven", "flies off");
  const fitAt: Record<Shown, number> = { 1: lineAt, 3: cubicAt, 11: elevenAt };

  const box: Box = { x: X, top: y(420), base: y(840), lo: Y_LO, hi: Y_HI };
  const px = (v: number) => sx(X, v);
  const py = (v: number) => by(box, v);
  const sweep = (at: number, dur = 24) => X.x0 + (X.x1 - X.x0) * ease(frame, at, dur);

  const truthPts = toPage(box, GRID, TRUTH);
  const fitPts = (d: Shown) => toPage(box, GRID, FITS[d]);
  // Each fit steps back when the next one is drawn.
  const fade: Record<Shown, number> = {
    1: 1 - 0.78 * ease(frame, cubicAt, 12),
    3: 1 - 0.72 * ease(frame, elevenAt, 12),
    11: 1,
  };
  const noise = ease(frame, noiseAt - 2, 12) * (1 - ease(frame, lineAt - 6, 10));
  const cards = pop(frame, hookAt + 4, fps, 16);

  // Where the degree-eleven curve wobbles hardest between two points.
  const wobbleX = 3.4;
  const wobbleY = FITS[11][GRID.findIndex((g) => g >= wobbleX)];

  return (
    <AbsoluteFill>
      <Ink at={nameAt - 4} dur={14} style={{ left: 120, top: y(104) }}>
        <span style={label(22, ACCENT_INK)}>Overfitting</span>
      </Ink>
      <Ink at={hookAt - 6} dur={20} style={{ left: 114, top: y(148), ...headline(76), whiteSpace: "nowrap" }}>
        Perfect on the data it learned,
      </Ink>
      <Ink
        at={failAt - 4}
        dur={20}
        style={{ left: 114, top: y(232), ...headline(76, true), color: ACCENT_INK, whiteSpace: "nowrap" }}
      >
        wrong on data it hasn’t seen.
      </Ink>
      {ILLUSTRATIONS ? (
        <Illustration
          video={VIDEO}
          id="overfitting-flashcards"
          style={{
            position: "absolute",
            left: 1450,
            top: y(92),
            width: 360,
            height: y(330) - y(92),
            opacity: cards,
            transform: `translateY(${bob(frame, 5, 110) + (1 - cards) * 30}px)`,
          }}
        />
      ) : null}

      <FigLabel n="1" title="Polynomials fitted to twelve noisy points" at={sampleFrom - 8} x={120} y={y(358)} />
      <Grid
        box={box}
        yTicks={[-1, 0, 1]}
        yFormat={(v) => signed(v)}
        xTicks={[0, 1, 2, 3, 4]}
        at={sampleFrom - 4}
      />

      {/* The curve the points came from, and how far the noise moved each. */}
      <Curve id="of-truth" pts={truthPts} box={box} reveal={sweep(curveAt - 2, 26)} color={INK_SOFT} width={2.4} dash="9 8" />
      <Note at={curveAt + 12} x={px(1.05) - 200} y={py(1.0) - 58} width={400} style={{ textAlign: "center" }} from="up">
        <span style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap", ...halo }}>the curve they came from</span>
      </Note>
      {noise > 0 ? (
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: noise }}>
          {POINTS.map((p) => (
            <line
              key={p.x}
              x1={px(p.x)}
              x2={px(p.x)}
              y1={py(p.truth)}
              y2={py(p.y)}
              stroke={INK_SOFT}
              strokeWidth={2}
            />
          ))}
        </svg>
      ) : null}

      {SHOWN.map((d) => (
        <Curve
          key={d}
          id={`of-fit-${d}`}
          pts={fitPts(d)}
          box={box}
          reveal={sweep(fitAt[d] - 2, d === 11 ? 30 : 22)}
          color={FIT_COLOR[d]}
          width={d === 11 ? 4.5 : 4}
          opacity={fade[d]}
        />
      ))}

      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        {POINTS.map((p, i) => {
          const s = pop(frame, pointsAt + i * 2, fps, 14);
          if (s <= 0) return null;
          return <circle key={p.x} cx={px(p.x)} cy={py(p.y)} r={9 * s} fill={TRAIN_COLOR} stroke={PAPER} strokeWidth={2.5} />;
        })}
      </svg>

      {/* What the degree-eleven curve does between and past the points. */}
      <Note at={wobbleAt} x={px(3.64)} y={py(0.62)} align="right" from="up">
        <span style={{ ...note(21, ACCENT_INK), fontWeight: 600, whiteSpace: "nowrap", ...halo }}>
          wobbles between points
        </span>
      </Note>
      <Leader
        points={[
          [px(wobbleX), py(0.3)],
          [px(wobbleX), py(wobbleY) - 10],
        ]}
        at={wobbleAt + 4}
        dur={10}
        color={ACCENT_INK}
      />
      <Note at={offAt} x={px(3.68)} y={box.top + 6} align="right" from="right">
        <span style={{ ...note(21, ACCENT_INK), fontWeight: 600, whiteSpace: "nowrap", ...halo }}>off the chart</span>
      </Note>
      <Note at={offAt + 4} x={px(0.24)} y={box.base - 40}>
        <span style={{ ...note(21, ACCENT_INK), fontWeight: 600, whiteSpace: "nowrap", ...halo }}>off the chart</span>
      </Note>

      {/* The training error of each fit, in the order they are drawn. */}
      <Ink at={lineAt - 8} dur={14} style={{ left: COL_X, top: y(420), width: COL_W }}>
        <div style={label(22, INK)}>Training error</div>
        <div style={{ ...note(20, INK_SOFT), marginTop: 6 }}>Mean squared error on the {N_TRAIN} points</div>
        <div style={{ height: 1.6, background: INK, marginTop: 14 }} />
      </Ink>
      {SHOWN.map((d) => {
        const zero = d === 11 ? ease(frame, zeroAt - 2, 12) : 0;
        return (
          <Ink key={d} at={fitAt[d] + 2} dur={16} style={{ left: COL_X, top: y(ROW_Y[d]), width: COL_W }}>
            <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
              <Swatch color={FIT_COLOR[d]} />
              <div>
                <div style={{ ...body(34), color: INK, lineHeight: 1.1 }}>Degree {d}</div>
                <div style={{ ...note(20, INK_SOFT), marginTop: 4 }}>{WORDS[d]}</div>
              </div>
              <div style={{ flex: 1 }} />
              <div style={{ position: "relative", ...headline(46), color: FIT_INK[d] }}>
                <div
                  style={{
                    position: "absolute",
                    left: -8,
                    top: "0.08em",
                    height: "0.92em",
                    width: `calc(${zero * 100}% + 16px)`,
                    background: HIGHLIGHT,
                    opacity: zero > 0 ? 1 : 0,
                  }}
                />
                <span style={{ position: "relative" }}>{fmt(row(d).train, 3)}</span>
              </div>
            </div>
          </Ink>
        );
      })}
      <Note at={lineAt + 8} x={COL_X} y={y(806)} width={COL_W}>
        <span style={prose(20)}>
          Points from sin 1.5x plus noise with a standard deviation of 0.25. Least-squares fits, scikit-learn.
        </span>
      </Note>
    </AbsoluteFill>
  );
};
