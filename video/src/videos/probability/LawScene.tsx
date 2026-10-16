import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { body, fmt, headline, INK, INK_SOFT, label, note } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { SANS } from "../../theme/fonts";
import { Sfx } from "../../sound/Sfx";
import { LLN, llnAt, llnRange } from "./data";
import { Coin, DATA, Headline, lerp, Pulse, STAT, STAT_INK, Svg, Sweep, VBracket } from "./parts";

/** The chart: flips on a log axis, 1 to 5,000; the share of heads, 0 to 1. */
const CH = { x0: 210, x1: 1380, top: 352, base: 812 } as const;
const LOG_HI = Math.log10(LLN.n);
const fx = (k: number) => CH.x0 + (Math.log10(k) / LOG_HI) * (CH.x1 - CH.x0);
const TICKS = [1, 10, 100, 1000, 5000];
/** The memory panel, right of the chart. */
const MEM = { x0: 1530, pitch: 58, y: 430, r: 21 } as const;

const EARLY = llnRange(10, 100);
const LATE = llnRange(1000, LLN.n);
const FOUR = llnAt(4);

/**
 * Part 1, the law of large numbers: the lesson's running share of heads over
 * 5,000 flips, drawn as it is described, then the gambler's fallacy beside
 * it: a streak is not paid back, it is swamped.
 */
export const LawScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();
  const fy = (p: number) => y(CH.base) - h(CH.base - CH.top) * p;

  // ── Cues ──
  const llnFrom = n.beat("lln").from;
  const shareAt = n.word("lln", "share of heads");
  const fiveAt = n.word("lln", "five thousand flips");
  const everyAt = n.word("lln", "every one");
  const fourAt = n.word("early", "four flips");
  const quartersAt = n.word("early", "three quarters");
  const hundredAt = n.word("early", "a hundred");
  const fortyAt = n.word("early", "forty percent");
  const fiftySixAt = n.word("early", "fifty-six");
  const thousandAt = n.word("late", "a thousand");
  const straysAt = n.word("late", "strays");
  const pointAt = n.word("late", "a point and a half");
  const halfEnd = n.word("late", "one half", { edge: "end" });
  const lawAt = n.word("law", "law of large numbers");
  const noisyAt = n.word("law", "noisy");
  const stableAt = n.word("law", "stable");
  const shortAt = n.word("law", "short run");
  const longAt = n.word("law", "long run");
  const balanceAt = n.word("memory", "balancing out");
  const rowAt = n.word("memory", "five heads");
  const fiftyAt = n.word("memory", "fifty-fifty");
  const memoryAt = n.word("memory", "no memory");
  const paidAt = n.word("swamp", "paid back");
  const swampedAt = n.word("swamp", "swamped");
  const afterEnd = n.word("swamp", "after it", { edge: "end" });
  const tableInFrom = n.beat("table-in").from;
  const learnAt = n.word("table-in", "learn something");

  // How far along the flips the line has been drawn, in log10 of the flip count.
  const stages: [number, number, number][] = [
    [everyAt - 2, fourAt + 4, Math.log10(4)],
    [hundredAt - 4, fortyAt + 2, 2],
    [thousandAt - 4, straysAt + 2, 3],
    [straysAt + 2, halfEnd, LOG_HI],
  ];
  let reach = 0;
  for (const [a, b, to] of stages) {
    const p = ease(frame, a, Math.max(1, b - a));
    if (p > 0) reach = lerp(reach, to, p);
    if (p < 1) break;
    reach = to;
  }
  const K = 10 ** reach;
  const drawn = frame >= everyAt - 2;
  const pts = LLN.path.filter(([k]) => k <= K);
  const next = LLN.path.find(([k]) => k > K);
  const last = pts[pts.length - 1];
  const linePts =
    next && last && K > last[0]
      ? [...pts, [K, lerp(last[1], next[1], (K - last[0]) / (next[0] - last[0]))] as const]
      : pts;
  const d = linePts.map(([k, v], i) => `${i ? "L" : "M"}${fx(k).toFixed(1)},${fy(v).toFixed(1)}`).join(" ");

  // The red retrace of everything after the streak, during "swamped".
  const swamp = interpolate(frame, [swampedAt - 6, Math.max(swampedAt + 14, tableInFrom)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const swampK = 10 ** lerp(Math.log10(5), LOG_HI, swamp);
  const swampD = LLN.path
    .filter(([k]) => k >= 5 && k <= swampK)
    .map(([k, v], i) => `${i ? "L" : "M"}${fx(k).toFixed(1)},${fy(v).toFixed(1)}`)
    .join(" ");

  const axis = ease(frame, llnFrom - 2, 18);
  const ticks = ease(frame, shareAt, 14);
  const early = ease(frame, fortyAt - 2, 14);
  const late = ease(frame, pointAt - 4, 14);
  const fly = ease(frame, paidAt - 4, 22);
  const dimLine = ease(frame, swampedAt - 6, 12);

  return (
    <AbsoluteFill>
      {/* ── Sound: the line drawing, the two bands, the streak, the retrace ── */}
      <Sfx name="el-pencil" at={fourAt - 14} level={-34} />
      <Sfx name="el-pencil" at={hundredAt - 4} level={-35} />
      <Sfx name="el-tap" at={fortyAt - 2} level={-29} />
      <Sfx name="el-pencil" at={thousandAt - 4} level={-35} />
      <Sfx name="el-tap" at={pointAt - 4} level={-29} />
      <Sfx name="el-pop" at={rowAt - 4} level={-30} />
      <Sfx name="el-whoosh" at={paidAt - 4} level={-33} />

      <Headline top={y(150)} first="The share of heads," second="flip by flip." firstAt={llnFrom - 6} secondAt={shareAt + 4} out={lawAt - 8} />
      <Headline top={y(150)} first="The law of" second="large numbers." firstAt={lawAt - 4} secondAt={lawAt + 6} out={tableInFrom - 6} />
      <Headline top={y(150)} first="Most chances change" second="once you know more." firstAt={tableInFrom - 2} secondAt={learnAt - 4} />

      <FigLabel n="1" title={`Heads so far, over ${LLN.n.toLocaleString("en-US")} flips of a fair coin`} at={llnFrom} x={CH.x0} y={y(268)} />

      {/* ── Axes ── */}
      <Svg>
        <line x1={CH.x0} x2={lerp(CH.x0, CH.x1, axis)} y1={y(CH.base) + 0.5} y2={y(CH.base) + 0.5} stroke={INK} strokeWidth={1.6} />
        <g opacity={ticks}>
          {TICKS.map((k) => (
            <g key={k}>
              <line x1={fx(k)} x2={fx(k)} y1={y(CH.base) + 1} y2={y(CH.base) + 7} stroke={INK} strokeWidth={1.2} />
              <text x={fx(k)} y={y(CH.base) + 32} textAnchor="middle" style={{ fontFamily: SANS, fontSize: 21, fontWeight: 500, fill: INK_SOFT }}>
                {k.toLocaleString("en-US")}
              </text>
            </g>
          ))}
          <text x={CH.x1} y={y(CH.base) + 64} textAnchor="end" style={{ fontFamily: SANS, fontSize: 21, fontWeight: 650, fill: INK_SOFT }}>
            flips so far
          </text>
          {[0, 0.25, 0.5, 0.75, 1].map((p) => (
            <g key={p}>
              <line x1={CH.x0 - 6} x2={CH.x0} y1={fy(p)} y2={fy(p)} stroke={INK} strokeWidth={1.2} />
              <text x={CH.x0 - 14} y={fy(p) + 7} textAnchor="end" style={{ fontFamily: SANS, fontSize: 21, fontWeight: 500, fill: INK_SOFT }}>
                {p === 0 ? "0" : p === 1 ? "1" : fmt(p, 2).replace(/^0/, "")}
              </text>
            </g>
          ))}
        </g>
        {/* The truth: one half. */}
        <line
          x1={CH.x0}
          x2={lerp(CH.x0, CH.x1, ease(frame, fiveAt - 4, 18))}
          y1={fy(0.5)}
          y2={fy(0.5)}
          stroke={INK}
          strokeWidth={2}
          strokeDasharray="7 6"
        />
        {/* The two bands: how far the share swings, early and late. */}
        {early > 0 ? (
          <rect
            x={fx(10)}
            y={fy(EARLY.hi)}
            width={(fx(100) - fx(10)) * early}
            height={fy(EARLY.lo) - fy(EARLY.hi)}
            fill={STAT}
            opacity={0.12 + 0.22 * ease(frame, shortAt - 2, 8) * (1 - ease(frame, shortAt + 16, 14))}
          />
        ) : null}
        {late > 0 ? (
          <rect
            x={fx(1000)}
            y={fy(LATE.hi)}
            width={(fx(LLN.n) - fx(1000)) * late}
            height={fy(LATE.lo) - fy(LATE.hi)}
            fill={STAT}
            opacity={0.16 + 0.22 * ease(frame, longAt - 2, 8) * (1 - ease(frame, longAt + 16, 14))}
          />
        ) : null}
        {drawn ? (
          <path d={d} fill="none" stroke={DATA} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" opacity={1 - dimLine * 0.55} />
        ) : null}
        {swamp > 0 ? <path d={swampD} fill="none" stroke={DATA} strokeWidth={5.5} strokeLinejoin="round" strokeLinecap="round" /> : null}
        {/* Four flips in: three quarters. */}
        <circle cx={fx(4)} cy={fy(FOUR)} r={7 * ease(frame, quartersAt - 4, 8)} fill={STAT} />
      </Svg>
      <Pulse x={fx(4)} y={fy(FOUR)} at={quartersAt - 4} />
      <Note at={quartersAt} x={fx(4) + 16} y={fy(FOUR) - 46}>
        <span style={{ ...note(22, STAT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>4 flips: {fmt(FOUR)}</span>
      </Note>
      <Note at={fiveAt} x={CH.x1 + 12} y={fy(0.5) - 15}>
        <span style={{ ...note(21, INK), fontWeight: 600, whiteSpace: "nowrap" }}>½</span>
      </Note>

      {/* The early band's ends, said aloud. */}
      <VBracket x={fx(100) + 12} y0={fy(EARLY.hi)} y1={fy(EARLY.lo)} at={fortyAt} color={STAT} right />
      <Note at={fortyAt + 2} x={fx(100) + 34} y={fy(EARLY.lo) - 14}>
        <span style={{ ...note(22, STAT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>{Math.round(EARLY.lo * 100)}%</span>
      </Note>
      <Note at={fiftySixAt - 2} x={fx(100) + 34} y={fy(EARLY.hi) - 14}>
        <span style={{ ...note(22, STAT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>{Math.round(EARLY.hi * 100)}%</span>
      </Note>
      <Note at={pointAt} x={fx(1000)} y={fy(LATE.hi) - 74} from="up">
        <span style={{ ...note(22, STAT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>
          within {fmt(LLN.maxOffLate * 100, 1)} points of ½
        </span>
      </Note>

      {/* Short run, long run. */}
      <Ink at={noisyAt - 4} dur={14} style={{ left: fx(1.6), top: fy(1) - 8, whiteSpace: "nowrap" }}>
        <span style={{ ...body(34, true), color: INK }}>
          <Sweep at={noisyAt}>noisy</Sweep>
        </span>
      </Ink>
      <Ink at={stableAt - 4} dur={14} style={{ left: fx(1400), top: fy(1) - 8, whiteSpace: "nowrap" }}>
        <span style={{ ...body(34, true), color: INK }}>
          <Sweep at={stableAt}>stable</Sweep>
        </span>
      </Ink>

      {/* ── The gambler's fallacy, beside the chart ── */}
      <Ink at={balanceAt - 4} dur={14} out={paidAt + 8} style={{ left: MEM.x0 - MEM.r, top: y(MEM.y - 92), whiteSpace: "nowrap" }}>
        <span style={label(22, INK)}>Five heads in a row</span>
      </Ink>
      {Array.from({ length: 5 }, (_, i) => {
        const x0 = MEM.x0 + i * MEM.pitch;
        const y0 = y(MEM.y);
        // On "paid back" the streak flies into the first flips of the chart.
        const tx = fx(1 + i);
        const ty = fy(llnAt(1 + i));
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              transform: `translate(${lerp(0, tx - x0, fly)}px, ${lerp(0, ty - y0, fly)}px)`,
            }}
          >
            <Coin x={x0} y={y0} heads at={rowAt - 4 + i * 3} r={lerp(MEM.r, 9, fly)} />
          </div>
        );
      })}
      <Ink at={fiftyAt - 6} dur={14} style={{ left: MEM.x0 - MEM.r, top: y(MEM.y + 52), whiteSpace: "nowrap" }}>
        <span style={note(22, INK_SOFT)}>The next flip</span>
        <div style={{ ...headline(64, true), color: STAT_INK, marginTop: 6 }}>still ½</div>
      </Ink>
      <Ink at={memoryAt - 2} dur={14} style={{ left: MEM.x0 - MEM.r, top: y(MEM.y + 208), whiteSpace: "nowrap" }}>
        <span style={{ ...body(32, true), color: INK }}>No memory.</span>
      </Ink>
      <Note at={swampedAt} x={MEM.x0 - MEM.r} y={y(MEM.y + 290)} width={320}>
        <span style={{ ...note(22, INK), lineHeight: 1.35 }}>A streak is never paid back, only swamped.</span>
      </Note>
      <Note at={afterEnd - 6} x={fx(30)} y={y(CH.base) - h(60)}>
        <span style={{ ...note(21, DATA), fontWeight: 650, whiteSpace: "nowrap" }}>everything after the streak</span>
      </Note>
    </AbsoluteFill>
  );
};
