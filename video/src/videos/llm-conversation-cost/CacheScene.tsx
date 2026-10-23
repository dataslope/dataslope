import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { halo, headline, label, note, TABULAR } from "../../editorial/style";
import { FigLabel, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { CACHE, int, LAST, NAME, pct, PRICE, TURNS, usd } from "./data";
import {
  Axes,
  CACHED,
  CACHED_INK,
  CHART,
  FIG_Y,
  Headline,
  INK,
  INK_SOFT,
  Key,
  NEW,
  NEW_INK,
  PAPER,
  pulse,
  SENT,
  Stairs,
  Strike,
  Svg,
  TRI,
  useGeo,
  VBracket,
  X0,
} from "./kit";

const RX = 1440;
/** One request, top to bottom: what a cache can reuse, and what it cannot. */
const REQUEST = [
  { text: "system prompt", cached: true },
  { text: "earlier turns", cached: true },
  { text: "the reply and your message", cached: false },
];
const REQ_Y = 440;
const REQ_STEP = 46;

/**
 * The cache: the same forty turns, drawn as what each turn's input costs, so
 * the bars start as Fig. 3's. Everything sent the turn before is read back
 * at a twentieth of the price: those parts turn teal and shrink to a
 * twentieth, and the staircase flattens onto its new slices. Forty turns,
 * $1.19 to $0.26. Then the rule that keeps a cache matching: what never
 * changes goes first.
 */
export const CacheScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  // ── Cues ──
  const from = n.beat("cache").from;
  const triAt = n.word("cache", "triangle");
  const sendAt = n.word("cache", "send it all");
  const lastAt = n.word("cache", "sent last turn");
  const twentiethAt = n.word("cache", "twentieth");
  const newAt = n.word("flat", "new slice");
  const flatAt = n.word("flat", "flattens");
  const fortyAt = n.word("flat", "Forty turns");
  const dollarAt = n.word("flat", "dollar nineteen");
  const centsAt = n.word("flat", "twenty-six cents");
  const stableFrom = n.beat("stable").from;
  const neverAt = n.word("stable", "never changes");
  const firstAt = n.word("stable", "first");
  const matchAt = n.word("stable", "match");

  const geo = useGeo(1);
  const right = CHART.x0 + TURNS.length * CHART.slot;
  const cache = ease(frame, twentiethAt - 6, 26);
  const cents = (t: number) => `${Math.round((t * PRICE.in) / 1e4)}¢`;

  // The uncached staircase, left behind as a dashed edge once the cache
  // shrinks it.
  const ghost = TURNS.map((t) => {
    const top = geo.ty(t.sent);
    const x = geo.x(t.turn);
    return `${t.turn === 1 ? `M${x},${geo.base} L${x},${top}` : `L${x},${top}`} L${x + geo.slot},${top}`;
  }).join(" ");
  const lastTop = geo.ty(LAST.sent);
  const L = geo.ty(TURNS[0].system);
  const triTop = geo.ty(TURNS[0].system + 22000);

  return (
    <AbsoluteFill>
      {/* ── Sound ── */}
      <Sfx name="el-sprinkle" at={from - 2} level={-33} />
      <Sfx name="el-pencil" at={triAt - 2} level={-35} />
      <Sfx name="el-whoosh" at={twentiethAt - 6} level={-33} />
      <Sfx name="el-tap" at={dollarAt - 2} level={-26} />
      <Sfx name="el-tap" at={centsAt - 2} level={-25} />
      <Sfx name="el-pop" at={matchAt - 2} level={-31} />

      <Headline at={from - 6} second={twentiethAt - 4} italic="at a twentieth.">
        The cache bills the repeat
      </Headline>

      {/* ── Fig. 6 ── */}
      <FigLabel n="6" title={`Input each turn pays for, on ${NAME}`} at={from - 2} x={X0} y={y(FIG_Y)} />
      <div style={{ position: "absolute", right: 1920 - 1800, top: y(FIG_Y) + 2, display: "flex", gap: 30, alignItems: "center" }}>
        {/* What was sent before becomes what is read from the cache, in one slot. */}
        <span style={{ display: "inline-grid", justifyItems: "end" }}>
          <span style={{ gridArea: "1 / 1" }}>
            <Key at={from} out={twentiethAt - 2} swatch={SENT}>
              sent before
            </Key>
          </span>
          <span style={{ gridArea: "1 / 1" }}>
            <Key at={twentiethAt + 4} swatch={CACHED}>
              read from the cache
            </Key>
          </span>
        </span>
        <Key at={from + 4} swatch={NEW}>
          new this turn
        </Key>
      </div>
      <Axes geo={geo} at={from - 4} money={cents} title="input cost of each turn" />
      <Stairs
        geo={geo}
        turns={TURNS}
        state={(t) => ({ sent: ease(frame, from - 2 + t * 0.6, 8), fresh: ease(frame, from + 1 + t * 0.6, 8) })}
        cache={cache}
        cacheRate={CACHE.fraction}
        glow={(t) => pulse(frame, newAt + t * 0.5, 16)}
        flash={(t) => pulse(frame, sendAt + t * 0.6, 14)}
      />

      {/* What the cache goes after: the triangle, briefly. */}
      <Svg opacity={ease(frame, triAt - 2, 10) * (1 - ease(frame, twentiethAt - 6, 12))}>
        <path
          d={`M${CHART.x0},${L} L${right},${triTop} L${right},${L} Z`}
          fill="none"
          stroke={TRI}
          strokeWidth={2.6}
          strokeDasharray="10 7"
          strokeLinejoin="round"
        />
      </Svg>

      {/* What turn 40 sent last turn, before it shrinks. */}
      <VBracket x={right + 10} y0={geo.ty(LAST.resent)} y1={geo.base - 1} at={lastAt - 2} out={twentiethAt + 4} right={false} />
      <Note at={lastAt} out={twentiethAt + 4} x={right + 28} y={(geo.ty(LAST.resent) + geo.base) / 2 - 34} width={320}>
        <span style={{ display: "block", ...note(24, INK), fontWeight: 600 }}>sent last turn</span>
        <span style={{ display: "block", ...note(22, INK_SOFT), ...TABULAR }}>{int(LAST.resent)} tokens</span>
      </Note>

      {/* The staircase it was. */}
      <Svg opacity={ease(frame, twentiethAt + 4, 16)}>
        <path d={ghost} fill="none" stroke={INK_SOFT} strokeWidth={1.8} strokeDasharray="6 6" />
      </Svg>
      <Note at={flatAt - 4} x={right - 10} y={lastTop - 58} align="right">
        <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>without the cache</span>
      </Note>
      <Note at={twentiethAt} x={RX} y={geo.base - 112} width={360}>
        <span style={{ display: "block", ...note(24, CACHED_INK), fontWeight: 650 }}>a twentieth of the price</span>
        <span style={{ display: "block", ...note(21, INK_SOFT), ...TABULAR }}>
          {usd(PRICE.cached, 2)} a million, not {usd(PRICE.in, 2)}
        </span>
      </Note>
      <Note at={newAt + 2} x={RX} y={geo.base - 206} width={360}>
        <span style={{ ...note(24, NEW_INK), fontWeight: 650 }}>only the new slice pays full price</span>
      </Note>

      {/* Forty turns, with and without. */}
      <Note at={fortyAt - 4} x={CHART.x0 + 90} y={y(528)}>
        <span style={{ ...label(24, INK_SOFT), ...TABULAR }}>{CACHE.turns} turns</span>
      </Note>
      <Note at={dollarAt - 4} x={CHART.x0 + 90} y={y(528) + 40}>
        <span style={{ ...headline(52), color: INK_SOFT, ...TABULAR, ...halo }}>
          <Strike at={centsAt - 4}>{usd(CACHE.plain)}</Strike>
        </span>
      </Note>
      <Note at={centsAt - 2} x={CHART.x0 + 360} y={y(528) + 40}>
        <span style={{ display: "flex", alignItems: "baseline", gap: 18, whiteSpace: "nowrap" }}>
          <span style={{ ...headline(52), color: CACHED_INK, ...TABULAR, ...halo }}>{usd(CACHE.cached)}</span>
          <span style={{ ...note(26, INK), fontWeight: 650, ...TABULAR }}>{pct(CACHE.saved)} less</span>
        </span>
      </Note>

      {/* ── Fig. 7: one request, top to bottom ── */}
      <FigLabel n="7" title="One request, top to bottom" at={stableFrom - 2} x={RX - 40} y={y(REQ_Y - 50)} />
      {REQUEST.map((row, i) => {
        const p = ease(frame, stableFrom + i * 5, 12);
        if (p <= 0) return null;
        const fill = row.cached ? ease(frame, matchAt - 2 + i * 5, 12) : ease(frame, matchAt + 8, 12);
        const mark = i === 0 ? pulse(frame, neverAt - 2, 26) : 0;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: RX,
              top: y(REQ_Y + i * REQ_STEP) + (1 - p) * 8,
              width: 340,
              height: 40,
              borderRadius: 4,
              boxSizing: "border-box",
              border: `2px solid ${row.cached ? CACHED : NEW}`,
              background: `color-mix(in srgb, ${row.cached ? CACHED : NEW} ${Math.round(fill * 34 + mark * 20)}%, ${PAPER})`,
              display: "flex",
              alignItems: "center",
              paddingLeft: 14,
              opacity: p,
              ...note(21, INK),
              fontWeight: 600,
            }}
          >
            {row.text}
          </div>
        );
      })}
      <Note at={firstAt - 4} x={RX - 18} y={y(REQ_Y) + 6} align="right">
        <span style={{ ...note(22, INK), fontWeight: 650 }}>first</span>
      </Note>
      <Note at={matchAt + 2} x={RX} y={y(REQ_Y + 3 * REQ_STEP) + 2} width={360}>
        <span style={{ ...note(21, CACHED_INK), fontWeight: 600 }}>so the cache can match it</span>
      </Note>
    </AbsoluteFill>
  );
};
