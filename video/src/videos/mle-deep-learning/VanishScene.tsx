import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { OK, QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { label, TABULAR } from "../../editorial/style";
import { Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { VANISH } from "./data";
import { ACCENT, ACCENT_INK, atLog, Drift, Flow, INK, INK_SOFT, Line, LOOK, Mark, OK_INK, Pow10, type Scale, Svg, Tag } from "./parts";
import { arrowHead, type Pt } from "../../components/arrow";

const CH_X0 = 230;
const PITCH = 42;
const CH_X1 = CH_X0 + 19 * PITCH;
const LIST_X = 1460;
/** A layer's x: layer 20 (where the gradient starts) at the left. */
const xOf = (layer: number) => CH_X0 + (20 - layer) * PITCH;

/** "2.5 × 10⁻¹³": a small share, as it is set beside its line. */
const sci = (v: number) => {
  const e = Math.floor(Math.log10(v));
  return { m: (v / 10 ** e).toFixed(1), e };
};

/**
 * Question 5. The backward sweep is a product, one factor per layer: the
 * twenty layers as a row, the gradient travelling back along it, and under
 * them what arrives at each layer in a seeded simulation (20 layers of 128,
 * random inputs), on a log scale. Sigmoid falls to 2.5e-13, ReLU with He
 * holds near 1, ReLU at twice He's spread climbs past a million (the axis
 * grows to hold it) and becomes NaN. Then the five fixes, clipping drawn as
 * an arrow cut to a circle's rim, and what to watch.
 */
export const VanishScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("q5").from;
  const qAt = n.word("q5", "Question five");
  const textAt = n.word("q5", "What causes");
  const sweepAt = n.word("q5", "That backward sweep");
  const productAt = n.word("q5", "a long product");
  const belowAt = n.word("q5", "mostly below one");
  const aboveAt = n.word("q5", "mostly above");
  const simAt = n.word("q5-sim", "Simulate twenty layers");
  const sigAt = n.word("q5-sim", "With sigmoid");
  const trillionAt = n.word("q5-sim", "under a trillionth");
  const reluAt = n.word("q5-sim", "With ReLU and He");
  const sizeAt = n.word("q5-sim", "about the size it left");
  const twiceAt = n.word("q5-explode", "twice as spread out");
  const millionAt = n.word("q5-explode", "over a million times larger");
  const nanAt = n.word("q5-explode", "not a number");
  const fixesAt = n.word("q5-fix", "The fixes");
  const fixAt = [
    n.word("q5-fix", "ReLU-family activations"),
    n.word("q5-fix", "careful initialization"),
    n.word("q5-fix", "residual connections"),
    n.word("q5-fix", "and normalization"),
    n.word("q5-fix", "clip"),
  ];
  const oneAt = n.word("q5-fix", "a derivative of one");
  const scaleAt = n.word("q5-fix", "scale the gradient down");
  const logAt = n.word("q5-watch", "Log the gradient norm");
  const showsAt = n.word("q5-watch", "shows there first");
  const end = n.beat("q5-watch").to;

  // ── The row of layers ──
  const rowTop = y(330);
  const BOX = 30;
  const travel = ease(frame, sweepAt, Math.max(30, aboveAt - sweepAt + 20));

  // ── The chart ──
  const top = y(452);
  const bottom = y(760);
  const grow = ease(frame, twiceAt, 24);
  const hiExp = 2 + 5 * grow;
  const ys: Scale = { lo: 1e-14, hi: 10 ** hiExp, a: bottom, b: top };
  const ticks = [-12, -8, -4, 0, 4].filter((e) => e <= hiExp + 0.01);

  const lines = [
    { key: "sigmoidXavier" as const, at: sigAt, color: ACCENT },
    { key: "reluHe" as const, at: reluAt, color: OK },
    { key: "reluTwiceHe" as const, at: twiceAt + 10, color: ACCENT },
  ];
  const path = (vals: readonly number[], p: number) => {
    const pts = Array.from({ length: 20 }, (_, i) => {
      const layer = 20 - i;
      return [xOf(layer), atLog(ys, vals[layer - 1])] as const;
    });
    // The top of the stack starts at 1: what left the top.
    const all = [[xOf(20) - PITCH, atLog(ys, 1)] as const, ...pts];
    const k = Math.max(1, Math.round(p * (all.length - 1)));
    return all.slice(0, k + 1).map(([a, b], i) => `${i ? "L" : "M"}${a.toFixed(1)},${b.toFixed(1)}`).join(" ");
  };
  const endY = (key: keyof typeof VANISH.first) => atLog(ys, VANISH.first[key]);
  const sig = sci(VANISH.first.sigmoidXavier);

  // ── Clipping: an arrow longer than the threshold, cut back onto its rim ──
  const CX = LIST_X + 50;
  const CY = y(812);
  const R = 42;
  const ang = (-28 * Math.PI) / 180;
  const len = 98 - (98 - R) * ease(frame, scaleAt, 16);
  const tip: Pt = [CX + Math.cos(ang) * len, CY + Math.sin(ang) * len];
  const clipLine: Pt[] = Array.from({ length: 21 }, (_, i) => [CX + ((tip[0] - CX) * i) / 20, CY + ((tip[1] - CY) * i) / 20]);

  return (
    <AbsoluteFill>
      <Sfx name="el-whoosh" at={sweepAt} level={-36} />
      <Sfx name="el-pencil" at={sigAt} level={-35} />
      <Sfx name="el-pencil" at={reluAt} level={-35} />
      <Sfx name="el-whoosh" at={twiceAt} level={-35} />
      <Sfx name="el-pop" at={nanAt} level={-30} />
      {fixAt.map((a, i) => (
        <Sfx key={i} name="el-tap" at={a} level={-32} />
      ))}
      <Sfx name="el-chime" at={showsAt + 16} level={-33} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={5} at={qAt - 4} textAt={textAt - 4} size={60}>
          What causes vanishing and exploding gradients, and how do you fix them?
        </QuestionCard>

        {/* ── Twenty layers, and the gradient travelling back through them ── */}
        <Svg>
          {Array.from({ length: 20 }, (_, i) => {
            const layer = 20 - i;
            const p = ease(frame, sweepAt - 10 + i * 0.8, 8);
            const passed = travel * 20 > i + 0.5;
            return p > 0 ? (
              <rect
                key={layer}
                x={xOf(layer) - BOX / 2}
                y={rowTop}
                width={BOX}
                height={h(BOX)}
                rx={5}
                fill="none"
                stroke={passed ? LOOK : INK}
                strokeWidth={2}
                opacity={p}
              />
            ) : null;
          })}
        </Svg>
        <Flow points={[[xOf(20) - BOX / 2, rowTop + h(BOX) + h(22)], [xOf(1) + BOX / 2, rowTop + h(BOX) + h(22)]]} at={sweepAt} dur={Math.max(30, aboveAt - sweepAt + 20)} color={LOOK} width={4} head={15} />
        <Line at={sweepAt} x={xOf(20) - BOX / 2 - 4} y={rowTop - h(40)} size={22} color={INK_SOFT}>
          Layer <Num>20</Num>
        </Line>
        <Line at={sweepAt + 14} x={xOf(1) + BOX / 2 + 4} y={rowTop - h(40)} size={22} color={INK_SOFT} align="right" width={200}>
          Layer <Num>1</Num>
        </Line>
        <Line at={productAt} x={CH_X1 + 60} y={rowTop - h(6)} size={24} color={INK}>
          A product of <Num>20</Num> factors
        </Line>
        <Line at={belowAt} x={CH_X1 + 60} y={rowTop + h(36)} size={24} color={ACCENT_INK}>
          Mostly below 1: it vanishes
          <span style={{ opacity: ease(frame, aboveAt, 10) }}>; above 1, it explodes</span>
        </Line>

        {/* ── What reaches each layer ── */}
        <Line at={simAt} x={CH_X0 - 110} y={top - h(56)} size={22} color={INK_SOFT}>
          Share of the gradient reaching each layer · simulated, <Num>20</Num> layers of <Num>128</Num>, random inputs
        </Line>
        <Svg>
          <g opacity={ease(frame, simAt, 12)}>
            {ticks.map((e) => (
              <g key={e}>
                <line x1={CH_X0 - PITCH} x2={CH_X1 + 10} y1={atLog(ys, 10 ** e)} y2={atLog(ys, 10 ** e)} stroke={INK_SOFT} strokeWidth={1} strokeDasharray="2 6" opacity={e === 0 ? 0.9 : 0.5} />
                <text x={CH_X0 - PITCH - 14} y={atLog(ys, 10 ** e) + 7} textAnchor="end" style={{ ...label(20, INK_SOFT), fill: INK_SOFT, ...TABULAR }}>
                  <Pow10 e={e} />
                </text>
              </g>
            ))}
            <line x1={CH_X0 - PITCH} x2={CH_X1 + 10} y1={bottom} y2={bottom} stroke={INK} strokeWidth={1.4} />
            {[20, 15, 10, 5, 1].map((l) => (
              <text key={l} x={xOf(l)} y={bottom + 30} textAnchor="middle" style={{ ...label(20, INK_SOFT), fill: INK_SOFT, ...TABULAR }}>
                {l}
              </text>
            ))}
            <text x={CH_X1 + 10} y={bottom + 58} textAnchor="end" style={{ ...label(20, INK_SOFT), fill: INK_SOFT }}>
              layer, back from the loss
            </text>
          </g>
          {lines.map((l) => {
            const p = ease(frame, l.at, 30);
            if (p <= 0) return null;
            return <path key={l.key} d={path(VANISH.byLayer[l.key], p)} fill="none" stroke={l.color} strokeWidth={4} strokeLinejoin="round" strokeLinecap="round" />;
          })}
        </Svg>
        {/* Each line's end, labelled with what reached the first layer. */}
        <Line at={trillionAt} x={CH_X1 + 30} y={endY("sigmoidXavier") - 15} size={22} color={ACCENT_INK}>
          Sigmoid:{" "}
          <span style={TABULAR}>
            {sig.m} × 10<sup>−{-sig.e}</sup>
          </span>
        </Line>
        <Line at={sizeAt} x={CH_X1 + 30} y={endY("reluHe") - 15} size={22} color={OK_INK}>
          ReLU, He: <Num>{VANISH.first.reluHe}</Num>
        </Line>
        <Line at={millionAt} x={CH_X1 + 30} y={endY("reluTwiceHe") - 15} size={22} color={ACCENT_INK}>
          Twice He&apos;s spread: <Num>1.4</Num> million
        </Line>
        <div style={{ position: "absolute", left: CH_X1 + 30, top: endY("reluTwiceHe") + h(22), opacity: ease(frame, nanAt, 10) }}>
          <Tag tone="red" size={24}>
            NaN
          </Tag>
        </div>

        {/* ── The fixes ── */}
        <Line at={fixesAt} x={LIST_X} y={y(452)} size={24} color={INK_SOFT}>
          The fixes
        </Line>
        {["ReLU-family activations", "Careful initialization", "Residual connections", "Normalization", "Clip the gradient"].map((t, i) => (
          <Line key={t} at={fixAt[i] - 2} x={LIST_X} y={y(500) + i * h(46) + (i > 2 ? h(36) : 0)} size={26} color={INK}>
            <Mark at={fixAt[i]} out={fixAt[i + 1] ?? logAt}>
              {t}
            </Mark>
          </Line>
        ))}
        <Line at={oneAt} x={LIST_X + 24} y={y(500) + 3 * h(46) - h(8)} size={22} color={INK_SOFT}>
          a path whose slope is 1
        </Line>
        <Svg>
          <g opacity={ease(frame, fixAt[4], 12)}>
            <circle cx={CX} cy={CY} r={R} fill="none" stroke={INK_SOFT} strokeWidth={2} strokeDasharray="5 6" />
            <line x1={CX} y1={CY} x2={tip[0]} y2={tip[1]} stroke={INK} strokeWidth={3} />
            <path d={arrowHead(clipLine, 14, 7, { filled: true })} fill={INK} />
          </g>
        </Svg>
        <Line at={scaleAt + 6} x={CX + R + 38} y={CY - h(40)} size={22} color={INK_SOFT}>
          Cut to the threshold,
        </Line>
        <Line at={scaleAt + 10} x={CX + R + 38} y={CY - h(8)} size={22} color={INK_SOFT}>
          same direction
        </Line>

        <Line at={logAt} x={CH_X0 - 110} y={y(880)} size={28} color={INK}>
          Log the gradient norm every training step
        </Line>
      </Drift>
    </AbsoluteFill>
  );
};
