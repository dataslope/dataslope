import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import {
  ACCENT,
  ACCENT_INK,
  BAR,
  HAIRLINE,
  INK,
  INK_SOFT,
  PAPER,
  TABULAR,
  fmt,
  label,
  note,
  svgText,
} from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ADA, ENS, FOREST } from "./data";
import {
  at,
  type Box,
  C0,
  CLASS,
  Curve,
  Drift,
  Frame,
  Mark,
  mulberry32,
  OK,
  OK_INK,
  Points,
  pulse,
  type Scale,
  scales,
  Svg,
  X0,
} from "./parts";

// ── Question 5's figure ──
const CELL = 54;
const GAP = 10;
const COLS = 6;
const GRID_TOP = 390;
const BARS_X = 780;
const BARS_W = 960;
const LO = 85;
const HI = 100;

/** Random handfuls of the thirty features, one per split shown. */
const SUBSETS = (() => {
  const rand = mulberry32(30);
  return Array.from({ length: 12 }, () => {
    const pick = new Set<number>();
    while (pick.size < FOREST.tried)
      pick.add(Math.floor(rand() * FOREST.features));
    return pick;
  });
})();

// ── Question 6's figure ──
const ADA_BOX = { left: X0 + 20, width: 760, top: 370, height: 440 };
const pad = (lo: number, hi: number, k = 0.12): [number, number] => [
  lo - (hi - lo) * k,
  hi + (hi - lo) * k,
];
const AX = pad(Math.min(...ADA.x), Math.max(...ADA.x));
const AY = pad(Math.min(...ADA.y), Math.max(...ADA.y), 0.16);
const MAX_W = Math.max(...ADA.final);
const radius = (w: number) => 22 * Math.sqrt(w / MAX_W);
const COL = 1060;
/** Question 4's sine wave, for gradient boosting's half of question 6. */
const SINE_X: [number, number] = [0, 6];
const SINE_Y: [number, number] = [-1.8, 1.8];
const sineLine = (ys: readonly number[]) =>
  ENS.grid.map((x, i) => [x, ys[i]] as const);
/** A score to one decimal, so the three read alike: 0.93 → "93.0%". */
const pct1 = (v: number) => `${(v * 100).toFixed(1)}%`;

/**
 * Questions 5 and 6. A forest's thirty features with a different handful
 * lit at each split, and the three scores on held-out tumors, as dots on a
 * zoomed axis (a bar from 85% would double the gap). Then gradient boosting
 * on question 4's sine wave: the fit after one tree, and in red what the next
 * tree is fitted to. Then AdaBoost by hand on twenty-four moons in the same
 * box: each round's stump, the points it got wrong ringed, and every point
 * drawn at its weight, so the hard ones swell.
 */
export const ForestScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("forest").from;
  const qAt = n.word("forest", "Question five");
  const textAt = n.word("forest", "How does a random forest work");
  const asked = n.word("forest", "bagged trees with one more twist");
  const splitAt = n.word("forest", "at every split");
  const fiveAt = n.word("forest", "five of thirty");
  const sqrtAt = n.word("forest-sqrt", "the square root");
  const sameAt = n.word("forest-why", "stop all making the same cuts");
  const overlapAt = n.word("forest-why", "mistakes overlap less");
  const heldAt = n.word("forest-why", "held-out tumors");
  const oneAt = n.word("forest-why", "one tree scores");
  const baggedAt = n.word("forest-why", "bagged trees ninety-three");
  const forestAt = n.word("forest-why", "the forest ninety-five");
  const q6At = n.word("ada", "Question six");
  const q6TextAt = n.word("ada", "How does gradient boosting differ");
  const gbAt = n.word("gb", "Gradient boosting fits each new tree");
  const negAt = n.word("gb", "the negative gradient of the loss");
  const pseudoAt = n.word("gb", "the pseudo-residuals");
  const residAt = n.word("gb", "just the residuals");
  const anyAt = n.word("gb", "any differentiable loss");
  const adaAt = n.word("adaboost", "AdaBoost, short for adaptive boosting");
  const reweightAt = n.word("adaboost", "re-weights the data instead");
  const wrongAt = n.word("adaboost", "the points it got wrong");
  const countAt = n.word("adaboost", "count for more");
  const threeAt = n.word("adaboost", "After three rounds");
  const thisAt = n.word("adaboost", "this point carries");
  const expAt = n.word("adaboost", "an exponential loss");
  const backAt = n.word("knn-in", "Back to the border");
  const clearAt = n.word("knn-in", "the data");
  const end = n.beat("knn-in").to;
  const out5 = q6At - 4;

  // ── 5: which handful is lit, changing every 16 frames from the first split
  // until the scores are read, so it does not flicker beside them ──
  const k = Math.max(0, Math.floor((Math.min(frame, heldAt) - splitAt) / 16));
  const lit = SUBSETS[k % SUBSETS.length];
  const gridOn = ease(frame, asked - 2, 12) * (1 - ease(frame, out5, 10));
  const subsetOn = ease(frame, splitAt, 8);
  const bars = [
    {
      name: "one tree",
      v: FOREST.tree,
      at: oneAt,
      color: ACCENT,
      ink: ACCENT_INK,
    },
    {
      name: "300 bagged trees",
      v: FOREST.bagged,
      at: baggedAt,
      color: BAR,
      ink: INK,
    },
    {
      name: "random forest",
      v: FOREST.forest,
      at: forestAt,
      color: OK,
      ink: OK_INK,
    },
  ];
  const xb: Scale = { lo: LO, hi: HI, a: BARS_X + 240, b: BARS_X + BARS_W };

  // ── 6: AdaBoost ──
  const box: Box = {
    left: ADA_BOX.left,
    top: y(ADA_BOX.top),
    width: ADA_BOX.width,
    height: h(ADA_BOX.height),
  };
  const { x: ax, y: ay } = scales(box, AX, AY);
  const round2At = countAt + 22;
  const stages = [
    { at: countAt + 4, w: ADA.rounds[1].weights },
    { at: round2At + 6, w: ADA.rounds[2].weights },
    { at: threeAt + 2, w: ADA.final },
  ];
  const weightOf = (i: number) => {
    let w = ADA.rounds[0].weights[i];
    for (const s of stages) w += (s.w[i] - w) * ease(frame, s.at, 16);
    return w;
  };
  const stumpAt = [reweightAt + 2, round2At, threeAt - 4];
  const heaviest = ADA.final.indexOf(MAX_W);
  const lightest = Math.min(...ADA.final);
  const adaOn = ease(frame, adaAt - 2, 12);
  // Gradient boosting's half: question 4's sine wave in the same box, until
  // AdaBoost's points take it over.
  const { x: gx, y: gy } = scales(box, SINE_X, SINE_Y);
  const gbOut = adaAt - 8;
  const residOn = ease(frame, negAt + 4, 12) * (1 - ease(frame, gbOut, 10));

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={splitAt} level={-35} />
      <Sfx name="el-tap" at={fiveAt} level={-35} />
      {bars.map((b) => (
        <Sfx key={b.name} name="el-pop" at={b.at + 2} level={-33} />
      ))}
      <Sfx name="el-pencil" at={reweightAt + 2} level={-34} />
      <Sfx name="el-scratch" at={wrongAt + 2} level={-33} />
      <Sfx name="el-whoosh" at={countAt + 4} level={-36} />
      <Sfx name="el-chime" at={thisAt} level={-36} />

      <AbsoluteFill style={{ opacity: 1 - ease(frame, clearAt + 6, 10) }}>
        <Drift from={from} to={end + 40}>
          <QuestionCard
            n={5}
            at={qAt - 4}
            textAt={textAt - 4}
            out={out5}
            size={60}
          >
            How does a random forest work?
          </QuestionCard>
          <QuestionCard n={6} at={q6At} textAt={q6TextAt - 2} size={60}>
            How does gradient boosting differ from AdaBoost?
          </QuestionCard>

          {/* ── 5: thirty features, a handful per split ── */}
          <div
            style={{
              position: "absolute",
              left: X0,
              top: y(GRID_TOP) - h(46),
              opacity: gridOn,
              ...label(22, INK),
              fontWeight: 650,
              whiteSpace: "nowrap",
            }}
          >
            the tumor data&apos;s {FOREST.features} features
          </div>
          {Array.from({ length: FOREST.features }, (_, i) => {
            const on = lit.has(i) ? subsetOn : 0;
            const p = ease(frame, asked - 2 + i * 0.6, 8);
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: X0 + (i % COLS) * (CELL + GAP),
                  top: y(GRID_TOP) + Math.floor(i / COLS) * h(CELL + GAP),
                  width: CELL,
                  height: h(CELL),
                  borderRadius: 8,
                  boxSizing: "border-box",
                  border: `2px solid ${on > 0.5 ? BAR : HAIRLINE}`,
                  background:
                    on > 0.5
                      ? `color-mix(in srgb, ${BAR} 70%, ${PAPER})`
                      : PAPER,
                  opacity: gridOn * p,
                }}
              />
            );
          })}
          <Note
            at={fiveAt}
            x={X0}
            y={y(GRID_TOP) + 5 * h(CELL + GAP) + h(10)}
            out={out5}
          >
            <span
              style={{
                ...note(25, INK),
                fontWeight: 650,
                whiteSpace: "nowrap",
                ...TABULAR,
              }}
            >
              <Mark at={fiveAt + 2}>
                {FOREST.tried} of {FOREST.features}
              </Mark>{" "}
              at each split, a new handful
            </span>
          </Note>
          <Note
            at={sqrtAt}
            x={X0}
            y={y(GRID_TOP) + 5 * h(CELL + GAP) + h(52)}
            out={out5}
          >
            <span
              style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap", ...TABULAR }}
            >
              the usual default: about √{FOREST.features} ≈{" "}
              {fmt(Math.sqrt(FOREST.features), 1)}
            </span>
          </Note>
          <Note
            at={sameAt}
            x={X0}
            y={y(GRID_TOP) + 5 * h(CELL + GAP) + h(100)}
            out={out5}
          >
            <span style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap" }}>
              so the trees stop making the same cuts,
            </span>
          </Note>
          <Note
            at={overlapAt}
            x={X0}
            y={y(GRID_TOP) + 5 * h(CELL + GAP) + h(136)}
            out={out5}
          >
            <span style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap" }}>
              and their mistakes overlap less
            </span>
          </Note>

          <Note at={heldAt} x={BARS_X} y={y(GRID_TOP) - h(46)} out={out5}>
            <span
              style={{
                ...label(22, INK),
                fontWeight: 650,
                whiteSpace: "nowrap",
              }}
            >
              accuracy on {FOREST.nTest} held-out tumors
            </span>
          </Note>
          <Svg opacity={ease(frame, heldAt, 12) * (1 - ease(frame, out5, 10))}>
            {[85, 90, 95, 100].map((v) => (
              <g key={v}>
                <line
                  x1={at(xb, v)}
                  x2={at(xb, v)}
                  y1={y(GRID_TOP)}
                  y2={y(GRID_TOP) + h(300)}
                  stroke={INK_SOFT}
                  strokeWidth={1}
                  strokeDasharray="2 6"
                  opacity={0.6}
                />
                <text
                  x={at(xb, v)}
                  y={y(GRID_TOP) + h(300) + 26}
                  textAnchor="middle"
                  style={svgText({ ...label(19, INK_SOFT), ...TABULAR })}
                >
                  {v}%
                </text>
              </g>
            ))}
          </Svg>
          {/* A dot at each score, not a bar: the axis starts at 85%, and a
              bar's length from there would read as twice the gain. */}
          {bars.map((b, i) => {
            const p = ease(frame, b.at, 16) * (1 - ease(frame, out5, 10));
            const top = y(GRID_TOP) + h(20) + i * h(96);
            const cy = top + h(26);
            const cx = at(xb, b.v * 100);
            return (
              <React.Fragment key={b.name}>
                <div
                  style={{
                    position: "absolute",
                    left: BARS_X,
                    top: top + h(10),
                    opacity: p,
                    ...note(24, INK),
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                  }}
                >
                  {b.name}
                </div>
                <Svg opacity={p}>
                  <circle
                    cx={cx}
                    cy={cy}
                    r={13 * p + 3 * pulse(frame, b.at + 2, 16)}
                    fill={b.color}
                    stroke={PAPER}
                    strokeWidth={2}
                  />
                </Svg>
                <div
                  style={{
                    position: "absolute",
                    left: cx + 26,
                    top: top + h(8),
                    opacity: p,
                    ...note(28, b.ink),
                    fontWeight: 700,
                    ...TABULAR,
                  }}
                >
                  {pct1(b.v)}
                </div>
              </React.Fragment>
            );
          })}

          {/* ── 6: gradient boosting, on question 4's sine wave ── */}
          <Frame box={box} at={gbAt - 2} />
          <Note at={gbAt} x={box.left} y={box.top - h(40)} out={gbOut}>
            <span
              style={{
                ...label(21, INK),
                fontWeight: 650,
                whiteSpace: "nowrap",
              }}
            >
              question 4&apos;s sine wave: the fit after one tree
            </span>
          </Note>
          <Points
            xs={ENS.x}
            ys={ENS.y}
            sx={gx}
            sy={gy}
            at={gbAt}
            spread={14}
            r={5.5}
            opacity={0.75}
            out={gbOut}
          />
          <Curve
            points={sineLine(ENS.stages["1"])}
            x={gx}
            y={gy}
            at={gbAt + 6}
            dur={16}
            color={C0}
            width={2.8}
            out={gbOut}
            clip={box}
          />
          <Svg opacity={residOn}>
            {ENS.x.map((x, i) => (
              <line
                key={i}
                x1={at(gx, x)}
                x2={at(gx, x)}
                y1={at(gy, ENS.y[i])}
                y2={at(gy, ENS.fit1[i])}
                stroke={ACCENT}
                strokeWidth={2}
                opacity={0.8}
              />
            ))}
          </Svg>
          <Note
            at={negAt + 4}
            x={box.left}
            y={box.top + box.height + h(14)}
            out={gbOut}
          >
            <span style={{ ...label(21, ACCENT_INK), whiteSpace: "nowrap" }}>
              red: the negative gradient, what the next tree is fitted to
            </span>
          </Note>

          {/* ── 6: AdaBoost by hand ── */}
          <Svg opacity={adaOn}>
            {ADA.rounds.map((r, i) => {
              const p = ease(frame, stumpAt[i], 14);
              const dim = i < 2 ? ease(frame, stumpAt[i + 1], 12) * 0.65 : 0;
              if (p <= 0) return null;
              const horizontal = r.feature === 1;
              const c = horizontal ? at(ay, r.threshold) : at(ax, r.threshold);
              return horizontal ? (
                <line
                  key={i}
                  x1={box.left}
                  x2={box.left + box.width * p}
                  y1={c}
                  y2={c}
                  stroke={INK}
                  strokeWidth={2.4}
                  strokeDasharray="8 6"
                  opacity={1 - dim}
                />
              ) : (
                <line
                  key={i}
                  x1={c}
                  x2={c}
                  y1={box.top}
                  y2={box.top + box.height * p}
                  stroke={INK}
                  strokeWidth={2.4}
                  strokeDasharray="8 6"
                  opacity={1 - dim}
                />
              );
            })}
            {ADA.x.map((x, i) => {
              const s = ease(frame, adaAt + i * 0.7, 8);
              if (s <= 0) return null;
              return (
                <circle
                  key={i}
                  cx={at(ax, x)}
                  cy={at(ay, ADA.y[i])}
                  r={radius(weightOf(i)) * s}
                  fill={CLASS[ADA.label[i]]}
                  opacity={0.82}
                  stroke={PAPER}
                  strokeWidth={1.6}
                />
              );
            })}
            {ADA.rounds[0].wrong.map((i) => (
              <circle
                key={i}
                cx={at(ax, ADA.x[i])}
                cy={at(ay, ADA.y[i])}
                r={radius(weightOf(i)) + 8}
                fill="none"
                stroke={ACCENT}
                strokeWidth={3}
                opacity={
                  ease(frame, wrongAt + 2, 10) * (1 - ease(frame, round2At, 10))
                }
              />
            ))}
            <circle
              cx={at(ax, ADA.x[heaviest])}
              cy={at(ay, ADA.y[heaviest])}
              r={radius(MAX_W) + 10 + 4 * pulse(frame, thisAt + 4, 20)}
              fill="none"
              stroke={ACCENT}
              strokeWidth={3.4}
              opacity={ease(frame, thisAt, 10)}
            />
          </Svg>
          <Note at={reweightAt + 2} x={box.left} y={box.top - h(40)}>
            <span
              style={{
                ...label(21, INK),
                fontWeight: 650,
                whiteSpace: "nowrap",
              }}
            >
              24 points, each drawn at its weight; dashed: each round&apos;s
              one-split tree
            </span>
          </Note>
          {/* Under the box, not beside the point: inside it, the label hid a
              point and crossed a stump on either side. */}
          <Note
            at={thisAt + 4}
            x={box.left}
            y={box.top + box.height + h(14)}
          >
            <span
              style={{
                ...note(25, ACCENT_INK),
                fontWeight: 700,
                whiteSpace: "nowrap",
              }}
            >
              ringed: <span style={TABULAR}>{Math.round(MAX_W / lightest)}×</span>{" "}
              the weight of the lightest point
            </span>
          </Note>

          <Note at={gbAt} x={COL} y={y(370)}>
            <span
              style={{
                ...note(28, INK),
                fontWeight: 700,
                whiteSpace: "nowrap",
              }}
            >
              Gradient boosting
            </span>
          </Note>
          <Note at={gbAt + 4} x={COL} y={y(370) + h(48)}>
            <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
              each new tree fits the{" "}
              <Mark at={negAt + 2}>negative gradient</Mark> of the loss
            </span>
          </Note>
          <Note at={pseudoAt} x={COL} y={y(370) + h(86)}>
            <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>
              the pseudo-residuals;{" "}
              <span style={{ opacity: ease(frame, residAt, 10) }}>
                for squared error, the residuals
              </span>
            </span>
          </Note>
          <Note at={anyAt} x={COL} y={y(370) + h(122)}>
            <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>
              but any differentiable loss will do
            </span>
          </Note>
          <Note at={adaAt} x={COL} y={y(590)}>
            <span
              style={{
                ...note(28, INK),
                fontWeight: 700,
                whiteSpace: "nowrap",
              }}
            >
              AdaBoost (adaptive boosting)
            </span>
          </Note>
          <Note at={reweightAt} x={COL} y={y(590) + h(48)}>
            <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
              re-weights the data:{" "}
              <span
                style={{ color: ACCENT_INK, opacity: ease(frame, wrongAt, 10) }}
              >
                the misses count for more
              </span>
            </span>
          </Note>
          <Note at={expAt} x={COL} y={y(590) + h(100)}>
            <span
              style={{
                ...note(24, OK_INK),
                fontWeight: 650,
                whiteSpace: "nowrap",
              }}
            >
              <Mark at={backAt}>= gradient boosting with exponential loss</Mark>
            </span>
          </Note>
        </Drift>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
