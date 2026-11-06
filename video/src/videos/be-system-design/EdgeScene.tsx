import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease, map } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, BAR, BLUE_INK, HAIRLINE, HIGHLIGHT, INK, INK_SOFT, PAPER, label } from "../../editorial/style";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { Drift, Headline, Kicker, Line, Mark, OK, OK_INK, Pill, X0 } from "./parts";

const COL_B = 980;
const OK_FILL = `color-mix(in srgb, ${OK} 12%, ${PAPER})`;
const DATA_FILL = `color-mix(in srgb, ${BAR} 10%, ${PAPER})`;

/** A timer with a short time left: a dial whose sweep is nearly gone. */
const Timer: React.FC<{ x: number; y: number; at: number }> = ({ x, y, at }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12);
  if (p <= 0) return null;
  const r = 22;
  const sweep = 0.18 * Math.PI * 2 * map(frame, [at, at + 40], [1, 0.55]);
  const ex = x + r * Math.sin(sweep);
  const ey = y - r * Math.cos(sweep);
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: p }}>
      <circle cx={x} cy={y} r={r + 4} fill={PAPER} stroke={OK} strokeWidth={3} />
      <path d={`M${x},${y} L${x},${y - r} A${r},${r} 0 0 1 ${ex},${ey} Z`} fill={OK} opacity={0.85} />
      <line x1={x} x2={x} y1={y - r - 4} y2={y - r - 11} stroke={OK} strokeWidth={4} strokeLinecap="round" />
    </svg>
  );
};

/**
 * Question 5, when to use one: it cuts latency, takes traffic off the
 * origin and absorbs spikes. Anything static or cacheable goes at the edge
 * (images, JavaScript, CSS, video); dynamic, user-specific responses go to
 * the origin, or get a short time to live. A popular short link is the same
 * redirect for everyone, so the edge can answer it too, at a price your
 * servers pay twice: the click is never counted, and a link taken down keeps
 * working until its time to live runs out. A short time to live answers both.
 */
export const EdgeScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  const from = n.beat("q5-use").from;
  const benefits = [
    { text: "cuts latency", at: n.word("q5-use", "it cuts latency") },
    { text: "takes traffic off your origin", at: n.word("q5-use", "takes traffic off your origin") },
    { text: "absorbs spikes", at: n.word("q5-use", "absorbs spikes") },
  ];
  const useAt = n.word("q5-use", "Use it for anything static or cacheable");
  const kinds = [
    { text: "images", at: n.word("q5-use", "images") },
    { text: "JavaScript", at: n.word("q5-use", "JavaScript") },
    { text: "CSS", at: n.word("q5-use", "CSS") },
    { text: "video", at: n.word("q5-use", "and video") },
  ];
  const dynAt = n.word("q5-use", "Dynamic, user-specific responses");
  const bypassAt = n.word("q5-use", "usually bypass it");
  const ttlAt = n.word("q5-use", "or get a short time to live");
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
  // The redirect: arrives on the origin's side, then moves to the edge.
  const move = ease(frame, answerAt, 20);
  const redirX = map(move, [0, 1], [COL_B, X0]);
  const redirY = map(move, [0, 1], [y(560), y(512)]);
  const noteY = y(586);

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
        <Kicker at={from}>Question 5 · What is a CDN, and when do you use one?</Kicker>
        <Headline lead="When to use one" at={from + 4} size={64} />

        {/* What it buys. */}
        {benefits.map((b, i) => (
          <Pill key={b.text} x={X0 + [0, 250, 676][i]} y={benY} at={b.at} ink={OK_INK} fill={OK_FILL} size={25}>
            {b.text}
          </Pill>
        ))}

        {/* What goes where. */}
        <div style={{ position: "absolute", left: COL_B - 50, top: headY - 6, width: 1.5, height: y(700) - headY, background: HAIRLINE, opacity: ease(frame, useAt, 12) }} />
        <Line x={X0} y={headY} at={useAt} size={29} weight={700} color={OK_INK}>
          At the edge: <span style={{ color: INK_SOFT, fontWeight: 500 }}>static or cacheable</span>
        </Line>
        {kinds.map((k, i) => (
          <Pill key={k.text} x={X0 + [0, 140, 312, 410][i]} y={itemY} at={k.at} size={25}>
            {k.text}
          </Pill>
        ))}
        <Line x={COL_B} y={headY} at={dynAt} size={29} weight={700} color={BLUE_INK}>
          To the origin
        </Line>
        <Line x={COL_B} y={itemY + 4} at={dynAt + 4} size={26} weight={600}>
          dynamic, user-specific responses
          <span style={{ color: INK_SOFT, fontWeight: 500, opacity: ease(frame, bypassAt, 10) }}>, usually</span>
        </Line>
        <Line x={COL_B} y={itemY + 50} at={ttlAt} size={24} color={INK_SOFT}>
          or a short time to live at the edge
        </Line>

        {/* The short link's redirect. */}
        <Pill x={redirX} y={redirY} at={popularAt + 4} ink={BLUE_INK} fill={DATA_FILL} size={25}>
          a popular short link&apos;s redirect, the same for everyone
        </Pill>
        <Line x={X0} y={noteY} at={priceAt} size={24} weight={700}>
          The price
        </Line>
        <Line x={X0} y={noteY + 44} at={countAt - 6} size={24} weight={600} color={ACCENT_INK}>
          a click the edge answers is never counted by your servers
        </Line>
        <Line x={X0} y={noteY + 86} at={downAt} size={24} weight={600} color={ACCENT_INK}>
          a link you take down keeps working there until its time to live runs out
        </Line>
        <Timer x={X0 + 26} y={noteY + 170} at={shortAt} />
        <Line x={X0 + 72} y={noteY + 155} at={shortAt + 4} size={26} weight={700} color={OK_INK}>
          so keep that time to live short
        </Line>

        {/* The verdict. */}
        <div style={{ position: "absolute", left: X0, top: y(800), display: "flex", alignItems: "baseline", fontSize: 32, opacity: ease(frame, winAt, 14) }}>
          <span style={{ ...label(32, INK), fontWeight: 650, whiteSpace: "nowrap" }}>
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
