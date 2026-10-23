import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, halo, HAIRLINE, INK, INK_SOFT, label, note, TABULAR } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ATTENTION, count, kTokens } from "./data";
import { Drift, Headline, Kicker, Svg, tint, X0 } from "./kit";

/** Fig. 16: every token compared with every other, at two lengths. */
const CELL = 30;
const GRID_Y = 330;
const GRIDS = [
  { n: 6, x: 150 },
  { n: 12, x: 420 },
] as const;
/** Fig. 17: work against length, both axes logarithmic. */
const LX0 = 1010;
const LX1 = 1600;
const L_TOP = 330;
const L_BASE = 790;
const W_MAX = 30000;
const X_TICKS = [8000, 32000, 128000, 1000000];
const Y_TICKS = [1, 10, 100, 1000, 10000];

/**
 * Square, square-num, reason-in: why long context took years. Every token
 * attends to every other, so the work is the square of the length: from
 * 8,000 tokens to 1,000,000 is 125 times the text and 15,625 times the
 * naive attention work (measure.py).
 */
export const SquareScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();
  const start = n.beat("square").from;
  const buildAt = n.word("square", "build");
  const everyAt = n.word("square", "Every token");
  const otherAt = n.word("square", "every other token");
  const squareAt = n.word("square", "square");
  const eightAt = n.word("square-num", "eight thousand");
  const millionAt = n.word("square-num", "a million");
  const textAt = n.word("square-num", "hundred and twenty-five");
  const fifteenAt = n.word("square-num", "fifteen thousand");
  const reasonAt = n.beat("reason-in").from;
  const purposeAt = n.word("reason-in", "on purpose");

  const lx = (v: number) => LX0 + ((LX1 - LX0) * Math.log10(v / ATTENTION.short)) / Math.log10(ATTENTION.long / ATTENTION.short);
  const ly = (w: number) => y(L_BASE) - ((y(L_BASE) - y(L_TOP)) * Math.log10(w)) / Math.log10(W_MAX);
  const curve = (key: "linear" | "quadratic") =>
    ATTENTION.curve.map((p, i) => `${i ? "L" : "M"}${lx(p.n).toFixed(1)},${ly(p[key]).toFixed(1)}`).join(" ");
  const linP = ease(frame, millionAt - 4, 26);
  const quadP = ease(frame, fifteenAt - 20, 30);

  return (
    <AbsoluteFill>
      <Sfx name="el-sprinkle" at={otherAt - 2} level={-35} />
      <Sfx name="el-sprinkle" at={squareAt - 2} level={-35} />
      <Sfx name="el-pencil" at={millionAt - 4} level={-35} />
      <Sfx name="el-whoosh" at={fifteenAt - 20} level={-34} />

      <Drift from={start} to={n.beat("think").from} amount={0.012} origin="45% 60%">
      <Kicker at={start - 6}>Context windows</Kicker>
      <Headline lead="Why did long context take years?" at={start - 4} out={everyAt - 8} />
      <Headline lead="Every token attends to every other," turn="so the work is squared." at={everyAt - 4} turnAt={squareAt - 2} out={reasonAt - 8} size={52} />
      <Headline lead="Reasoning models spend tokens" turn="on purpose." at={reasonAt - 4} turnAt={purposeAt - 2} />

      {/* Fig. 16: the pairs attention compares, at a length and at twice it. */}
      <FigLabel n="16" title="Every token compared with every other" at={buildAt - 6} x={X0} y={y(250)} />
      {GRIDS.map((g, k) => {
        const fillAt = k === 0 ? otherAt - 4 : squareAt - 4;
        const side = g.n * CELL;
        const top = y(GRID_Y);
        return (
          <React.Fragment key={g.n}>
            <Svg opacity={ease(frame, (k === 0 ? buildAt : everyAt) - 2, 12)}>
              {/* The tokens along the top and the side. */}
              {Array.from({ length: g.n }, (_, i) => (
                <React.Fragment key={i}>
                  <rect x={g.x + i * CELL + 4} y={top - 18} width={CELL - 8} height={10} fill={BAR} />
                  <rect x={g.x - 18} y={top + i * CELL + 4} width={10} height={CELL - 8} fill={BAR} />
                </React.Fragment>
              ))}
              <rect x={g.x} y={top} width={side} height={side} fill="none" stroke={INK} strokeWidth={1.4} />
              {Array.from({ length: g.n * g.n }, (_, c) => {
                const r = Math.floor(c / g.n);
                const col = c % g.n;
                const p = ease(frame, fillAt + (r * g.n + col) * (k === 0 ? 0.9 : 0.18), 6);
                if (p <= 0) return null;
                return (
                  <rect
                    key={c}
                    x={g.x + col * CELL + 2}
                    y={top + r * CELL + 2}
                    width={CELL - 4}
                    height={CELL - 4}
                    fill={tint(k === 0 ? BAR : ACCENT, 44)}
                    opacity={p}
                  />
                );
              })}
            </Svg>
            <Note at={fillAt + (k === 0 ? 30 : 24)} x={g.x} y={top + side + 18}>
              <span style={{ ...note(22, k === 0 ? BLUE_INK : ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap", ...TABULAR }}>
                {g.n} tokens, {g.n * g.n} pairs
              </span>
            </Note>
          </React.Fragment>
        );
      })}

      {/* Fig. 17: the work, against a reference that grows only with the text. */}
      <FigLabel n="17" title="Work, relative to an 8,000-token context" at={eightAt - 6} x={LX0 - 60} y={y(250)} />
      <Svg opacity={ease(frame, eightAt - 2, 12)}>
        {Y_TICKS.map((w) => (
          <line key={w} x1={LX0} x2={LX1} y1={ly(w)} y2={ly(w)} stroke={HAIRLINE} strokeWidth={0.8} strokeDasharray="2 5" />
        ))}
        <line x1={LX0} x2={LX1} y1={ly(1)} y2={ly(1)} stroke={INK} strokeWidth={1.6} />
        <path d={curve("linear")} fill="none" stroke={BAR} strokeWidth={3} strokeDasharray="7 5" pathLength={1} style={{ clipPath: `inset(0 ${(1 - linP) * 100}% 0 0)` }} />
        <path d={curve("quadratic")} fill="none" stroke={ACCENT} strokeWidth={3.4} pathLength={1} strokeDasharray={`${quadP} 1`} />
      </Svg>
      {Y_TICKS.map((w) => (
        <div key={w} style={{ position: "absolute", right: 1920 - LX0 + 12, top: ly(w) - 13, opacity: ease(frame, eightAt, 12), ...note(20, INK_SOFT) }}>
          {count(w)}×
        </div>
      ))}
      {X_TICKS.map((v) => (
        <div
          key={v}
          style={{ position: "absolute", left: lx(v) - 40, width: 80, top: ly(1) + 12, textAlign: "center", opacity: ease(frame, eightAt, 12), ...note(20, INK_SOFT) }}
        >
          {kTokens(v)}
        </div>
      ))}
      <Ink at={eightAt + 4} dur={12} style={{ left: LX0, top: ly(1) + 44, width: LX1 - LX0, textAlign: "center" }}>
        <span style={label(20)}>Context length, in tokens</span>
      </Ink>
      <Note at={textAt - 2} x={LX1 + 14} y={ly(ATTENTION.lengthRatio) - 16}>
        <span style={{ ...note(24, BLUE_INK), fontWeight: 700, ...TABULAR, ...halo }}>{count(ATTENTION.lengthRatio)}×</span>
        <div style={note(20, INK_SOFT)}>the text</div>
      </Note>
      <Note at={fifteenAt - 2} x={LX1 + 14} y={ly(ATTENTION.workRatio) - 16}>
        <span style={{ ...note(24, ACCENT_INK), fontWeight: 700, ...TABULAR, ...halo }}>{count(ATTENTION.workRatio)}×</span>
        <div style={note(20, INK_SOFT)}>the work</div>
      </Note>
      </Drift>
    </AbsoluteFill>
  );
};
