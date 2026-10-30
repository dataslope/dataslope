import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT, BAR, BLUE_INK, HIGHLIGHT, INK, INK_SOFT, PAPER, TABULAR, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { Drift, Headline, Kicker, pulse, Spot, Svg, X0 } from "./parts";

/** The opening network: three inputs, two hidden layers of four, one output. */
const LAYERS = [3, 4, 4, 1];
const LX = [210, 440, 670, 900];
const MID = 540;
const GAP = 92;
const R = 22;
/** The gradient's size as it reaches each layer, from the output back: a quarter per layer. */
const GRAD = [0.0156, 0.0625, 0.25, 1];
const BAR_TOP = 742;
const BAR_H = 90;
/** Questions worked through; the rest go quickly at the end. */
const DRAWN = 12;
const TOTAL = 15;
const DOT_Y = 520;
const DOT_GAP = 64;

const nodeY = (layer: number, i: number) => MID + (i - (LAYERS[layer] - 1) / 2) * GAP;

/**
 * The opening: a small network draws itself, a signal runs forward through
 * it in blue, one neuron is picked out, and the error runs back in red,
 * thinner at every layer, with a bar under each layer for how much of it
 * arrives (a quarter per layer, the sigmoid's best case). Then the round as
 * fifteen neurons in a row, twelve filled and three dashed, and the first
 * picked out on the bridge into question 1.
 */
export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("hook").from;
  const trainAt = n.word("hook", "train a network");
  const explainAt = n.word("hook", "explain one");
  const neuronAt = n.word("hook", "a single neuron computes");
  const backAt = n.word("hook", "the error travels back");
  const deepAt = n.word("hook", "in a deep enough stack");
  const fadesAt = n.word("hook", "fades to almost nothing");
  const twelveAt = n.word("plan", "Of the fifteen questions");
  const smallAt = n.word("plan", "twelve get worked through");
  const numpyAt = n.word("plan", "computed by hand in NumPy");
  const quickAt = n.word("plan-quick", "Three quick ones");
  const firstAt = n.word("neuron-in", "The smallest piece first");
  const end = n.beat("neuron-in").to;

  const netOut = twelveAt - 6;
  const drawP = ease(frame, from + 2, 24);
  const netO = 1 - ease(frame, netOut, 12);
  // The forward pass: one hop per layer, 9 frames each, from "explain one".
  const fwd = (layer: number) => (frame - (explainAt + 2 + layer * 9)) / 9;
  // The backward pass: from the output, one hop per layer; again on "fades".
  const backStarts = [backAt + 2, fadesAt - 4];
  const bwd = (start: number, hop: number) => (frame - (start + hop * 11)) / 11;
  const picked = ease(frame, neuronAt - 2, 10);
  const swell = pulse(frame, firstAt, 20);

  const edges: { l: number; i: number; j: number }[] = [];
  for (let l = 0; l < LAYERS.length - 1; l++)
    for (let i = 0; i < LAYERS[l]; i++) for (let j = 0; j < LAYERS[l + 1]; j++) edges.push({ l, i, j });

  return (
    <AbsoluteFill>
      <Sfx name="el-sprinkle" at={from + 4} level={-38} />
      <Sfx name="el-whoosh" at={explainAt + 2} level={-36} />
      <Sfx name="el-tap" at={neuronAt} level={-34} />
      <Sfx name="el-whoosh" at={backAt + 2} level={-36} />
      <Sfx name="el-sprinkle" at={twelveAt} level={-36} />
      <Sfx name="el-tap" at={firstAt} level={-34} />

      <Drift from={from} to={end + 40}>
        <Kicker at={from}>Data scientist interview prep</Kicker>
        <Headline lead="Not train one," turn="explain one." at={trainAt - 4} turnAt={explainAt - 4} size={72} />

        <Spot id="ds-deep-learning-octopus" at={from + 6} left={1260} top={y(270)} width={510} height={500} />

        {/* ── The network ── */}
        <Svg opacity={netO}>
          {edges.map(({ l, i, j }, k) => {
            const x1 = LX[l] + R;
            const x2 = LX[l + 1] - R;
            const y1 = y(nodeY(l, i));
            const y2 = y(nodeY(l + 1, j));
            const p = Math.min(1, Math.max(0, drawP * 1.6 - (k / edges.length) * 0.6));
            const f = fwd(l);
            const fOn = f > 0 && f < 1;
            // Backward: hop 0 is the last layer of edges (into the output).
            const hop = LAYERS.length - 2 - l;
            const bDots = backStarts
              .map((s) => bwd(s, hop))
              .filter((t) => t > 0 && t < 1)
              .map((t) => ({ t, size: GRAD[l + 1] }));
            return (
              <g key={k}>
                <line x1={x1} y1={y1} x2={x1 + (x2 - x1) * p} y2={y1 + (y2 - y1) * p} stroke={INK_SOFT} strokeWidth={1.3} opacity={0.45} />
                {fOn ? <circle cx={x1 + (x2 - x1) * f} cy={y1 + (y2 - y1) * f} r={6} fill={BAR} /> : null}
                {bDots.map((b, q) => (
                  <circle
                    key={q}
                    cx={x2 + (x1 - x2) * b.t}
                    cy={y2 + (y1 - y2) * b.t}
                    r={3 + 6 * Math.sqrt(b.size)}
                    fill={ACCENT}
                    opacity={0.25 + 0.75 * Math.sqrt(b.size)}
                  />
                ))}
              </g>
            );
          })}
          {LAYERS.map((count, l) =>
            Array.from({ length: count }, (_, i) => {
              const p = ease(frame, from + 4 + l * 4 + i * 1.5, 12);
              const isPicked = l === 1 && i === 0;
              return (
                <g key={`${l}-${i}`}>
                  {isPicked && picked > 0 ? <circle cx={LX[l]} cy={y(nodeY(l, i))} r={(R + 12) * picked} fill={HIGHLIGHT} /> : null}
                  <circle cx={LX[l]} cy={y(nodeY(l, i))} r={R * p} fill={PAPER} stroke={INK} strokeWidth={2.2} />
                </g>
              );
            }),
          )}
        </Svg>
        <Note at={neuronAt + 2} x={LX[1] - 70} y={y(nodeY(1, 0)) - h(76)} out={netOut}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>one neuron</span>
        </Note>
        <Note at={backAt + 4} x={LX[2] - 60} y={y(nodeY(2, 0)) - h(122)} out={netOut}>
          <span style={{ ...note(23, ACCENT), fontWeight: 650, whiteSpace: "nowrap" }}>← the error, travelling back</span>
        </Note>

        {/* How much of the error reaches each layer. */}
        {GRAD.map((g, l) => {
          const p = ease(frame, deepAt + (LAYERS.length - 1 - l) * 6, 14);
          const bh = h(BAR_H) * g * p;
          return (
            <div
              key={l}
              style={{
                position: "absolute",
                left: LX[l] - 18,
                top: y(BAR_TOP) + h(BAR_H) - bh,
                width: 36,
                height: Math.max(bh, p > 0 ? 2 : 0),
                background: ACCENT,
                borderRadius: 2,
                opacity: netO * (0.35 + 0.65 * Math.sqrt(g)),
              }}
            />
          );
        })}
        <Note at={deepAt + 4} x={LX[0] - 18} y={y(BAR_TOP) + h(BAR_H) + h(12)} out={netOut}>
          <span style={{ ...label(21, INK_SOFT), whiteSpace: "nowrap" }}>how much of the error reaches each layer</span>
        </Note>

        {/* ── The round: fifteen neurons, twelve worked through ── */}
        {Array.from({ length: TOTAL }, (_, i) => {
          const p = ease(frame, twelveAt + i * 1.4, 12);
          if (p <= 0) return null;
          const drawn = i < DRAWN;
          const fill = drawn ? ease(frame, smallAt + i * 1.2, 12) : 0;
          const dashed = drawn ? 0 : ease(frame, quickAt + (i - DRAWN) * 2, 10);
          const lit = i === 0 ? ease(frame, firstAt, 10) : 0;
          const dim = i === 0 ? 0 : ease(frame, firstAt + 4, 14) * 0.6;
          const cx = X0 + 30 + i * DOT_GAP;
          return (
            <React.Fragment key={i}>
              <Svg opacity={p * (1 - dim)}>
                {lit > 0 ? <circle cx={cx} cy={y(DOT_Y)} r={(R + 12 + 4 * swell) * lit} fill={HIGHLIGHT} /> : null}
                <circle
                  cx={cx}
                  cy={y(DOT_Y)}
                  r={R * p}
                  fill={drawn ? `color-mix(in srgb, ${BAR} ${fill * 85}%, ${PAPER})` : PAPER}
                  stroke={drawn ? BAR : INK_SOFT}
                  strokeWidth={2.2}
                  strokeDasharray={drawn ? undefined : dashed > 0.5 ? "5 5" : undefined}
                />
              </Svg>
              <div
                style={{
                  position: "absolute",
                  left: cx - 30,
                  top: y(DOT_Y) + h(32),
                  width: 60,
                  textAlign: "center",
                  opacity: p * (1 - dim),
                  ...label(19, i === 0 && lit > 0 ? INK : INK_SOFT),
                  fontWeight: 650,
                  ...TABULAR,
                }}
              >
                {i + 1}
              </div>
            </React.Fragment>
          );
        })}
        <Note at={smallAt} x={X0} y={y(DOT_Y) + h(100)} dim={firstAt + 4}>
          <span style={{ ...note(28, INK), whiteSpace: "nowrap" }}>
            <b style={{ color: BLUE_INK }}>12</b> worked through,{" "}
            <span style={{ opacity: ease(frame, numpyAt - 2, 10) }}>every number computed by hand in NumPy</span>
          </span>
        </Note>
        <Note at={quickAt} x={X0} y={y(DOT_Y) + h(150)} dim={firstAt + 4}>
          <span style={{ ...note(28, INK), whiteSpace: "nowrap" }}>
            <b>3</b> quick ones to close
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
