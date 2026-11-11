import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease, map } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, BLUE_INK, HIGHLIGHT, INK, INK_SOFT, PAPER, label, note } from "../../editorial/style";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { Drift, Headline, Kicker, Line, Mark, OK, OK_INK, reach, VRule, X0 } from "./parts";

const COL_B = 980;

/** The line the timer leads: its font size, which is the timer's size. */
const TIMER_TEXT = 26;

/**
 * A timer with a short time left: Lucide's `timer` icon (ISC licence), drawn
 * at the size of the text beside it (`size`, its font size, so the icon is
 * 1em) with its 24-unit box centred on (x, y), and Lucide's own stroke.
 * Inside the dial the time left is a green wedge that shrinks from `at`, the
 * icon's hand riding its edge.
 */
const Timer: React.FC<{ x: number; y: number; at: number; size: number }> = ({ x, y, at, size }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12);
  if (p <= 0) return null;
  const s = size / 24;
  const sweep = 0.18 * Math.PI * 2 * map(frame, [at, at + 40], [1, 0.55]);
  const w = 6.2; // the wedge, inside the dial's stroke (the dial is r = 8 at 12,14)
  const ex = 12 + w * Math.sin(sweep);
  const ey = 14 - w * Math.cos(sweep);
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: p }}>
      <g transform={`translate(${x - 12 * s} ${y - 12 * s}) scale(${s})`} fill="none" stroke={OK} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <circle cx={12} cy={14} r={8} fill={PAPER} />
        <path d={`M12,14 L12,${14 - w} A${w},${w} 0 0 1 ${ex},${ey} Z`} fill={OK} stroke="none" opacity={0.85} />
        <line x1={10} x2={14} y1={2} y2={2} />
        <line x1={12} x2={ex} y1={14} y2={ey} />
      </g>
    </svg>
  );
};

/** Words in a row, each inking in on its own cue, set apart by middle dots. */
const WordRow: React.FC<{ x: number; y: number; size?: number; weight?: number; items: readonly { text: string; at: number; ink: string }[] }> = ({ x, y, size = 27, weight = 500, items }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ position: "absolute", left: x, top: y, display: "flex", alignItems: "baseline", gap: "0.55em", fontSize: size }}>
      {items.map((it, i) => {
        const p = ease(frame, it.at, 12);
        return (
          <React.Fragment key={it.text}>
            {i ? <span style={{ ...note(size, INK_SOFT), opacity: p }}>·</span> : null}
            <span style={{ ...note(size, it.ink), fontWeight: weight, whiteSpace: "nowrap", opacity: p, transform: `translateY(${(1 - p) * 8}px)` }}>{it.text}</span>
          </React.Fragment>
        );
      })}
    </div>
  );
};

/**
 * Question 5, when to use one: it cuts latency, takes traffic off the
 * origin and absorbs spikes. Anything static or cacheable goes at the edge
 * (images, JavaScript, CSS, video); dynamic, user-specific responses go to
 * the origin, or get a short time to live (how long the edge may keep a
 * copy), and even those save their handshake round trips at the edge. A
 * popular short link is the same redirect for everyone, so the edge can
 * answer it too, at a price, set under it in the edge's column: the click is
 * never counted, and a link taken down keeps working until its time to live
 * runs out. A short time to live answers both.
 */
export const EdgeScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  const from = n.beat("q5-use").from;
  const benefits = [
    { text: "Cuts latency", at: n.word("q5-use", "it cuts latency") },
    { text: "Takes traffic off your origin", at: n.word("q5-use", "takes traffic off your origin") },
    { text: "Absorbs spikes", at: n.word("q5-use", "absorbs spikes") },
  ];
  const useAt = n.word("q5-use", "Use it for anything static or cacheable");
  const kinds = [
    { text: "Images", at: n.word("q5-use", "images") },
    { text: "JavaScript", at: n.word("q5-use", "JavaScript") },
    { text: "CSS", at: n.word("q5-use", "CSS") },
    { text: "Video", at: n.word("q5-use", "and video") },
  ];
  const dynAt = n.word("q5-dyn", "Dynamic, user-specific responses");
  const bypassAt = n.word("q5-dyn", "usually bypass it");
  const ttlAt = n.word("q5-dyn", "or get a short time to live");
  const glossAt = n.word("q5-dyn", "how long the edge may keep a copy");
  const handAt = n.word("q5-dyn", "Even those save handshake round trips");
  const popularAt = n.word("q5-redirect", "A popular short link");
  const answerAt = n.word("q5-redirect", "so the edge can answer it too");
  const priceAt = n.word("q5-redirect", "The price");
  const countAt = n.word("q5-redirect", "so they can't count it");
  const downAt = n.word("q5-redirect", "a link you take down keeps working there");
  const shortAt = n.word("q5-redirect", "So keep that time short");
  const winAt = n.word("q5-win", "For a read-heavy product");
  const cheapAt = n.word("q5-win", "the cheapest large win");
  const end = n.beat("q5-win").to;

  const benY = y(282);
  const headY = y(380);
  const itemY = y(440);
  // The redirect: arrives on the origin's side, under its notes, then moves
  // to the edge; its price is set under it there.
  const move = ease(frame, answerAt, 20);
  const redirX = map(move, [0, 1], [COL_B, X0]);
  const redirY = map(move, [0, 1], [itemY + 196, y(522)]);
  const noteY = y(522) + 58;

  return (
    <AbsoluteFill>
      {benefits.map((b, i) => (
        <Sfx key={i} name="el-tap" at={b.at} level={-35} />
      ))}
      {kinds.map((k, i) => (
        <Sfx key={`k${i}`} name="el-tap" at={k.at} level={-37} />
      ))}
      <Sfx name="el-tap" at={dynAt} level={-36} />
      <Sfx name="el-pop" at={popularAt + 4} level={-34} />
      <Sfx name="el-whoosh" at={answerAt} level={-37} />
      <Sfx name="el-scratch" at={countAt} level={-36} />
      <Sfx name="el-scratch" at={downAt + 8} level={-36} />
      <Sfx name="el-chime" at={shortAt + 6} level={-36} />
      <Sfx name="el-pencil" at={cheapAt} level={-36} />

      <Drift from={from} to={end + 30}>
        <Kicker at={from}>Question 5 · CDNs</Kicker>
        <Headline lead="When to use one" at={from + 4} size={64} />

        {/* What it buys. */}
        <WordRow x={X0} y={benY} size={28} items={benefits.map((b) => ({ ...b, ink: OK_INK }))} />

        {/* What goes where. */}
        <VRule
          x={901}
          top={headY}
          bottom={reach(frame, itemY + 40, [
            [ttlAt, itemY + 96],
            [handAt, itemY + 160],
            [countAt - 6, noteY + 110],
            [downAt, noteY + 196],
            [shortAt, noteY + 262],
          ])}
          at={dynAt}
        />
        <Line x={X0} y={headY} at={useAt} size={29} weight={500} color={OK_INK}>
          At the edge: <span style={{ color: INK_SOFT, fontWeight: 500 }}>static or cacheable</span>
        </Line>
        <WordRow x={X0} y={itemY} size={27} items={kinds.map((k) => ({ ...k, ink: INK }))} />
        <Line x={COL_B} y={headY} at={dynAt} size={29} weight={500} color={BLUE_INK}>
          To the origin
        </Line>
        <Line x={COL_B} y={itemY + 4} at={dynAt + 4} size={26} weight={500}>
          Dynamic, user-specific responses
          <span style={{ color: INK_SOFT, fontWeight: 500, opacity: ease(frame, bypassAt, 10) }}> usually bypass it</span>
        </Line>
        <Line x={COL_B} y={itemY + 64} at={ttlAt} size={24} color={INK_SOFT}>
          or get a short time to live
          <span style={{ opacity: ease(frame, glossAt, 10) }}>: how long the edge may keep a copy</span>
        </Line>
        <Line x={COL_B} y={itemY + 128} at={handAt} size={24} weight={500} color={OK_INK}>
          even those save handshake round trips at the edge
        </Line>

        {/* The short link's redirect: from the origin's side to the edge. */}
        <Line x={redirX} y={redirY} at={popularAt + 4} size={26} weight={500} color={BLUE_INK}>
          A popular short link&apos;s redirect, the same for everyone
        </Line>
        {/* Its price, under it in the edge's column, then the fix. */}
        <Line x={X0} y={noteY} at={priceAt} size={25} weight={500}>
          The price
        </Line>
        <Line x={X0} y={noteY + 44} at={countAt - 6} size={24} weight={500} color={ACCENT_INK} width={720}>
          A click the edge answers never reaches your servers, so they can&apos;t count it
        </Line>
        <Line x={X0} y={noteY + 128} at={downAt} size={24} weight={500} color={ACCENT_INK} width={720}>
          A link you take down keeps working there until its time to live runs out
        </Line>
        {/* The timer at the line's own size, centred on it, 10px before it. */}
        <Timer x={X0 + 36 - 10 - TIMER_TEXT / 2} y={noteY + 226 + (TIMER_TEXT * 1.3) / 2} size={TIMER_TEXT} at={shortAt} />
        <Line x={X0 + 36} y={noteY + 226} at={shortAt + 4} size={TIMER_TEXT} weight={500} color={OK_INK}>
          so keep that time to live short
        </Line>

        {/* The verdict. */}
        <div style={{ position: "absolute", left: X0, top: y(846), display: "flex", alignItems: "baseline", fontSize: 32, opacity: ease(frame, winAt, 14) }}>
          <span style={{ ...label(32, INK), fontWeight: 500, whiteSpace: "nowrap" }}>
            A read-heavy product with users everywhere:{" "}
            <Mark at={cheapAt} color={HIGHLIGHT}>
              the cheapest large win there is
            </Mark>
          </span>
        </div>
      </Drift>
    </AbsoluteFill>
  );
};
