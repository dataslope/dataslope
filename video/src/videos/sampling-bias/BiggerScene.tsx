import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { fmt, halo, headline, INK, INK_SOFT, label, note } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { SANS } from "../../theme/fonts";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { LARGEST, mulberry32, POP_SIZE, SIZES, SWEEP, TIGHTENING, TRUE_MEAN, type Spread } from "./data";
import { EASY, EASY_INK, RANDOM, RANDOM_INK, Underline } from "./parts";
import { swell } from "../sampling/emphasis";

/** Sample size on a log axis, average score on a linear one. */
const LOG_LO = Math.log10(SIZES[0]);
const LOG_HI = Math.log10(SIZES[SIZES.length - 1]);
const PX = { x0: 360, x1: 1400 };
const SCORE = { lo: 64, hi: 86, base: 860, top: 420 };
const lx = (size: number) => PX.x0 + ((Math.log10(size) - LOG_LO) / (LOG_HI - LOG_LO)) * (PX.x1 - PX.x0);
const ly = (score: number) => SCORE.base - ((score - SCORE.lo) / (SCORE.hi - SCORE.lo)) * (SCORE.base - SCORE.top);
const TICKS = [65, 70, 75, 80, 85];
/** Dots drawn per column and method: the first of the 400 averages. */
const SHOWN = 60;
const JITTER_W = 46;
const JITTER = (() => {
  const r = mulberry32(2026);
  return Array.from({ length: SHOWN * 2 }, () => r() - 0.5);
})();

/**
 * "Ask more people": 400 samples by each method at five sizes from 50 to
 * 20,000. Both columns tighten; only the random one tightens onto the truth.
 */
export const BiggerScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  const biggerFrom = n.beat("bigger").from;
  const askAt = n.word("bigger", "Ask");
  const fiftyAt = n.word("bigger", "fifty");
  const twentyAt = n.word("bigger", "twenty thousand", { edge: "end" });
  const steadierAt = n.word("steadier", "steadier");
  const paceAt = n.word("steadier", "same pace");
  const closingAt = n.word("closing", "closing");
  const sharperAt = n.word("wrong", "sharper", { nth: 1 });
  const wrongAt = n.word("wrong", "wrong");
  const steadyFrom = n.beat("steady").from;
  const highAt = n.word("steady", "ten points high");
  // What the narration points at while the finished figure is talked about:
  // each method's line as it is named, the largest size, its steadiness.
  const randomOneAt = n.word("closing", "random one");
  const easySampleAt = n.word("wrong", "easy sample");
  const oneInTenAt = n.word("steady", "one customer in ten");
  const rockAt = n.word("steady", "rock steady");
  const randomLine = ease(frame, randomOneAt - 2, 12) * (1 - ease(frame, easySampleAt - 2, 12));
  const easyLine = ease(frame, easySampleAt - 2, 12) * (1 - ease(frame, steadyFrom, 16));

  // Columns arrive from "fifty" to "twenty thousand", one after another.
  const columnAt = (i: number) => fiftyAt + ((twentyAt - fiftyAt) * i) / (SIZES.length - 1);
  const bands = ease(frame, steadierAt - 4, 20);
  const last = lx(LARGEST.n);
  const truthY = ly(TRUE_MEAN);

  return (
    <AbsoluteFill>
      {/* A sprinkle as each sample size's averages pop in, a stroke for each line drawn. */}
      {SIZES.map((size, i) => (
        <Sfx key={size} name={i % 2 ? "sprinkle-2" : "sprinkle-3"} at={columnAt(i)} level={-31} />
      ))}
      <Sfx name="swish" at={wrongAt} level={-34} />
      <Sfx name="swish" at={steadyFrom + 4} level={-34} />

      <Ink at={askAt - 6} dur={18} style={{ left: 92, top: y(150), ...headline(84), whiteSpace: "nowrap" }}>
        Ask more people.
      </Ink>
      <Ink at={sharperAt - 4} dur={18} style={{ left: 92, top: y(246), ...headline(84, true), whiteSpace: "nowrap" }}>
        Sharper, and still <Underline at={wrongAt}>wrong.</Underline>
      </Ink>

      <FigLabel
        n="3"
        title="The average score of 400 samples at each size, each way"
        at={biggerFrom}
        x={160}
        y={y(358)}
      />

      {/* Axes. */}
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: ease(frame, biggerFrom, 14) }}>
        <line x1={PX.x0 - 40} x2={PX.x1 + 40} y1={y(SCORE.base) + 0.5} y2={y(SCORE.base) + 0.5} stroke={INK} strokeWidth={1.6} />
        {TICKS.map((t) => (
          <g key={t}>
            <line
              x1={PX.x0 - 40}
              x2={PX.x1 + 40}
              y1={y(ly(t))}
              y2={y(ly(t))}
              stroke={INK_SOFT}
              strokeWidth={1}
              strokeDasharray="2 6"
              opacity={0.55}
            />
            <text
              x={PX.x0 - 56}
              y={y(ly(t)) + 7}
              textAnchor="end"
              style={{ fontFamily: SANS, fontSize: 21, fontWeight: 500, fill: INK_SOFT, fontVariantNumeric: "tabular-nums" }}
            >
              {t}
            </text>
          </g>
        ))}
        {SIZES.map((s) => (
          <g key={s}>
            <line x1={lx(s)} x2={lx(s)} y1={y(SCORE.base) + 1} y2={y(SCORE.base) + 7} stroke={INK} strokeWidth={1.2} />
            <text
              x={lx(s)}
              y={y(SCORE.base) + 30}
              textAnchor="middle"
              style={{ fontFamily: SANS, fontSize: 21, fontWeight: 500, fill: INK_SOFT, fontVariantNumeric: "tabular-nums" }}
            >
              {s.toLocaleString("en-US")}
            </text>
          </g>
        ))}
      </svg>
      <div
        style={{
          position: "absolute",
          right: 1920 - (PX.x1 + 40),
          top: y(SCORE.base) + 48,
          opacity: ease(frame, biggerFrom, 14),
        }}
      >
        <span style={label(19, INK_SOFT)}>Customers in each sample</span>
      </div>

      {/* The truth, across every size. */}
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <line
          x1={PX.x0 - 40}
          x2={PX.x0 - 40 + (PX.x1 + 80 - PX.x0) * ease(frame, biggerFrom + 4, 20)}
          y1={y(truthY)}
          y2={y(truthY)}
          stroke={INK}
          strokeWidth={2}
          strokeDasharray="7 6"
        />
      </svg>
      <Note at={biggerFrom + 12} x={PX.x1 + 56} y={y(truthY) - 16}>
        <span style={{ ...note(21, INK_SOFT), ...halo }}>true average </span>
        <span style={{ ...note(22, INK), fontWeight: 700, ...halo }}>{fmt(TRUE_MEAN)}</span>
      </Note>

      {/* Where 95 in 100 averages fall, by method. */}
      <Band rows={SWEEP.map((r) => r.random)} color={RANDOM} p={bands} emph={randomLine} />
      <Band rows={SWEEP.map((r) => r.convenience)} color={EASY} p={bands} emph={easyLine} />

      {SWEEP.map((r, i) => (
        <Column
          key={r.n}
          x={lx(r.n)}
          random={r.random}
          easy={r.convenience}
          at={columnAt(i)}
          steadyAt={i === SWEEP.length - 1 ? rockAt : undefined}
        />
      ))}

      <Note at={steadierAt + 6} x={930} y={y(668)}>
        <span style={{ ...note(21, INK_SOFT), ...halo }}>Shaded: where 95 in 100 averages land</span>
      </Note>
      <Note at={paceAt - 2} x={930} y={y(584)}>
        <div style={{ ...label(21, INK), ...halo }}>The scatter, from 50 to 20,000 a sample:</div>
        <div style={{ ...note(22, INK_SOFT), marginTop: 6, ...halo }}>
          <b style={{ color: RANDOM_INK }}>{Math.round(TIGHTENING.random)} times</b> tighter at random,{" "}
          <b style={{ color: EASY_INK }}>{Math.round(TIGHTENING.convenience)}</b> the easy way
        </div>
      </Note>

      {/* End labels. */}
      <Note at={closingAt - 2} x={PX.x1 + 56} y={y(truthY) + 14}>
        <span style={{ ...note(22, RANDOM_INK), fontWeight: 700, ...halo }}>random {fmt(LARGEST.random.center)}</span>
      </Note>
      <Note at={wrongAt - 2} x={PX.x1 + 56} y={y(ly(LARGEST.convenience.center)) - 16}>
        <span
          style={{
            ...note(22, EASY_INK),
            fontWeight: 700,
            ...halo,
            display: "inline-block",
            transformOrigin: "left center",
            transform: `scale(${swell(frame, rockAt - 2, 0.18, 22)})`,
          }}
        >
          easy way {fmt(LARGEST.convenience.center)}
        </span>
      </Note>

      {/* "One customer in ten", over the largest size. */}
      <Note at={oneInTenAt - 2} x={last} y={y(ly(85.2))} from="up">
        <span style={{ display: "inline-block", transform: "translateX(-50%)", whiteSpace: "nowrap", ...note(21, INK_SOFT), ...halo }}>
          1 customer in {Math.round(POP_SIZE / LARGEST.n)}
        </span>
      </Note>

      {/* "Still almost ten points high", at the largest size. */}
      <VBracket x={last + 34} y0={y(truthY)} y1={y(ly(LARGEST.convenience.center))} at={steadyFrom + 4} />
      <Note at={highAt - 4} x={last + 56} y={y(ly((TRUE_MEAN + LARGEST.convenience.center) / 2)) - 30}>
        <div style={{ ...note(26, EASY_INK), fontWeight: 700, ...halo }}>
          {fmt(LARGEST.convenience.center - TRUE_MEAN)} points high
        </div>
        <div style={{ ...note(20, INK_SOFT), ...halo }}>
          with {(LARGEST.n / POP_SIZE).toLocaleString("en-US", { style: "percent" })} of all customers asked
        </div>
      </Note>
    </AbsoluteFill>
  );
};

/** One sample size: the first 60 of its 400 averages by each method,
 *  jittered sideways, popping in over a few frames. */
const Column: React.FC<{ x: number; random: Spread; easy: Spread; at: number; steadyAt?: number }> = ({
  x,
  random,
  easy,
  at,
  steadyAt,
}) => {
  const frame = useCurrentFrame();
  const { y } = useLayout();
  if (frame < at - 1) return null;
  const dots = (s: Spread, color: string, off: number) =>
    s.means.slice(0, SHOWN).map((v, j) => {
      const p = ease(frame, at + j * 0.25, 6);
      if (p <= 0) return null;
      return (
        <circle
          key={`${off}-${j}`}
          cx={x + JITTER[off + j] * JITTER_W}
          cy={y(ly(v))}
          r={4.2 * p * (steadyAt !== undefined && off > 0 ? swell(frame, steadyAt - 2 + j * 0.2, 0.5, 20) : 1)}
          fill={color}
          opacity={0.72}
        />
      );
    });
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
      {dots(random, RANDOM, 0)}
      {dots(easy, EASY, SHOWN)}
    </svg>
  );
};

/** The band where 95 in 100 averages fell (2.5th to 97.5th percentile),
 *  joined straight between the measured sizes. */
const Band: React.FC<{ rows: readonly Spread[]; color: string; p: number; emph?: number }> = ({ rows, color, p, emph = 0 }) => {
  const { y } = useLayout();
  if (p <= 0) return null;
  const xs = SIZES.map(lx);
  const top = rows.map((r, i) => `${xs[i]},${y(ly(r.hi))}`);
  const bottom = rows.map((r, i) => `${xs[i]},${y(ly(r.lo))}`).reverse();
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: p }}>
      <polygon points={[...top, ...bottom].join(" ")} fill={color} opacity={0.16} />
      <polyline
        points={rows.map((r, i) => `${xs[i]},${y(ly(r.center))}`).join(" ")}
        fill="none"
        stroke={color}
        strokeWidth={2 + 2.5 * emph}
        opacity={0.6 + 0.4 * emph}
      />
    </svg>
  );
};

/** A vertical bracket from y0 to y1 with short ticks pointing left. */
const VBracket: React.FC<{ x: number; y0: number; y1: number; at: number }> = ({ x, y0, y1, at }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 14);
  if (p <= 0) return null;
  const mid = (y0 + y1) / 2;
  const a = mid + (y0 - mid) * p;
  const b = mid + (y1 - mid) * p;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
      <path d={`M${x - 12},${a} L${x},${a} L${x},${b} L${x - 12},${b}`} fill="none" stroke={EASY} strokeWidth={2.4} />
    </svg>
  );
};
