import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { label, svgText } from "../../editorial/style";
import { Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ColHead, DATA_FILL, Drift, GOLD, INK, INK_SOFT, lerp, Line, Mark, OK, OK_INK, Q_SIZE, Svg, X0 } from "./parts";

const PANELS = [
  { x: X0, w: 740 },
  { x: 1020, w: 760 },
];
/** The two senses' neighbours, in a panel's own 0..1 space. */
const RIVER: readonly [string, number, number][] = [
  ["river", 0.12, 0.62],
  ["stream", 0.26, 0.86],
  ["shore", 0.05, 0.9],
];
const MONEY: readonly [string, number, number][] = [
  ["loan", 0.82, 0.04],
  ["deposit", 0.6, 0.38],
  ["cash", 0.88, 0.34],
];
const STATIC_BANK = [0.46, 0.5] as const;
const BANKS = [
  { at: [0.27, 0.62] as const, text: "the river bank" },
  { at: [0.74, 0.19] as const, text: "the savings bank" },
];

/**
 * Question 3. Two spaces side by side under their own headings. Static: one
 * point for "bank", stranded between the river words and the money words.
 * Contextual: two points, one per sentence, each moving from where the
 * static one sat into its own sense's cluster (green). Under each, its price:
 * a table lookup against a pass through the model, neither colored, since it
 * is a trade-off.
 */
export const ContextScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("q3").from;
  const qAt = n.word("q3", "Question three");
  const textAt = n.word("q3", "What is the difference");
  const staticAt = n.word("q3-a", "A static vector");
  const bankAt = n.word("q3-a", "puts bank at one point");
  const riverAt = n.word("q3-a", "river or money");
  const transAt = n.word("q3-a", "A transformer computes");
  const freshAt = n.word("q3-a", "a fresh vector for each occurrence");
  const sepAt = n.word("q3-a", "the two banks separate");
  const wonAt = n.word("q3-a", "transformers won");
  const passAt = n.word("q3-cost", "a pass through the model");
  const lookupAt = n.word("q3-cost", "a table lookup");
  const attnAt = n.word("attn-in", "attention");
  const end = n.beat("attn-in").to;

  const spaceTop = y(410);
  const spaceH = h(300);
  const px = (p: number, u: number) => PANELS[p].x + 30 + u * (PANELS[p].w - 160);
  const py = (v: number) => spaceTop + v * spaceH;
  const sep = ease(frame, sepAt, 22);

  const cluster = (p: number, at: number) =>
    [...RIVER, ...MONEY].map(([word, u, v], i) => {
      const o = ease(frame, at + i * 1.5, 10);
      if (o <= 0) return null;
      return (
        <g key={`${p}-${word}`} opacity={o}>
          <circle cx={px(p, u)} cy={py(v)} r={8} fill={DATA_FILL} />
          <text x={px(p, u) + 16} y={py(v) + 7} style={svgText(label(21, INK_SOFT))}>
            {word}
          </text>
        </g>
      );
    });

  return (
    <AbsoluteFill>
      <Sfx name="el-sprinkle" at={staticAt + 4} level={-35} />
      <Sfx name="el-tap" at={bankAt + 4} level={-31} />
      <Sfx name="el-sprinkle" at={transAt + 4} level={-35} />
      <Sfx name="el-whoosh" at={sepAt} level={-35} />
      <Sfx name="el-pencil" at={lookupAt} level={-37} />
      <Sfx name="el-pencil" at={attnAt} level={-36} />

      <Drift from={from} to={end + 40} scale={0.014}>
        <QuestionCard n={3} at={qAt - 4} textAt={textAt - 4} size={Q_SIZE}>
          What is the difference between static and contextual embeddings?
        </QuestionCard>

        <ColHead at={staticAt} x={PANELS[0].x} y={y(320)} w={PANELS[0].w}>
          Static
        </ColHead>
        <ColHead at={transAt} x={PANELS[1].x} y={y(320)} w={PANELS[1].w}>
          <Mark at={wonAt + 4}>Contextual</Mark>
        </ColHead>

        <Svg>
          {cluster(0, staticAt + 4)}
          {cluster(1, transAt + 4)}
          {/* Static: one point for both senses. */}
          {ease(frame, bankAt + 4, 10) > 0 ? (
            <circle cx={px(0, STATIC_BANK[0])} cy={py(STATIC_BANK[1])} r={11} fill={INK} opacity={ease(frame, bankAt + 4, 10)} />
          ) : null}
          {/* On "attention": each contextual bank drawn from the words around it. */}
          {BANKS.map((b, i) =>
            (i === 0 ? RIVER.slice(0, 2) : MONEY.slice(0, 2)).map(([word, u, v], k) => {
              const p = ease(frame, attnAt + i * 6 + k * 3, 12);
              if (p <= 0) return null;
              const x1 = px(1, b.at[0]);
              const y1 = py(b.at[1]);
              return <line key={`${i}-${word}`} x1={x1} y1={y1} x2={x1 + (px(1, u) - x1) * p} y2={y1 + (py(v) - y1) * p} stroke={GOLD} strokeWidth={2.4} />;
            }),
          )}
          {/* Contextual: one point per occurrence, each into its own sense. */}
          {BANKS.map((b, i) => {
            const o = ease(frame, freshAt + i * 6, 10);
            if (o <= 0) return null;
            const cx = lerp(px(1, STATIC_BANK[0]), px(1, b.at[0]), sep);
            const cy = lerp(py(STATIC_BANK[1]), py(b.at[1]), sep);
            return <circle key={i} cx={cx} cy={cy} r={11} fill={`color-mix(in srgb, ${OK} ${sep * 100}%, ${INK})`} opacity={o} />;
          })}
        </Svg>
        <Ink at={bankAt + 8} dur={12} style={{ left: px(0, STATIC_BANK[0]) - 26, top: py(STATIC_BANK[1]) - h(52), whiteSpace: "nowrap" }}>
          <span style={{ ...label(24, INK), fontWeight: 600 }}>bank</span>
        </Ink>
        <Ink at={riverAt + 4} dur={12} style={{ left: px(0, STATIC_BANK[0]) - 70, top: py(STATIC_BANK[1]) + h(24), whiteSpace: "nowrap" }}>
          <span style={{ ...label(21, INK_SOFT), fontWeight: 500 }}>river or money?</span>
        </Ink>
        {BANKS.map((b, i) => {
          const o = ease(frame, sepAt + 14 + i * 4, 12);
          const left = b.at[0] < 0.5;
          return (
            <div
              key={b.text}
              style={{
                position: "absolute",
                left: px(1, b.at[0]) + (left ? 22 : -260),
                width: 240,
                textAlign: left ? "left" : "right",
                top: py(b.at[1]) - 15,
                ...label(22, OK_INK),
                fontWeight: 600,
                whiteSpace: "nowrap",
                opacity: o,
              }}
            >
              {b.text}
            </div>
          );
        })}

        {/* What each costs. */}
        <Line at={lookupAt - 2} x={PANELS[0].x} y={y(780)} size={26}>
          A table lookup
        </Line>
        <Line at={passAt - 2} x={PANELS[1].x} y={y(780)} size={26}>
          A pass through the model
        </Line>
      </Drift>
    </AbsoluteFill>
  );
};
