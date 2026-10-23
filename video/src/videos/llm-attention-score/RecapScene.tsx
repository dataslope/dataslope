import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { INK, INK_SOFT, label, PAPER, TABULAR } from "../../editorial/style";
import { FigLabel } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO } from "../../theme/fonts";
import { one, ROOT, three, TOKENS, TROPHY, two } from "./data";
import {
  Arrow,
  DATA,
  DATA_TINT,
  Fade,
  FIG_Y,
  Headline,
  KEY_INK,
  Kicker,
  Mono,
  POINT,
  POINT_INK,
  pulse,
  QUERY_INK,
  Spot,
  Svg,
  Tag,
  X0,
} from "./parts";

// ═══ Scene 5: the five steps in a row, and the many heads that run them ═══

const BOX_W = 290;
const GAP = 40;
const r0 = TROPHY.rows[0];
const STEPS = [
  {
    name: "Multiply and add",
    how: `${one(TROPHY.query[0])}×${one(r0.key[0])} + ${one(TROPHY.query[1])}×${one(r0.key[1])}`,
    value: two(r0.dot),
  },
  { name: "Scale", how: `÷ √2, that is ÷ ${ROOT.toFixed(3)}`, value: three(r0.score) },
  { name: "Raise e", how: `e to the ${three(r0.score)}`, value: three(r0.power) },
  { name: "Divide", how: `÷ ${three(TROPHY.total)}, the total`, value: three(r0.weight) },
  { name: "Blend", how: "the weights times the values", value: TROPHY.output2.map((x) => x.toFixed(2)).join(", ") },
];

/** A seeded-looking but fixed pattern of lit cells for each head: schematic,
 *  it says only that each head weighs the pairs its own way. */
const HEAD_LIT = [
  [0.9, 0.3, 0.2, 0.3, 0.8, 0.2, 0.5, 0.3, 0.3],
  [0.2, 0.9, 0.2, 0.8, 0.2, 0.3, 0.3, 0.3, 0.7],
  [0.3, 0.2, 0.8, 0.2, 0.3, 0.9, 0.8, 0.2, 0.2],
  [0.5, 0.5, 0.3, 0.3, 0.6, 0.4, 0.46, 0.3, 0.24],
];

export const RecapScene: React.FC = () => {
  const n = useNarration();
  const frame = useCurrentFrame();
  const { y } = useLayout();

  const from = n.beat("recap").from;
  const weightAt = n.word("recap", "attention weight");
  const stepAt = [
    n.word("recap", "Multiply and add"),
    n.word("recap", "scale"),
    n.word("recap", "raise e"),
    n.word("recap", "divide"),
    n.word("recap", "blend"),
  ];
  const realAt = n.word("heads", "real model");
  const pairAt = n.word("heads", "every pair");
  const headsAt = n.word("heads", "many heads");
  const onceAt = n.word("heads", "at once");
  const makingAt = n.word("heads", "making");

  const boxY = y(420);
  const boxX = (i: number) => X0 + i * (BOX_W + GAP);

  // Fig. 11: every query against every key, in many heads.
  const GX = X0 + 150;
  const GY = y(690);
  const CELL = 50;
  const headIn = (h: number) => headsAt - 4 + h * 5;

  return (
    <AbsoluteFill>
      {stepAt.map((t, i) => (
        <Sfx key={i} name="el-tap" at={t - 2} level={-27} />
      ))}
      <Sfx name="el-pencil" at={pairAt - 2} level={-35} />
      {[1, 2, 3].map((h) => (
        <Sfx key={`h${h}`} name="el-tap" at={headIn(h)} level={-30} />
      ))}
      <Sfx name="el-chime" at={n.beat("heads").end + 12} level={-32} />

      <Kicker at={from - 10}>Attention, by hand</Kicker>
      <Headline lead="One attention weight," turn="five steps." at={from} turnAt={stepAt[0] - 4} />

      {/* ── Fig. 10: the five steps, for the pronoun's weight on trophy ── */}
      <FigLabel n="10" title="The pronoun's weight on trophy, start to finish" at={from} x={X0} y={y(FIG_Y)} />
      {STEPS.map((s, i) => {
        const p = ease(frame, stepAt[i] - 4, 12);
        const glow = pulse(frame, weightAt, 30) * (i === 3 ? 1 : 0);
        return (
          <React.Fragment key={s.name}>
            {i ? <Arrow from={[boxX(i) - GAP + 6, boxY + 80]} to={[boxX(i) - 6, boxY + 80]} at={stepAt[i] - 6} color={INK_SOFT} width={2.2} /> : null}
            <Fade at={stepAt[i] - 4} style={{ left: boxX(i), top: boxY, width: BOX_W }}>
              <div
                style={{
                  boxSizing: "border-box",
                  width: BOX_W,
                  height: 160,
                  border: `2px solid ${i === 4 ? POINT : DATA}`,
                  borderRadius: 12,
                  background: i === 4 ? PAPER : DATA_TINT,
                  padding: "16px 20px",
                  boxShadow: glow > 0 ? `0 0 0 ${6 * glow}px color-mix(in srgb, ${POINT} 30%, transparent)` : undefined,
                  opacity: p,
                }}
              >
                <div style={{ ...label(24, INK) }}>
                  <span style={{ color: INK_SOFT, marginRight: 10 }}>{i + 1}</span>
                  {s.name}
                </div>
                <div style={{ fontFamily: MONO, fontSize: 20, fontWeight: 500, color: INK_SOFT, marginTop: 12, whiteSpace: "nowrap" }}>{s.how}</div>
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 34,
                    fontWeight: 700,
                    color: i === 3 || i === 4 ? POINT_INK : INK,
                    marginTop: 10,
                    whiteSpace: "nowrap",
                    ...TABULAR,
                  }}
                >
                  {s.value}
                </div>
              </div>
            </Fade>
          </React.Fragment>
        );
      })}

      {/* ── Fig. 11: every pair, in many heads ── */}
      <FigLabel n="11" title="Every query against every key, in every head" at={pairAt - 4} x={X0} y={y(600)} />
      <Svg opacity={ease(frame, pairAt - 2, 12)}>
        {[3, 2, 1, 0].map((h) => {
          const p = h === 0 ? 1 : ease(frame, headIn(h), 12);
          if (p <= 0) return null;
          const dx = h * 26;
          const dy = -h * 22;
          return (
            <g key={h} opacity={h === 0 ? 1 : p * 0.85} transform={`translate(${dx}, ${dy})`}>
              <rect x={GX - 8} y={GY - 8} width={3 * CELL + 16} height={3 * CELL + 16} rx={8} fill={PAPER} stroke={INK} strokeWidth={1.6} />
              {Array.from({ length: 9 }, (_, k) => {
                const r = Math.floor(k / 3);
                const c = k % 3;
                const computed = h === 0 && r === 2 && c === 0;
                const lit = HEAD_LIT[h][k];
                const fill = ease(frame, pairAt + 2 + k * 2, 8);
                return (
                  <rect
                    key={k}
                    x={GX + c * CELL + 2}
                    y={GY + r * CELL + 2}
                    width={CELL - 4}
                    height={CELL - 4}
                    rx={4}
                    fill={computed ? POINT : `color-mix(in srgb, ${DATA} ${Math.round(lit * 70)}%, ${PAPER})`}
                    opacity={computed ? 1 : fill}
                  />
                );
              })}
            </g>
          );
        })}
      </Svg>
      {/* Row and column names on the front head. */}
      {TOKENS.map((t, i) => (
        <React.Fragment key={t}>
          <div
            style={{
              position: "absolute",
              left: GX - 18,
              top: GY + i * CELL + 12,
              transform: "translateX(-100%)",
              opacity: ease(frame, pairAt, 10),
              ...label(20, QUERY_INK),
              whiteSpace: "nowrap",
            }}
          >
            <Mono>{t}</Mono>
          </div>
        </React.Fragment>
      ))}
      <Fade at={pairAt + 4} style={{ left: GX - 8, top: GY + 3 * CELL + 18 }}>
        <Tag size={20}>rows: queries · columns: keys</Tag>
      </Fade>
      <Fade at={pairAt + 8} style={{ left: GX + 3 * CELL + 120, top: GY + 2 * CELL + 2 }}>
        <span style={{ ...label(22, POINT_INK), whiteSpace: "nowrap" }}>
          ← <Mono>it</Mono> against <Mono>trophy</Mono>: {three(r0.weight)}
        </span>
      </Fade>
      <Fade at={onceAt} style={{ left: GX + 3 * CELL + 120, top: GY - 30 }}>
        <span style={{ ...label(22, INK_SOFT), whiteSpace: "nowrap" }}>many heads, at once</span>
      </Fade>
      <Fade at={makingAt - 2} style={{ left: GX + 3 * CELL + 120, top: GY + 30 }}>
        <span style={{ ...label(22, KEY_INK), whiteSpace: "nowrap" }}>each with its own queries, keys and values</span>
      </Fade>
      <Spot id="llm-attention-score-mix" at={realAt - 6} left={1330} top={y(620)} width={420} height={290} />
    </AbsoluteFill>
  );
};
