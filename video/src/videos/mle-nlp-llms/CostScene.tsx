import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { I, MathRun } from "../../editorial/math";
import { label, svgText } from "../../editorial/style";
import { ColumnRule, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ds } from "../../theme/brand";
import { COST } from "./data";
import { ACCENT_INK, BAR, BLUE_INK, Clear, commas, DATA_FILL, Drift, GOLD, Grid, INK, INK_SOFT, Line, Mark, Q_SIZE, Svg, X0 } from "./parts";

const SUP: React.CSSProperties = { fontSize: "0.7em", verticalAlign: "0.45em", lineHeight: 0 };
/** The chart's frame, in page x and layout y: multiply-adds per layer over a
 *  whole context, up to 20 trillion. */
const CH = { x0: 1010, x1: 1770, nMax: 49152, yMax: 20e12 };

/**
 * Question 8. Left: the pairs as squares, a thousand tokens and then two
 * thousand, the second four tiles of the first. Right: one layer's compute
 * over the whole context against its length (results.json cost.totals, from
 * stated sizes): the rest of the layer a straight line, since it grows
 * linearly, attention a parabola, crossing at 24,576 tokens (yellow). It was
 * per token until the 2026-11-26 review, which drew attention as a straight
 * line and the rest as a flat one, under a narration saying the opposite. Then, on the left, the variants teams reach for past that:
 * sparse and sliding-window masks, and linear attention, a row of n cells
 * against the n-by-n square; and retrieval.
 */
export const CostScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("q8").from;
  const qAt = n.word("q8", "Question eight");
  const textAt = n.word("q8", "Why is attention's cost");
  const everyAt = n.word("q8-a", "Every token is compared");
  const thousandAt = n.word("q8-a", "A thousand tokens");
  const twoAt = n.word("q8-a", "two thousand");
  const fourAt = n.word("q8-a", "four million");
  const doubleAt = n.word("q8-a", "Double the context");
  const fourTimesAt = n.word("q8-a", "about four times as much");
  const restAt = n.word("q8-when", "The rest of a layer");
  const wideAt = n.word("q8-when", "four thousand and ninety-six wide");
  const arithAt = n.word("q8-when", "attention's arithmetic");
  const pastAt = n.word("q8-when", "only past about twenty-five thousand tokens");
  const sparseAt = n.word("q8-fix", "sparse");
  const slidingAt = n.word("q8-fix", "sliding-window");
  const linearAt = n.word("q8-fix", "linear attention");
  const retrieveAt = n.word("q8-fix", "retrieve the passages");
  const end = n.beat("q8-fix").to;

  const C = COST;
  const top = y(360);
  const A = 140;
  const GAP = 8;

  // ── The chart ──
  const cy0 = y(700);
  const cy1 = y(380);
  const px = (v: number) => CH.x0 + (v / CH.nMax) * (CH.x1 - CH.x0);
  const py = (v: number) => cy0 - (v / CH.yMax) * (cy0 - cy1);
  const axes = ease(frame, restAt, 14);
  const restP = ease(frame, restAt + 6, 20);
  const attnP = ease(frame, arithAt, 26);
  const crossIn = ease(frame, pastAt, 12);
  const pts = (key: "attention" | "rest") => C.totals.map((p) => `${px(p.n)},${py(p[key])}`).join(" L");
  const at = (n: number) => C.totals.find((p) => p.n === n) ?? C.totals[C.totals.length - 1];
  const cross = at(C.crossover);
  const xTicks = [0, 10000, 20000, 30000, 40000];
  const yTicks = [0, 5e12, 10e12, 15e12, 20e12];
  // Where the two labels sit: "attention" left of the parabola near its top,
  // "the rest of the layer" under its line toward the right.
  const attnLabel = at(45056);
  const restLabel = at(36864);

  // ── The variants ──
  const V = 150;
  const vx = [X0, X0 + 220, X0 + 440];

  return (
    <AbsoluteFill>
      <Sfx name="el-sprinkle" at={thousandAt + 4} level={-34} />
      <Sfx name="el-sprinkle" at={twoAt + 4} level={-33} />
      <Sfx name="el-tap" at={fourTimesAt} level={-30} />
      <Sfx name="el-pencil" at={restAt + 6} level={-36} />
      <Sfx name="el-pencil" at={arithAt} level={-35} />
      <Sfx name="el-pop" at={pastAt + 2} level={-32} />
      <Sfx name="el-whoosh" at={sparseAt - 6} level={-37} />
      <Sfx name="el-sprinkle" at={sparseAt + 2} level={-35} />
      <Sfx name="el-sprinkle" at={slidingAt + 2} level={-35} />
      <Sfx name="el-tap" at={linearAt + 4} level={-32} />

      <Drift from={from} to={end + 40} scale={0.014}>
        <QuestionCard n={8} at={qAt - 4} textAt={textAt - 4} size={Q_SIZE}>
          Why is attention&apos;s cost a scaling bottleneck for long documents?
        </QuestionCard>

        {/* ── The pairs, at a thousand tokens and at two thousand ── */}
        <Clear at={sparseAt - 8}>
          <Line at={everyAt} x={X0} y={top - h(46)} size={22} color={INK_SOFT}>
            Every token against every other
          </Line>
          <Svg>
            {ease(frame, thousandAt, 12) > 0 ? <rect x={X0} y={top} width={A} height={A} rx={5} fill={DATA_FILL} opacity={ease(frame, thousandAt, 12)} /> : null}
            {[0, 1, 2, 3].map((k) => {
              const p = ease(frame, twoAt + 4 + k * 4, 10);
              if (p <= 0) return null;
              return <rect key={k} x={X0 + 210 + (k % 2) * (A + GAP)} y={top + Math.floor(k / 2) * (A + GAP)} width={A} height={A} rx={5} fill={DATA_FILL} opacity={p} />;
            })}
          </Svg>
          <Line at={thousandAt} x={X0} y={top + A + h(18)} size={22}>
            <Num>1,000</Num> tokens
          </Line>
          <Line at={thousandAt + 10} x={X0} y={top + A + h(50)} size={22} color={BLUE_INK}>
            <Num>{commas(C.pairs["1000"])}</Num> pairs
          </Line>
          <Line at={twoAt} x={X0 + 210} y={top + 2 * A + GAP + h(18)} size={22}>
            <Num>2,000</Num> tokens
          </Line>
          <Line at={fourAt} x={X0 + 210} y={top + 2 * A + GAP + h(50)} size={22} color={BLUE_INK}>
            <Num>{commas(C.pairs["2000"])}</Num> pairs
          </Line>
          <Line at={doubleAt} x={X0} y={y(760)} size={28} color={ACCENT_INK} weight={600}>
            <Mark at={fourTimesAt} color={`color-mix(in srgb, ${ds("red", 500)} 22%, transparent)`}>
              2× the length, 4× the attention
            </Mark>
          </Line>
        </Clear>

        {/* ── Where attention overtakes the rest of a layer ── */}
        <ColumnRule x={880} top={y(330)} height={h(520)} at={restAt} />
        <Line at={restAt} x={CH.x0 - 60} y={y(318)} size={21} color={INK_SOFT}>
          Multiply-adds in one layer, over the whole context (trillions)
        </Line>
        <Svg opacity={axes}>
          <line x1={CH.x0} x2={CH.x1} y1={cy0} y2={cy0} stroke={INK_SOFT} strokeWidth={1.4} />
          {yTicks.map((t) => (
            <React.Fragment key={t}>
              {t > 0 ? <line x1={CH.x0} x2={CH.x1} y1={py(t)} y2={py(t)} stroke={INK_SOFT} strokeWidth={1} opacity={0.25} /> : null}
              <text x={CH.x0 - 14} y={py(t) + 7} textAnchor="end" style={svgText(label(20, INK_SOFT))}>
                {t / 1e12}
              </text>
            </React.Fragment>
          ))}
          {xTicks.map((t) => (
            <text key={t} x={px(t)} y={cy0 + 30} textAnchor="middle" style={svgText(label(20, INK_SOFT))}>
              {commas(t)}
            </text>
          ))}
        </Svg>
        <Line at={restAt + 4} x={(CH.x0 + CH.x1) / 2} y={cy0 + 44} size={21} color={INK_SOFT} align="center" width={400}>
          context length (tokens)
        </Line>
        <Svg>
          <path d={`M${pts("rest")}`} fill="none" stroke={INK} strokeWidth={3} pathLength={1} strokeDasharray={`${restP} 1`} />
          <path d={`M${pts("attention")}`} fill="none" stroke={BAR} strokeWidth={3.4} pathLength={1} strokeDasharray={`${attnP} 1`} />
          {crossIn > 0 ? (
            <g opacity={crossIn}>
              <line x1={px(C.crossover)} x2={px(C.crossover)} y1={py(cross.rest)} y2={cy0} stroke={GOLD} strokeWidth={2} strokeDasharray="5 5" />
              <circle cx={px(C.crossover)} cy={py(cross.rest)} r={9} fill={GOLD} />
            </g>
          ) : null}
        </Svg>
        <Line at={restAt + 16} x={px(restLabel.n)} y={py(restLabel.rest) + h(14)} size={22}>
          the rest of the layer
        </Line>
        <Line at={arithAt + 16} x={px(attnLabel.n) - 24} y={py(attnLabel.attention) - h(16)} size={22} color={BLUE_INK} align="right" width={160}>
          attention
        </Line>
        <Line at={pastAt + 4} x={px(C.crossover) + 20} y={py(cross.rest) + h(30)} size={24} weight={600}>
          <Mark at={pastAt + 10}>
            <Num>{commas(C.crossover)}</Num> tokens
          </Mark>
        </Line>
        <Line at={wideAt} x={CH.x0 - 60} y={y(828)} size={20} color={INK_SOFT}>
          Width <Num>{commas(C.width)}</Num>, feed-forward <Num>{C.ffnMultiple}</Num>× as wide: assumptions
        </Line>

        {/* ── Past that: the variants, and retrieval ── */}
        <Grid x={vx[0]} y={top} n={8} size={V} gap={3} at={sparseAt} on={(r, c) => c <= r && (c === r || c % 3 === 0)} />
        <Grid x={vx[1]} y={top} n={8} size={V} gap={3} at={slidingAt} on={(r, c) => c <= r && r - c <= 2} />
        <Grid x={vx[2]} y={top} n={8} size={V} gap={3} at={linearAt} on={(r) => r === 7} color={BAR} />
        {[
          { text: "sparse", at: sparseAt },
          { text: "sliding window", at: slidingAt },
          { text: "linear", at: linearAt },
        ].map((v, i) => (
          <Line key={v.text} at={v.at + 6} x={vx[i]} y={top + V + h(18)} size={22}>
            {v.text}
          </Line>
        ))}
        <Line at={linearAt + 12} x={vx[2]} y={top + V + h(52)} size={22} color={BLUE_INK}>
          <MathRun>
            <I>n</I>
          </MathRun>
          , not{" "}
          <MathRun>
            <I>n</I>
            <sup style={SUP}>2</sup>
          </MathRun>
        </Line>
        <Line at={retrieveAt} x={X0} y={y(640)} size={26}>
          Or retrieve the passages that matter
        </Line>
        <Line at={retrieveAt + 10} x={X0} y={y(640) + h(40)} size={22} color={INK_SOFT}>
          instead of pasting in everything
        </Line>
      </Drift>
    </AbsoluteFill>
  );
};
