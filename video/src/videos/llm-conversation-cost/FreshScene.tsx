import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { headline, label, note, TABULAR } from "../../editorial/style";
import { FigLabel, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { CACHE, FRESH, TURNS, type Turn, usd } from "./data";
import { Bracket, CACHED_INK, CHART, COST, FIG_Y, type Geo, Headline, INK, INK_SOFT, pulse, Stairs, Svg, X0 } from "./kit";

const RX = 1440;
/** The two columns of bills: without a cache, and with the one the scene
 *  before turned on. */
const COLS = [RX, RX + 196];
/** px per token: forty turns' last request stands about 210 px tall. */
const K = 0.009;
const BASES = [566, 800];

/** "the middle of a long chat": the turns the lesson's lost-in-the-middle
 *  effect is about, roughly the middle half (illustrative, not measured). */
const MIDDLE = [11, 30] as const;

/** Eight chats of five turns, laid end to end: each starts over. */
const SHORT: Turn[] = TURNS.map((_, i) => ({ ...TURNS[i % FRESH.turnsEach], turn: i + 1 }));

/**
 * What to do about it: start fresh. The same forty turns as one chat and as
 * eight five-turn chats, at one scale, so the eight small staircases show how
 * much less area they hold. Priced twice, as a two-by-two table beside them:
 * without a cache, $0.42 against $1.19; then with the cache the scene before
 * recommended, both staircases flatten and the gap nearly closes, $0.24
 * against $0.26. So the bigger reason left is accuracy. Then the takeaway.
 */
export const FreshScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  // ── Cues ──
  const from = n.beat("fresh").from;
  const longAt = n.word("fresh", "runs long");
  const freshAt = n.word("fresh", "fresh one");
  const withoutAt = n.word("nocache", "Without a cache");
  const eightAt = n.word("nocache", "eight five-turn chats");
  const fortyTwoAt = n.word("nocache", "forty-two cents");
  const dollarAt = n.word("nocache", "dollar nineteen");
  const withAt = n.word("withcache", "With the cache");
  const twentyFourAt = n.word("withcache", "twenty-four cents");
  const twentySixAt = n.word("withcache", "twenty-six");
  const startAt = n.word("withcache", "start fresh");
  const accuracyAt = n.word("withcache", "accuracy");
  const middleAt = n.word("withcache", "middle");
  const lessAt = n.word("withcache", "less well");
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
  // "With the cache": what each turn sent before shrinks to a twentieth, as
  // in Fig. 6, in both the long chat and the short ones.
  const cache = ease(frame, withAt, 26);
  // "a model recalls the middle of a long chat less well": the middle turns
  // of the long chat fade, until the takeaway.
  const midDim = ease(frame, lessAt - 2, 14) * (1 - ease(frame, growsAt - 4, 14));
  const inMiddle = (t: number) => t >= MIDDLE[0] && t <= MIDDLE[1];
  // "start fresh": each short chat's first turn, where it starts over.
  const restart = (t: number) => ((t - 1) % FRESH.turnsEach === 0 ? pulse(frame, startAt - 2 + ((t - 1) / FRESH.turnsEach) * 2, 18) : 0);
  // The staircases they were, left as a dashed edge, as in Fig. 6.
  const ghost = (g: Geo, turns: readonly Turn[]) =>
    turns
      .map((t) => {
        const top = g.ty(t.sent);
        const x = g.x(t.turn);
        return `${t.turn === 1 ? `M${x},${g.base} L${x},${top}` : `L${x},${top}`} L${x + g.slot},${top}`;
      })
      .join(" ");
  const bill = (value: number, at: number, cached: boolean, base: number, col: number) => (
    <Note at={at} x={COLS[col]} y={base - 66}>
      <span style={{ ...headline(46), color: cached ? CACHED_INK : COST, ...TABULAR }}>{usd(value)}</span>
    </Note>
  );

  return (
    <AbsoluteFill>
      {/* ── Sound ── */}
      <Sfx name="el-sprinkle" at={from} level={-33} />
      <Sfx name="el-sprinkle" at={freshAt - 2} level={-33} />
      <Sfx name="el-tap" at={fortyTwoAt - 2} level={-25} />
      <Sfx name="el-tap" at={dollarAt - 2} level={-25} />
      <Sfx name="el-whoosh" at={withAt} level={-34} />
      <Sfx name="el-tap" at={twentyFourAt - 2} level={-26} />
      <Sfx name="el-tap" at={twentySixAt - 2} level={-26} />
      <Sfx name="el-chime" at={end + 10} level={-32} />

      <Headline at={from - 6} second={freshAt - 4} italic="start a fresh one.">
        When a chat runs long,
      </Headline>

      <FigLabel n="8" title="Forty turns of chat, two ways, at one scale" at={from - 2} x={X0} y={y(FIG_Y)} />

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
        cache={cache}
        cacheRate={CACHE.fraction}
        dim={(t) => (inMiddle(t) ? midDim : 0)}
        glow={(t) => pulse(frame, sliceAt + t * 0.3, 16)}
        flash={(t) => pulse(frame, wholeAt - 4 + t * 0.5, 16)}
      />
      {/* The middle of the long chat, recalled less well. */}
      <Bracket
        x0={CHART.x0 + (MIDDLE[0] - 1) * CHART.slot}
        x1={CHART.x0 + MIDDLE[1] * CHART.slot - (CHART.slot - CHART.bar)}
        y={long.base + 26}
        at={middleAt - 2}
        out={growsAt - 4}
        up
      />
      <Note
        at={middleAt + 2}
        out={growsAt - 4}
        x={CHART.x0 + ((MIDDLE[0] - 1 + MIDDLE[1]) / 2) * CHART.slot - 200}
        y={long.base + 34}
        width={400}
        style={{ textAlign: "center" }}
      >
        <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>the middle, recalled less well</span>
      </Note>

      {/* Eight chats of five turns, each starting over. */}
      <Note at={eightAt - 4} x={CHART.x0} y={y(BASES[1] - 110)}>
        <span style={{ ...label(24, INK), whiteSpace: "nowrap" }}>eight chats of five turns each</span>
      </Note>
      <Stairs
        geo={short}
        turns={SHORT}
        state={sweep(freshAt - 2)}
        cache={cache}
        cacheRate={CACHE.fraction}
        glow={(t) => Math.max(pulse(frame, sliceAt + t * 0.3, 16), restart(t))}
      />
      {Array.from({ length: FRESH.chats - 1 }, (_, i) => {
        const x = CHART.x0 + (i + 1) * FRESH.turnsEach * CHART.slot - (CHART.slot - CHART.bar) / 2;
        const swell = pulse(frame, startAt - 2 + (i + 1) * 2, 18);
        return (
          <Svg key={i} opacity={ease(frame, eightAt + i * 2, 10)}>
            <line
              x1={x}
              x2={x}
              y1={short.base - 60}
              y2={short.base + 10}
              stroke={swell > 0 ? INK : INK_SOFT}
              strokeWidth={1.6 + 1.6 * swell}
              strokeDasharray="4 5"
            />
          </Svg>
        );
      })}

      <Svg opacity={ease(frame, withAt + 4, 16)}>
        <path d={ghost(long, TURNS)} fill="none" stroke={INK_SOFT} strokeWidth={1.8} strokeDasharray="6 6" />
        <path d={ghost(short, SHORT)} fill="none" stroke={INK_SOFT} strokeWidth={1.8} strokeDasharray="6 6" />
      </Svg>

      {/* The bills: a column without a cache, then one with it. */}
      <Note at={withoutAt - 2} x={COLS[0]} y={long.base - 112}>
        <span style={{ ...label(22, INK_SOFT), whiteSpace: "nowrap" }}>no cache</span>
      </Note>
      <Note at={withAt - 2} x={COLS[1]} y={long.base - 112}>
        <span style={{ ...label(22, CACHED_INK), whiteSpace: "nowrap" }}>with the cache</span>
      </Note>
      {bill(FRESH.one, dollarAt - 4, false, long.base, 0)}
      {bill(FRESH.eight, fortyTwoAt - 4, false, short.base, 0)}
      {bill(FRESH.oneCached, twentySixAt - 4, true, long.base, 1)}
      {bill(FRESH.eightCached, twentyFourAt - 4, true, short.base, 1)}
      {/* With the gap nearly closed, what is left is the other half of the
          lesson's "a cost decision as well as an accuracy one". */}
      <Note at={accuracyAt - 2} x={COLS[0]} y={long.base + 40} width={360}>
        <span style={{ display: "block", ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>the bigger reason left:</span>
        <span style={{ display: "block", ...note(28, INK), fontWeight: 650, whiteSpace: "nowrap" }}>accuracy</span>
      </Note>

      {/* The takeaway. */}
      <Headline at={growsAt - 4} second={billAt - 4} size={46} top={872} italic="Its bill grows by the whole chat.">
        A chat grows by one slice a turn.
      </Headline>
    </AbsoluteFill>
  );
};
