import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { headline, label, TABULAR } from "../../editorial/style";
import { FigLabel, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { FRESH, TURNS, type Turn, usd } from "./data";
import { CHART, COST, FIG_Y, type Geo, Headline, INK, INK_SOFT, pulse, Stairs, Svg, X0 } from "./kit";

const RX = 1440;
/** px per token: forty turns' last request stands about 210 px tall. */
const K = 0.009;
const BASES = [566, 800];

/** Eight chats of five turns, laid end to end: each starts over. */
const SHORT: Turn[] = TURNS.map((_, i) => ({ ...TURNS[i % FRESH.turnsEach], turn: i + 1 }));

/**
 * What to do about it: start fresh. The same forty turns as one chat and as
 * eight five-turn chats, at one scale, so the eight small staircases show how
 * much less area they hold: $0.42 against $1.19. Then the takeaway.
 */
export const FreshScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  // ── Cues ──
  const from = n.beat("fresh").from;
  const longAt = n.word("fresh", "runs long");
  const freshAt = n.word("fresh", "fresh one");
  const eightAt = n.word("fresh", "Eight five-turn chats");
  const fortyTwoAt = n.word("fresh", "forty-two cents");
  const oneAt = n.word("fresh", "One forty-turn chat");
  const dollarAt = n.word("fresh", "dollar nineteen");
  const growsAt = n.word("end", "A chat grows");
  const sliceAt = n.word("end", "one slice");
  const billAt = n.word("end", "Its bill");
  const wholeAt = n.word("end", "whole chat");
  const end = n.beat("end").to;

  const geoAt = (base: number): Geo => {
    const b = y(base);
    return {
      slot: CHART.slot,
      bar: CHART.bar,
      k: K,
      base: b,
      top: b - 230,
      x: (turn) => CHART.x0 + (turn - 1) * CHART.slot,
      ty: (tokens) => b - tokens * K,
    };
  };
  const long = geoAt(BASES[0]);
  const short = geoAt(BASES[1]);
  const right = CHART.x0 + TURNS.length * CHART.slot;
  const sweep = (at: number) => (t: number) => ({ sent: ease(frame, at + t * 0.7, 8), fresh: ease(frame, at + 3 + t * 0.7, 8) });

  return (
    <AbsoluteFill>
      {/* ── Sound ── */}
      <Sfx name="el-sprinkle" at={from} level={-33} />
      <Sfx name="el-sprinkle" at={freshAt - 2} level={-33} />
      <Sfx name="el-tap" at={fortyTwoAt - 2} level={-25} />
      <Sfx name="el-tap" at={dollarAt - 2} level={-25} />
      <Sfx name="el-chime" at={end + 10} level={-32} />

      <Headline at={from - 6} second={freshAt - 4} italic="start a fresh one.">
        When a chat runs long,
      </Headline>

      <FigLabel n="8" title="Forty turns of chat, two ways" at={from - 2} x={X0} y={y(FIG_Y)} />

      {/* One chat of forty turns. */}
      <Note at={longAt - 4} x={CHART.x0} y={y(BASES[0] - 220)}>
        <span style={{ ...label(24, INK), whiteSpace: "nowrap" }}>one chat of forty turns</span>
      </Note>
      <Svg opacity={ease(frame, from - 2, 12)}>
        <line x1={CHART.x0 - 12} x2={right + 10} y1={long.base + 0.5} y2={long.base + 0.5} stroke={INK} strokeWidth={1.6} />
        <line x1={CHART.x0 - 12} x2={right + 10} y1={short.base + 0.5} y2={short.base + 0.5} stroke={INK} strokeWidth={1.6} />
      </Svg>
      <Stairs
        geo={long}
        turns={TURNS}
        state={sweep(from)}
        glow={(t) => pulse(frame, sliceAt + t * 0.3, 16)}
        flash={(t) => pulse(frame, wholeAt - 4 + t * 0.5, 16)}
      />
      <Note at={dollarAt - 4} x={RX} y={long.base - 70}>
        <span style={{ ...headline(52), color: COST, ...TABULAR }}>{usd(FRESH.one)}</span>
      </Note>

      {/* Eight chats of five turns, each starting over. */}
      <Note at={eightAt - 4} x={CHART.x0} y={y(BASES[1] - 110)}>
        <span style={{ ...label(24, INK), whiteSpace: "nowrap" }}>eight chats of five turns each</span>
      </Note>
      <Stairs geo={short} turns={SHORT} state={sweep(freshAt - 2)} glow={(t) => pulse(frame, sliceAt + t * 0.3, 16)} />
      {Array.from({ length: FRESH.chats - 1 }, (_, i) => {
        const x = CHART.x0 + (i + 1) * FRESH.turnsEach * CHART.slot - (CHART.slot - CHART.bar) / 2;
        return (
          <Svg key={i} opacity={ease(frame, eightAt + i * 2, 10)}>
            <line x1={x} x2={x} y1={short.base - 60} y2={short.base + 10} stroke={INK_SOFT} strokeWidth={1.6} strokeDasharray="4 5" />
          </Svg>
        );
      })}
      <Note at={fortyTwoAt - 4} x={RX} y={short.base - 70}>
        <span style={{ ...headline(52), color: COST, ...TABULAR }}>{usd(FRESH.eight)}</span>
      </Note>

      {/* The takeaway. */}
      <Headline at={growsAt - 4} second={billAt - 4} size={46} top={872} italic="Its bill grows by the whole chat.">
        A chat grows by one slice a turn.
      </Headline>
      <Note at={oneAt} x={RX} y={long.base - 112}>
        <span style={{ ...label(22, INK_SOFT), whiteSpace: "nowrap" }}>one chat</span>
      </Note>
      <Note at={eightAt} x={RX} y={short.base - 112}>
        <span style={{ ...label(22, INK_SOFT), whiteSpace: "nowrap" }}>eight chats</span>
      </Note>
    </AbsoluteFill>
  );
};
