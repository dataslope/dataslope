import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, INK, INK_SOFT, PAPER, label, svgText } from "../../editorial/style";
import { Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { PERCENTILES } from "./data";
import { Drift, Headline, int, Kicker, Line, X0 } from "./parts";

const P = PERCENTILES;
const HX0 = X0;
const HX1 = 1700;
const SQ = 12;
const SQ_GAP = 3.5;

/**
 * Question 2, the habit: latency quoted as a percentile, never a mean.
 * charts/latency-percentiles.mjs's simulated sample (its seed, 40,000 draws,
 * check.mjs), binned as the chart bins it: the median 24 ms, the mean 31,
 * pulled right by the tail, and the 99th percentile 286 ms. Then a page of a
 * hundred calls, each with a one-in-a-hundred chance of the tail: at least
 * one on 63% of loads.
 */
export const TailScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  const from = n.beat("q2-tail").from;
  const quoteAt = n.word("q2-tail", "quote latency as a percentile");
  const sampleAt = n.word("q2-tail", "In a simulated sample");
  const medianAt = n.word("q2-tail", "the median takes twenty-four milliseconds");
  const meanAt = n.word("q2-tail", "the mean thirty-one");
  const oneAt = n.word("q2-tail", "one request in a hundred");
  const p99At = n.word("q2-tail", "two hundred and eighty-six or more");
  const pageAt = n.word("q2-fanout", "A page that makes a hundred calls");
  const chanceAt = n.word("q2-fanout", "each with that one-in-a-hundred chance");
  const hitsAt = n.word("q2-fanout", "hits at least one");
  const sixtyAt = n.word("q2-fanout", "sixty-three percent of loads");
  const end = n.beat("q2-fanout").to;

  const top = y(410);
  const base = y(612);
  const [lo, hi] = P.domain;
  const bw = (hi - lo) / P.counts.length;
  const sx = (ms: number) => HX0 + ((ms - lo) / (hi - lo)) * (HX1 - HX0);
  const peak = Math.max(...P.counts);
  const hy = (c: number) => base - (c / peak) * (base - top);
  const rowA = top - 92;
  const rowB = top - 50;

  const rule = (ms: number, at: number, from: number, color: string, dash?: string) => {
    const p = ease(frame, at, 14);
    return p > 0 ? <line x1={sx(ms)} x2={sx(ms)} y1={base - (base - from) * p} y2={base} stroke={color} strokeWidth={3} strokeDasharray={dash} /> : null;
  };

  const sqY = y(752);
  const sqX = (i: number) => X0 + i * (SQ + SQ_GAP);
  const slow = 63;
  const red = ease(frame, hitsAt, 8);

  return (
    <AbsoluteFill>
      <Sfx name="el-sprinkle" at={sampleAt + 4} level={-34} />
      <Sfx name="el-pencil" at={medianAt} level={-36} />
      <Sfx name="el-pencil" at={meanAt} level={-36} />
      <Sfx name="el-pencil" at={p99At} level={-35} />
      <Sfx name="el-sprinkle" at={pageAt + 2} level={-33} />
      <Sfx name="el-tap" at={hitsAt} level={-33} />
      <Sfx name="el-chime" at={sixtyAt + 6} level={-36} />

      <Drift from={from} to={end + 30}>
        <Kicker at={from}>Question 2 · Back-of-the-envelope numbers</Kicker>
        <Headline lead="A percentile," turn="never a mean." at={quoteAt - 4} turnAt={quoteAt + 18} size={70} />

        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          {/* The tail past the p99. */}
          <rect
            x={sx(P.marks.p99)}
            y={rowA - 6}
            width={(HX1 - sx(P.marks.p99)) * ease(frame, oneAt, 16)}
            height={base - rowA + 6}
            fill={`color-mix(in srgb, ${ACCENT} 9%, ${PAPER})`}
          />
          {P.counts.map((c, i) => {
            const p = ease(frame, sampleAt + 2 + i * 0.6, 12);
            const h = (base - hy(c)) * p;
            if (c === 0) return null;
            return (
              <rect
                key={i}
                x={sx(lo + i * bw) + 1}
                y={base - Math.max(h, p > 0 ? 3 : 0)}
                width={sx(lo + bw) - sx(lo) - 2}
                height={Math.max(h, p > 0 ? 3 : 0)}
                fill={sx(lo + i * bw) >= sx(P.marks.p99) - 1 ? ACCENT : BAR}
                opacity={0.8}
              />
            );
          })}
          <line x1={HX0} x2={HX1} y1={base} y2={base} stroke={INK} strokeWidth={1.4} opacity={ease(frame, sampleAt, 10)} />
          {[0, 50, 100, 150, 200, 250, 300].map((t) => (
            <g key={t} opacity={ease(frame, sampleAt + 4, 12)}>
              <line x1={sx(t)} x2={sx(t)} y1={base} y2={base + 7} stroke={INK} strokeWidth={1.2} />
              <text x={sx(t)} y={base + 32} textAnchor="middle" style={svgText({ ...label(20, INK_SOFT), fontWeight: 500 })}>
                {t}
              </text>
            </g>
          ))}
          <text x={HX1} y={base + 62} textAnchor="end" style={svgText({ ...label(20, INK_SOFT) })} opacity={ease(frame, sampleAt + 8, 12)}>
            milliseconds
          </text>
          {rule(P.marks.median, medianAt, rowA - 4, INK)}
          {rule(P.marks.mean, meanAt, rowB - 4, INK_SOFT, "6 5")}
          {rule(P.marks.p99, p99At, rowA - 4, ACCENT)}
        </svg>

        <Line x={sx(P.marks.median) + 14} y={rowA} at={medianAt + 4} size={24} weight={700}>
          median <Num>{Math.round(P.marks.median)}</Num> ms
        </Line>
        <Line x={sx(P.marks.mean) + 14} y={rowB} at={meanAt + 4} size={24} weight={600} color={INK_SOFT}>
          mean <Num>{Math.round(P.marks.mean)}</Num> ms
        </Line>
        <Line x={sx(P.marks.p99) - 14} y={rowA} at={p99At + 4} size={24} weight={700} color={ACCENT_INK} align="right">
          99th percentile <Num>{Math.round(P.marks.p99)}</Num> ms
        </Line>
        <Line x={sx(P.marks.p99) - 14} y={rowB} at={oneAt + 4} size={24} weight={600} color={ACCENT_INK} align="right">
          one request in a hundred, or slower
        </Line>
        <Line x={X0} y={y(262)} at={sampleAt} size={22} color={INK_SOFT}>
          a simulated sample of <Num>{int(P.n)}</Num> requests
        </Line>

        {/* A hundred calls, one page load. */}
        <Line x={X0} y={sqY - 52} at={pageAt} size={25} weight={700}>
          One page load: <Num>{P.calls}</Num> calls
          <span style={{ color: INK_SOFT, fontWeight: 500, opacity: ease(frame, chanceAt, 10) }}>, each 1 in 100 to be that slow</span>
        </Line>
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          {Array.from({ length: P.calls }, (_, i) => {
            const p = ease(frame, pageAt + 2 + i * 0.25, 6);
            const hit = i === slow ? red : 0;
            return (
              <rect
                key={i}
                x={sqX(i)}
                y={sqY}
                width={SQ}
                height={SQ}
                rx={2}
                fill={hit > 0 ? `color-mix(in srgb, ${ACCENT} ${Math.round(hit * 100)}%, ${BAR})` : BAR}
                opacity={p * (0.55 + 0.45 * hit)}
                transform={hit > 0 ? `translate(${sqX(i) + SQ / 2} ${sqY + SQ / 2}) scale(${1 + 0.5 * hit}) translate(${-sqX(i) - SQ / 2} ${-sqY - SQ / 2})` : undefined}
              />
            );
          })}
        </svg>
        <Line x={X0} y={sqY + 46} at={sixtyAt} size={28} weight={700}>
          1 − 0.99<sup style={{ fontSize: "0.62em" }}>100</sup> ≈{" "}
          <span style={{ color: ACCENT_INK }}>
            <Num>{Math.round(P.hitsTail * 100)}</Num>% of page loads
          </span>{" "}
          hit at least one
        </Line>
        <Line x={X0} y={sqY + 96} at={sixtyAt + 12} size={21} color={INK_SOFT}>
          if each call lands in the slowest <Num>{Math.round(P.tailShare * 100)}</Num>% on its own
        </Line>
      </Drift>
    </AbsoluteFill>
  );
};
