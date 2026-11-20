import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { OK, QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { label, note, TABULAR } from "../../editorial/style";
import { ColumnRule } from "../../editorial/ui";
import { ds, inkOf } from "../../theme/brand";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ACTIVATIONS } from "./data";
import { ACCENT_INK, at, BAR, Drift, HIGHLIGHT, INK, INK_SOFT, Line, LOOK, Mark, Node, type Scale, Svg, Tag } from "./parts";
import { I, MathRun } from "../../editorial/math";

const COL_X = [120, 700, 1280] as const;
const COL_W = 440;
const C = ACTIVATIONS.curves;
/** Leaky ReLU drawn with a slope of 0.1 below zero, ten times the usual
 *  0.01, which at this scale would sit on ReLU's own line; labelled so. */
const LEAKY_SLOPE = 0.1;
const LEAKY = C.z.map((z) => (z < 0 ? LEAKY_SLOPE * z : z));
const TEAL = ds("teal", 500);
const PURPLE = ds("purple", 500);

type Plot = { x: Scale; y: Scale };

/** A curve through (z, v) pairs on a plot, drawn along its length from `from`. */
const Curve: React.FC<{ plot: Plot; values: readonly number[]; from: number; color: string; width?: number; dur?: number; dash?: string; clip?: [number, number] }> = ({
  plot,
  values,
  from,
  color,
  width = 3,
  dur = 22,
  dash,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, from, dur);
  if (p <= 0) return null;
  const path = C.z.map((z, i) => `${i ? "L" : "M"}${at(plot.x, z).toFixed(1)},${at(plot.y, values[i]).toFixed(1)}`).join(" ");
  return (
    <path
      d={path}
      fill="none"
      stroke={color}
      strokeWidth={width}
      strokeLinejoin="round"
      strokeLinecap="round"
      pathLength={dash ? undefined : 1}
      strokeDasharray={dash ?? `${p} 1`}
      opacity={dash ? p : 1}
    />
  );
};

/** A plot's frame: the zero line, the z = 0 line, and two value ticks. */
const Frame: React.FC<{ plot: Plot; from: number; ticks: number[] }> = ({ plot, from, ticks }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, from, 12);
  return (
    <g opacity={p}>
      <line x1={plot.x.a} x2={plot.x.b} y1={at(plot.y, 0)} y2={at(plot.y, 0)} stroke={INK} strokeWidth={1.4} />
      <line x1={at(plot.x, 0)} x2={at(plot.x, 0)} y1={plot.y.b} y2={plot.y.a} stroke={INK_SOFT} strokeWidth={1} strokeDasharray="3 5" />
      {ticks.map((v) => (
        <text key={v} x={plot.x.a - 10} y={at(plot.y, v) + 7} textAnchor="end" style={{ ...label(20, INK_SOFT), fill: INK_SOFT, ...TABULAR }}>
          {v < 0 ? `−${-v}` : v}
        </text>
      ))}
    </g>
  );
};

/**
 * Question 3: sigmoid, tanh and ReLU side by side, each over its slope.
 * Sigmoid and tanh flatten at both ends (shaded), and the page's own block
 * puts numbers on it: sigmoid's slope peaks at 0.25, tanh's falls from 1 to
 * 0.071 by an input of 2. ReLU's slope is a step, 0 then 1, which is both its
 * strength and its failure: a unit stuck left of zero gets no gradient and
 * dies. Leaky ReLU and GELU are drawn over it as the fixes, and softmax is
 * named for the one place it belongs.
 */
export const ActScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("q3").from;
  const qAt = n.word("q3", "Question three");
  const textAt = n.word("q3", "Compare sigmoid");
  const sigAt = n.word("q3-sat", "Sigmoid maps");
  const tanhAt = n.word("q3-sat", "tanh to minus one");
  const centeredAt = n.word("q3-sat", "centered on zero");
  const flatAt = n.word("q3-sat", "Both flatten at the ends");
  const gradAt = n.word("q3-sat", "passing almost no gradient");
  const codeAt = n.word("q3-sat", "the page's code");
  const quarterAt = n.word("q3-sat", "a quarter");
  const tanhPeakAt = n.word("q3-sat", "peaking at one");
  const ohSevenAt = n.word("q3-sat", "point oh seven");
  const reluAt = n.word("q3-relu", "ReLU's slope is one");
  const compAt = n.word("q3-relu", "one comparison");
  const defaultAt = n.word("q3-relu", "the default for hidden layers");
  const negAt = n.word("q3-relu", "always negative");
  const zeroGradAt = n.word("q3-relu", "gets zero gradient");
  const neverAt = n.word("q3-relu", "never recovers");
  const leakyAt = n.word("q3-fix", "Leaky ReLU");
  const smoothAt = n.word("q3-fix", "bend smoothly");
  const transAt = n.word("q3-fix", "the usual choice in transformers");
  const softmaxAt = n.word("q3-fix", "Softmax belongs");
  const end = n.beat("backprop-in").to;

  const fnTop = y(345);
  const fnH = h(150);
  const slTop = y(555);
  const slH = h(84);
  const plots = COL_X.map((cx, i) => {
    const x: Scale = { lo: -5, hi: 5, a: cx + 40, b: cx + COL_W };
    const fy: Scale = i === 2 ? { lo: -1, hi: 5.2, a: fnTop + fnH, b: fnTop } : { lo: -1.2, hi: 1.2, a: fnTop + fnH, b: fnTop };
    const sy: Scale = { lo: 0, hi: 1.1, a: slTop + slH, b: slTop };
    return { fn: { x, y: fy }, slope: { x, y: sy } };
  });
  const colAt = [sigAt, tanhAt, reluAt];
  const curves = [
    { fn: C.sigmoid, slope: C.sigmoidDeriv },
    { fn: C.tanh, slope: C.tanhDeriv },
    { fn: C.relu, slope: C.reluDeriv },
  ];

  // The flat ends of sigmoid and tanh.
  const tails = ease(frame, flatAt, 14);
  // ReLU's step, lit green on "one for any positive input".
  const stepLit = ease(frame, reluAt + 8, 12);
  // The dead unit's input, held left of zero.
  const deadZ = -3;
  const dead = ease(frame, neverAt, 14);

  const page = ACTIVATIONS.page;
  const tableTop = y(706);
  const valX = (k: number) => COL_X[0] + 150 + k * 68;
  const tanhDots = [
    { z: 0, v: ACTIVATIONS.tanhDeriv["0"], at: tanhPeakAt },
    { z: 2, v: ACTIVATIONS.tanhDeriv["2"], at: ohSevenAt },
  ];

  return (
    <AbsoluteFill>
      {colAt.map((a, i) => (
        <Sfx key={i} name="el-pencil" at={a} level={-36} />
      ))}
      <Sfx name="el-whoosh" at={flatAt} level={-37} />
      <Sfx name="el-tap" at={quarterAt} level={-30} />
      <Sfx name="el-tap" at={ohSevenAt} level={-30} />
      <Sfx name="el-pop" at={neverAt} level={-31} />
      <Sfx name="el-pencil" at={leakyAt} level={-36} />
      <Sfx name="el-pencil" at={smoothAt} level={-36} />
      <Sfx name="el-chime" at={n.beat("q3-fix").to + 8} level={-33} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={3} at={qAt - 4} textAt={textAt - 4}>
          Compare sigmoid, tanh, and ReLU.
        </QuestionCard>

        {/* Titles, each with its range or its role. */}
        {["Sigmoid", "Tanh", "ReLU"].map((name, i) => (
          <Line key={name} at={colAt[i] - 4} x={COL_X[i]} y={y(296)} size={26}>
            {name}
            <span style={{ color: INK_SOFT, opacity: ease(frame, [sigAt + 12, centeredAt - 6, defaultAt][i], 10) }}>
              {[" · 0 to 1", " · −1 to 1, centered on 0", " · the default for hidden layers"][i]}
            </span>
          </Line>
        ))}
        <ColumnRule x={(COL_X[0] + COL_W + COL_X[1]) / 2} top={y(296)} height={y(840) - y(296)} at={tanhAt} />
        <ColumnRule x={(COL_X[1] + COL_W + COL_X[2]) / 2} top={y(296)} height={y(840) - y(296)} at={reluAt} />

        <Svg>
          {/* The flat ends: almost no slope to pass back. */}
          {[0, 1].map((i) =>
            [
              [-5, -2.5],
              [2.5, 5],
            ].map(([a, b], k) => (
              <rect
                key={`${i}${k}`}
                x={at(plots[i].fn.x, a)}
                y={fnTop - 6}
                width={(at(plots[i].fn.x, b) - at(plots[i].fn.x, a)) * tails}
                height={slTop + slH - fnTop + 12}
                fill={HIGHLIGHT}
                opacity={0.8}
              />
            )),
          )}
          {plots.map((pl, i) => (
            <React.Fragment key={i}>
              <Frame plot={pl.fn} from={colAt[i] - 6} ticks={i === 2 ? [0, 5] : [-1, 1]} />
              <Frame plot={pl.slope} from={gradAt - 6 + i * 3} ticks={[0, 1]} />
              <Curve plot={pl.fn} values={curves[i].fn} from={colAt[i]} color={BAR} />
              {i < 2 ? (
                <Curve plot={pl.slope} values={curves[i].slope} from={gradAt + i * 4} color={BAR} />
              ) : (
                <>
                  <Curve plot={pl.slope} values={curves[i].slope} from={reluAt + 2} color={BAR} />
                  {/* The step's right half, lit: a slope of 1 for any positive input. */}
                  <line
                    x1={at(pl.slope.x, 0)}
                    x2={at(pl.slope.x, 0) + (pl.slope.x.b - at(pl.slope.x, 0)) * stepLit}
                    y1={at(pl.slope.y, 1)}
                    y2={at(pl.slope.y, 1)}
                    stroke={OK}
                    strokeWidth={5}
                    strokeLinecap="round"
                  />
                </>
              )}
              {[-5, 0, 5].map((z) => (
                <text
                  key={z}
                  x={at(pl.slope.x, z)}
                  y={slTop + slH + 28}
                  textAnchor="middle"
                  style={{ ...label(20, INK_SOFT), fill: INK_SOFT, ...TABULAR, opacity: ease(frame, gradAt + i * 3, 10) }}
                >
                  {z < 0 ? `−${-z}` : z}
                </text>
              ))}
            </React.Fragment>
          ))}
          {/* The fixes, over ReLU's own curve. */}
          <Curve plot={plots[2].fn} values={LEAKY} from={leakyAt} color={TEAL} width={3} />
          <Curve plot={plots[2].fn} values={C.gelu} from={smoothAt} color={PURPLE} width={3} />
          {/* tanh's slope at 0 and at 2. */}
          {tanhDots.map((d) => {
            const s = ease(frame, d.at, 10);
            return s > 0 ? <circle key={d.z} cx={at(plots[1].slope.x, d.z)} cy={at(plots[1].slope.y, d.v)} r={7 * s} fill={LOOK} stroke={INK} strokeWidth={1.5} /> : null;
          })}
          {/* The dead unit's input, stuck left of zero on ReLU's flat side. */}
          {(() => {
            const s = ease(frame, negAt, 10);
            if (s <= 0) return null;
            return (
              <>
                <circle cx={at(plots[2].fn.x, deadZ)} cy={at(plots[2].fn.y, 0)} r={8 * s} fill={ACCENT_INK} />
                <circle cx={at(plots[2].slope.x, deadZ)} cy={at(plots[2].slope.y, 0)} r={8 * s} fill={ACCENT_INK} opacity={ease(frame, zeroGradAt, 10)} />
              </>
            );
          })()}
        </Svg>
        {["Slope", "Slope", "Slope"].map((t, i) => (
          <Line key={i} at={gradAt - 4 + i * 3} x={COL_X[i]} y={slTop - h(40)} size={22} color={INK_SOFT}>
            {t}
          </Line>
        ))}
        {/* tanh's two slopes, labelled beside their dots. */}
        {tanhDots.map((d) => (
          <Line key={d.z} at={d.at + 2} x={at(plots[1].slope.x, d.z) + 14} y={at(plots[1].slope.y, d.v) - (d.z === 0 ? 18 : 40)} size={22} color={INK}>
            {d.z === 0 ? <Mark at={d.at}>1</Mark> : <Mark at={d.at}>{d.v}</Mark>}
          </Line>
        ))}
        {/* ReLU itself: one comparison. */}
        <Line at={compAt} x={at(plots[2].fn.x, 0.4)} y={at(plots[2].fn.y, 4.6)} size={24} color={INK}>
          <MathRun>
            max(0, <I>z</I>)
          </MathRun>
        </Line>

        {/* ── Sigmoid's five slopes, from the page's own block ── */}
        <Line at={codeAt - 2} x={COL_X[0]} y={tableTop} size={22} color={INK_SOFT}>
          {"The page's code"}
        </Line>
        {[
          { name: "z", vals: page.z.map((v) => (v < 0 ? `−${-v}` : String(v))), top: tableTop + h(40) },
          { name: "slope", vals: page.sigmoidDeriv.map(String), top: tableTop + h(80) },
        ].map((row, r) => (
          <React.Fragment key={row.name}>
            <div style={{ position: "absolute", left: COL_X[0], top: row.top, ...note(22, INK_SOFT), opacity: ease(frame, codeAt + r * 3, 10) }}>{row.name}</div>
            {row.vals.map((v, k) => (
              <div
                key={k}
                style={{
                  position: "absolute",
                  left: valX(k) - 60,
                  width: 60,
                  textAlign: "right",
                  top: row.top,
                  ...note(22, INK),
                  ...TABULAR,
                  opacity: ease(frame, codeAt + r * 3 + k * 2, 10),
                }}
              >
                {r === 1 && k === 2 ? <Mark at={quarterAt}>{v}</Mark> : v}
              </div>
            ))}
          </React.Fragment>
        ))}

        {/* ── The dead unit, then the fixes ── */}
        <Node x={COL_X[2] + 30} y={y(722)} r={28} at={negAt} hue="gray" hueAt={neverAt} size={20}>
          unit
        </Node>
        <Line at={negAt + 4} x={COL_X[2] + 76} y={y(722) - 16} size={24} color={INK}>
          Input below 0
          <span style={{ opacity: ease(frame, zeroGradAt, 10) }}>: output 0, slope 0</span>
        </Line>
        <div style={{ position: "absolute", left: COL_X[2] + 76, top: y(722) + h(30), opacity: dead, transform: `translateY(${(1 - dead) * 8}px)` }}>
          <Tag tone="red" size={24}>
            dead
          </Tag>
        </div>
        <Line at={leakyAt + 4} x={COL_X[2]} y={y(812)} size={24} color={ds("teal", 700)}>
          Leaky: slope <span style={TABULAR}>{LEAKY_SLOPE}</span> below 0
        </Line>
        <Line at={smoothAt + 4} x={COL_X[2]} y={y(852)} size={24} color={inkOf.purple}>
          GELU
          <span style={{ opacity: ease(frame, transAt, 10) }}>: the usual in transformers</span>
        </Line>

        <Line at={softmaxAt} x={COL_X[0]} y={y(880)} size={26} color={INK}>
          Softmax: the multi-class output layer
        </Line>
      </Drift>
    </AbsoluteFill>
  );
};
