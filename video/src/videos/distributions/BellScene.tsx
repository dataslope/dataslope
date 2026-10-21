import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ease, pop } from "../../components/motion";
import { Axis, sx, type XScale } from "../../editorial/charts";
import { useLayout } from "../../editorial/layout";
import { fmt, halo, INK, INK_SOFT, note, PAPER } from "../../editorial/style";
import { FigLabel, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { mulberry32, normalPdf, PENGUINS } from "./data";
import { ASK, Bracket, Curve, curveD, DIST, Drift, Head, Kicker, lerp, pulse, Spot, Svg, VRule } from "./parts";

const X: XScale = { lo: 170, hi: 212, x0: 200, x1: 1460 };
const BASE = 840;
/** Two dots to a row in each two-millimetre bin. */
const R = 10.5;
const PITCH = 22;
const PER_ROW = 2;

/** Every penguin's dot: its bin and its place in the bin's stack, in the
 *  order they land (bins left to right, each from the bottom up). */
const DOTS = PENGUINS.counts.flatMap((c, bin) =>
  Array.from({ length: c }, (_, j) => ({ bin, row: Math.floor(j / PER_ROW), col: j % PER_ROW })),
);
const ORDER = DOTS.map((d, i) => ({ ...d, i })).sort((a, b) => a.row - b.row || a.bin - b.bin);
const TURN = new Map(ORDER.map((d, k) => [d.i, k]));

/**
 * "Many small effects add up", drawn before the penguins: forty dots, each
 * nudged left or right at ten rows of pegs (seeded), land at the sum of their
 * nudges and pile into a mound.
 */
const G = { n: 40, rows: 10, cx: 830, top: 392, row: 20, half: 22, r: 9, gap: 2.2, step: 3, drop: 8 };
const NUDGES = (() => {
  const rand = mulberry32(5);
  return Array.from({ length: G.n }, () => Array.from({ length: G.rows }, () => (rand() < 0.5 ? -1 : 1)));
})();
const SUMS = NUDGES.map((s) => s.reduce((a, b) => a + b, 0));
/** Each dot's place in its column's pile, counted from the bottom. */
const STACK = SUMS.map((v, i) => SUMS.slice(0, i).filter((w) => w === v).length);

/**
 * Part 3 opens: the normal as many small effects added up, seen in 151
 * Adelie flipper lengths, one dot each, with the normal fitted to their mean
 * and SD drawn over them; then the two numbers that set it.
 */
export const BellScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const bellFrom = n.beat("bell").from;
  const smallAt = n.word("bell", "many small");
  const addAt = n.word("bell", "add up");
  const flippersAt = n.word("penguins", "flippers");
  const nudgesEnd = n.word("penguins", "nudges", { edge: "end" });
  const bellAt = n.word("penguins", "bell");
  const twoAt = n.word("center", "Two numbers");
  const meanAt = n.word("center", "mean");
  const ninetyAt = n.word("center", "a hundred and ninety");
  const sdAt = n.word("spread", "standard deviation");
  const halfAt = n.word("spread", "six and a half");
  const everyAt = n.word("rule-in", "every normal");

  const base = y(BASE);
  const pitch = h(PITCH);
  const binW = sx(X, PENGUINS.lo + PENGUINS.bin) - sx(X, PENGUINS.lo);
  const span = nudgesEnd - flippersAt;
  const dotAt = (k: number) => flippersAt + 2 + (k / DOTS.length) * span;
  // The fitted normal, in dots: the count a bin should hold, in rows of two.
  const rowsAt = (v: number) => (PENGUINS.n * PENGUINS.bin * normalPdf(v, PENGUINS.mean, PENGUINS.sd)) / PER_ROW;
  const py = (rows: number) => base - rows * pitch - R * 0.2;
  const curve = curveD(rowsAt, 172, 210, X, py);
  const mx = sx(X, PENGUINS.mean);
  const topRow = Math.ceil(Math.max(...PENGUINS.counts) / PER_ROW);
  const labelY = base - topRow * pitch - h(50);
  const sdY = base + h(64);
  const glow = pulse(frame, everyAt - 4, 26);
  // The nudges, from "many small" until the penguins take over.
  const gStart = smallAt - 8;
  const gOut = ease(frame, flippersAt - 8, 14);
  const gPitch = h(19);
  const gDot = (i: number): readonly [number, number] | null => {
    const t = (frame - (gStart + i * G.gap)) / G.step;
    if (t < 0) return null;
    const steps = NUDGES[i];
    const xAt = (r: number) => G.cx + steps.slice(0, r).reduce((a, b) => a + b, 0) * G.half;
    const top = y(G.top);
    if (t < G.rows) {
      const r = Math.floor(t);
      const f = t - r;
      const k = f * f * (3 - 2 * f);
      return [lerp(xAt(r), xAt(r + 1), k), top + (r + f) * h(G.row)];
    }
    const pile = base - G.r - 1 - STACK[i] * gPitch;
    const d = Math.min(1, ((t - G.rows) * G.step) / G.drop);
    return [xAt(G.rows), lerp(top + G.rows * h(G.row), pile, d * d)];
  };

  return (
    <AbsoluteFill>
      {/* ── Sound: 151 penguins landing, the bell drawn over them, the mean,
           the spread ── */}
      <Sfx name="el-sprinkle" at={gStart + G.step * G.rows} level={-35} />
      <Sfx name="el-sprinkle" at={flippersAt + 2} level={-33} />
      <Sfx name="el-sprinkle" at={dotAt(DOTS.length * 0.55)} level={-35} />
      <Sfx name="el-pencil" at={bellAt - 6} level={-33} />
      <Sfx name="el-tap" at={meanAt - 2} level={-29} />
      <Sfx name="el-pencil" at={sdAt - 2} level={-35} />

      <Kicker at={bellFrom - 10}>The normal distribution</Kicker>
      <Head
        parts={[
          { text: "The normal:", at: bellFrom - 4 },
          { text: "small effects, added up.", at: addAt - 8, italic: true },
        ]}
      />

      <Spot id="distributions-penguin" at={flippersAt - 4} left={1540} top={y(250)} width={230} height={300} />

      <Drift from={bellFrom} to={n.beat("rule-in").to + 40}>
        {/* Small effects adding up: pegs, and dots nudged down through them. */}
        <Svg opacity={(1 - gOut) * ease(frame, gStart - 6, 12)}>
          {Array.from({ length: G.rows }, (_, r) =>
            Array.from({ length: r + 1 }, (_, j) => (
              <circle key={`${r}-${j}`} cx={G.cx + (2 * j - r) * G.half} cy={y(G.top) + r * h(G.row)} r={2.6} fill={INK_SOFT} opacity={0.55} />
            )),
          )}
          <line x1={G.cx - 12 * G.half} x2={G.cx + 12 * G.half} y1={base + 0.5} y2={base + 0.5} stroke={INK} strokeWidth={1.6} />
          {NUDGES.map((_, i) => {
            const p = gDot(i);
            return p ? <circle key={i} cx={p[0]} cy={p[1]} r={G.r} fill={DIST} stroke={PAPER} strokeWidth={1.4} /> : null;
          })}
        </Svg>
        <Note at={smallAt} x={G.cx + 12 * G.half + 30} y={y(G.top) - 14} out={flippersAt - 8}>
          <span style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap" }}>each dot: ten small nudges,</span>
          <br />
          <span style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap" }}>left or right, added up</span>
        </Note>

        <FigLabel n="9" title={`Flipper lengths of ${PENGUINS.n} Adelie penguins, in mm`} at={flippersAt - 6} x={160} y={y(300)} />
        <Axis scale={X} base={base} ticks={[170, 180, 190, 200, 210]} at={flippersAt - 4} />
        <Svg>
          {DOTS.map((d, i) => {
            const k = TURN.get(i) ?? 0;
            const p = pop(frame, dotAt(k), fps, 14);
            if (p <= 0.01) return null;
            const cx = sx(X, PENGUINS.lo + d.bin * PENGUINS.bin) + binW / 2 + (d.col - 0.5) * (2 * R + 2);
            const cy = base - R - 1 - d.row * pitch;
            return (
              <circle
                key={i}
                cx={cx}
                cy={cy - (1 - Math.min(1, p)) * 26}
                r={R * Math.min(1.1, p)}
                fill={DIST}
                stroke={PAPER}
                strokeWidth={1.4}
                opacity={Math.min(1, p * 1.4)}
              />
            );
          })}
        </Svg>
        <Note at={nudgesEnd - 30} x={160} y={y(BASE + 50)}>
          <span style={{ ...note(20, INK_SOFT), whiteSpace: "nowrap" }}>Each dot is one penguin.</span>
        </Note>

        <Curve d={curve} at={bellAt - 6} dur={30} color={ASK} width={lerp(3.2, 5, glow)} />
        <Note at={bellAt + 6} x={sx(X, 203.5)} y={base - h(150)}>
          <span style={{ ...note(23, ASK), fontWeight: 700, whiteSpace: "nowrap", ...halo }}>a normal, fitted to them</span>
        </Note>

        <VRule x={mx} bottom={base} top={labelY - 6} at={meanAt - 4} />
        <Note at={ninetyAt - 2} x={mx + 14} y={labelY - 10}>
          <span style={{ ...note(24, INK), fontWeight: 700, whiteSpace: "nowrap", ...halo }}>mean {fmt(PENGUINS.mean, 1)} mm</span>
        </Note>
        <Note at={twoAt} x={mx - 14} y={labelY - 10} align="right">
          <span style={{ ...note(22, INK), whiteSpace: "nowrap", ...halo }}>two numbers set it:</span>
        </Note>
        <Bracket x0={sx(X, PENGUINS.mean)} x1={sx(X, PENGUINS.mean + PENGUINS.sd)} y={sdY} at={sdAt - 2} color={INK} up />
        <Note at={halfAt - 4} x={sx(X, PENGUINS.mean + PENGUINS.sd) + 16} y={sdY - 14}>
          <span style={{ ...note(24, INK), fontWeight: 700, whiteSpace: "nowrap", ...halo }}>standard deviation, or SD: {fmt(PENGUINS.sd, 1)} mm</span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
