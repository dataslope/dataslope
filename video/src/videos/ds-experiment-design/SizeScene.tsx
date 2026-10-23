import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { BAR, BLUE_INK, INK, INK_SOFT, PAPER, TABULAR, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { MONO } from "../../theme/fonts";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { SIZE } from "./data";
import { at, Axes, Curve, Drift, Mark, pulse, type Scale, Svg, WARM, WARM_INK, X0 } from "./parts";

const BOX = { left: 170, right: 1060, top: 512, bottom: 820 };
const COL_X = 1180;
const N_MAX = 30000;

/**
 * Question 6, on the page's own sample-size function: four inputs, only the
 * baseline from data. 10% converting, a 2-point lift, 5% alpha and 80% power
 * need 3,843 per arm; a 1-point lift needs 14,752, 3.84 times as many. The
 * curve is the same function across every MDE from 0.75 to 4 points.
 */
export const SizeScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  const from = n.beat("size").from;
  const qAt = n.word("size", "Question");
  const textAt = n.word("size", "How do you calculate");
  const inputsAt = n.word("size", "From four inputs");
  const inputAts = [
    n.word("size", "the baseline rate"),
    n.word("size", "the MDE"),
    n.word("size", "alpha, and power") - 2,
    n.word("size", "and power"),
  ];
  const dataAt = n.word("size", "Only the baseline comes from data");
  const choicesAt = n.word("size", "The other three are choices");
  const tenAt = n.word("size-n", "Ten percent convert today");
  const liftAt = n.word("size-n", "a two-point lift");
  const formulaAt = n.word("size-n", "The page's formula says");
  const twoAt = n.word("size-n", "three thousand eight hundred forty-three");
  const halveAt = n.word("size-n", "Halve the lift");
  const oneAt = n.word("size-n", "fourteen thousand seven hundred fifty-two");
  const fourAt = n.word("size-n", "nearly four times as many");
  const squaredAt = n.word("size-n", "one over the MDE squared");
  const directionAt = n.word("sides-in", "which direction counts");
  const clearAt = n.beat("sides-in").to - 6;

  const clear = 1 - ease(frame, clearAt, 10);
  const xs: Scale = { lo: 0.5, hi: 4, a: BOX.left, b: BOX.right };
  const ys: Scale = { lo: 0, hi: N_MAX, a: y(BOX.bottom), b: y(BOX.top) };
  const curve = SIZE.curve.filter(([m]) => m >= 0.75);
  const clip = { left: BOX.left - 6, right: BOX.right + 10, top: y(BOX.top) - 20, bottom: y(BOX.bottom) + 4 };

  const inputs = [
    { name: "baseline rate", value: "10%", valueAt: tenAt, data: true },
    { name: "MDE, minimum detectable effect", value: "2 points", valueAt: liftAt, data: false },
    { name: "alpha", value: "0.05", valueAt: formulaAt, data: false },
    { name: "power", value: "0.8", valueAt: formulaAt + 3, data: false },
  ];
  const widths = [230, 420, 130, 130];
  const lefts = widths.map((_, i) => X0 + widths.slice(0, i).reduce((a, b) => a + b + 24, 0));

  const points = [
    { m: 2, v: SIZE.two, at: twoAt, color: BAR },
    { m: 1, v: SIZE.one, at: oneAt, color: WARM },
  ];

  return (
    <AbsoluteFill style={{ opacity: clear }}>
      {inputAts.map((t, i) => (
        <Sfx key={i} name="el-tap" at={t} level={-38} />
      ))}
      <Sfx name="el-pencil" at={formulaAt} level={-36} />
      <Sfx name="el-pop" at={twoAt} level={-32} />
      <Sfx name="el-pop" at={oneAt} level={-32} />

      <Drift from={from} to={n.beat("sides-in").to + 30}>
        <QuestionCard n={6} at={qAt - 4} textAt={textAt - 4} size={58}>
          How do you calculate the sample size for an A/B test?
        </QuestionCard>

        {/* The four inputs, and where each comes from. */}
        <Note at={inputsAt - 2} x={X0} y={y(282)}>
          <span style={{ ...label(21, INK_SOFT), fontWeight: 700, whiteSpace: "nowrap" }}>four inputs</span>
        </Note>
        {inputs.map((c, i) => {
          const p = ease(frame, inputAts[i] - 2, 10);
          if (p <= 0) return null;
          const tagAt = c.data ? dataAt : choicesAt + i * 3;
          return (
            <React.Fragment key={c.name}>
              <div
                style={{
                  position: "absolute",
                  left: lefts[i],
                  top: y(318),
                  width: widths[i],
                  boxSizing: "border-box",
                  padding: "6px 0",
                  textAlign: "center",
                  borderRadius: 6,
                  border: `2px solid ${c.data ? BAR : INK}`,
                  background: PAPER,
                  ...note(23, INK),
                  fontWeight: 650,
                  whiteSpace: "nowrap",
                  opacity: p,
                  transform: `translateY(${(1 - p) * 10}px) scale(${1 + 0.05 * pulse(frame, inputAts[i], 14)})`,
                }}
              >
                {c.name}
              </div>
              <Note at={c.valueAt} x={lefts[i]} y={y(372)} width={widths[i]} style={{ textAlign: "center" }}>
                <span style={{ ...note(30, BLUE_INK), fontWeight: 700, whiteSpace: "nowrap", ...TABULAR }}>{c.value}</span>
              </Note>
              <Note at={tagAt} x={lefts[i]} y={y(418)} width={widths[i]} style={{ textAlign: "center" }}>
                <span style={{ ...label(20, c.data ? BLUE_INK : INK_SOFT), fontWeight: 700, whiteSpace: "nowrap" }}>
                  {c.data ? "from data" : "a choice"}
                </span>
              </Note>
            </React.Fragment>
          );
        })}

        {/* The page's function, at every MDE. */}
        <Axes
          x={xs}
          y={ys}
          xTicks={[1, 2, 3, 4]}
          yTicks={[0, 10000, 20000, 30000]}
          xFormat={(v) => `${v}`}
          yFormat={(v) => (v === 0 ? "0" : `${v / 1000}k`)}
          xTitle="MDE, points of conversion"
          yTitle="users per arm"
          at={tenAt - 4}
        />
        <Curve points={curve} x={xs} y={ys} at={formulaAt} dur={30} color={BAR} width={3.4} clip={clip} />
        <Svg>
          {points.map((p) => {
            const s = ease(frame, p.at - 2, 10);
            if (s <= 0) return null;
            return (
              <g key={p.m}>
                <line x1={at(xs, p.m)} x2={at(xs, p.m)} y1={y(BOX.bottom)} y2={at(ys, p.v)} stroke={p.color} strokeWidth={1.6} strokeDasharray="4 6" opacity={s} />
                <circle cx={at(xs, p.m)} cy={at(ys, p.v)} r={10 * s} fill={p.color} />
              </g>
            );
          })}
        </Svg>

        {/* The formula and its two answers. */}
        <Note at={formulaAt} x={COL_X} y={y(500)}>
          <span style={{ ...label(20, INK_SOFT), fontWeight: 700, whiteSpace: "nowrap" }}>the page&apos;s formula</span>
          <div style={{ fontFamily: MONO, fontSize: 21, fontWeight: 600, color: INK, marginTop: 8, whiteSpace: "pre", fontVariantLigatures: "none" }}>
            {"n = (z_α/2 + z_β)² · 2p̄(1 − p̄) / MDE²"}
          </div>
        </Note>
        <Note at={twoAt} x={COL_X} y={y(600)}>
          <span style={{ ...note(27, BLUE_INK), whiteSpace: "nowrap", ...TABULAR }}>
            10% → 12%: <b>{SIZE.two.toLocaleString("en-US")}</b> per arm
          </span>
        </Note>
        <Note at={oneAt} x={COL_X} y={y(650)}>
          <span style={{ ...note(27, WARM_INK), whiteSpace: "nowrap", ...TABULAR }}>
            <span style={{ opacity: ease(frame, halveAt, 8) }}>10% → 11%:</span> <b>{SIZE.one.toLocaleString("en-US")}</b> per arm
          </span>
        </Note>
        <Note at={fourAt} x={COL_X} y={y(700)}>
          <span style={{ ...note(27, INK), whiteSpace: "nowrap", ...TABULAR }}>
            half the lift, <b>×{SIZE.ratio}</b> the users
          </span>
        </Note>
        <Note at={squaredAt - 2} x={COL_X} y={y(770)}>
          <span style={{ ...note(36, INK), fontWeight: 700, whiteSpace: "nowrap" }}>
            <Mark at={directionAt - 6}>n ∝ 1 / MDE²</Mark>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
