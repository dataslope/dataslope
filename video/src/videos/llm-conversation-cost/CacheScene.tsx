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
  Arrow,
  Axes,
  CACHED,
  CACHED_INK,
  CHART,
  FIG_Y,
  Headline,
  INK,
  INK_SOFT,
  Key,
  mix,
  NEW,
  NEW_INK,
  PAPER,
  pulse,
  SENT,
  Stairs,
  Svg,
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
const REQ_W = 300;

/**
 * The cache: the same forty turns, drawn as what each turn's input costs in
 * cents, so the bars start as Fig. 3's. Everything sent the turn before,
 * system prompt included, is read back at a twentieth of the price: those
 * parts turn teal and shrink to a twentieth, and the staircase flattens onto
 * its new slices. Forty turns, $1.19 to $0.26 for the whole bill. Then why
 * order matters: the cache matches a request from its first token up to the
 * first thing that changed, so what never changes goes first.
 */
export const CacheScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  // ── Cues ──
  const from = n.beat("cache").from;
  const repeatAt = n.word("cache", "repeat");
  const inCentsAt = n.word("cache", "in cents");
  const sendAt = n.word("twentieth", "send it all");
  const lastAt = n.word("twentieth", "sent last turn");
  const sysAt = n.word("twentieth", "system prompt included");
  const readAt = n.word("twentieth", "read back");
  const twentiethAt = n.word("twentieth", "twentieth");
  const newAt = n.word("flat", "new slice");
  const flatAt = n.word("flat", "flattens");
  const fortyAt = n.word("flat", "Forty turns");
  const dollarAt = n.word("flat", "dollar nineteen");
  const centsAt = n.word("flat", "twenty-six cents");
  const prefixFrom = n.beat("prefix").from;
  const requestAt = n.word("prefix", "request");
  // The match walks down the request: the top on "first token", the part
  // under it on "up to", and it stops at the new part on "changed".
  const fillAt = [n.word("prefix", "first token"), n.word("prefix", "up to"), n.word("prefix", "changed")];
  const neverAt = n.word("stable", "never changes");
  const firstAt = n.word("stable", "first");
  const matchAt = n.word("stable", "match");

  const geo = useGeo(1);
  const right = CHART.x0 + TURNS.length * CHART.slot;
  // "read back": what was sent before turns teal, the cache's color; then
  // "a twentieth": it shrinks to its price.
  const cacheTint = ease(frame, readAt - 2, 14);
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
  const billY = y(446) + 40;

  return (
    <AbsoluteFill>
      {/* ── Sound ── */}
      <Sfx name="el-sprinkle" at={from - 2} level={-33} />
      <Sfx name="el-pencil" at={lastAt - 2} level={-35} />
      <Sfx name="el-whoosh" at={twentiethAt - 6} level={-33} />
      <Sfx name="el-tap" at={dollarAt - 2} level={-26} />
      <Sfx name="el-tap" at={centsAt - 2} level={-25} />
      <Sfx name="el-pop" at={matchAt - 2} level={-31} />

      <Headline at={from - 6} second={twentiethAt - 4} italic="at a twentieth.">
        The cache bills the repeat
      </Headline>

      {/* ── Fig. 6: the same forty turns, their cents scale on "in cents" ── */}
      <FigLabel n="6" title={`Input each turn pays for, on ${NAME}`} at={from - 2} x={X0} y={y(FIG_Y)} />
      <div style={{ position: "absolute", right: 1920 - 1800, top: y(FIG_Y) + 2, display: "flex", gap: 30, alignItems: "center" }}>
        {/* What was sent before becomes what is read from the cache, in one slot. */}
        <span style={{ display: "inline-grid", justifyItems: "end" }}>
          <span style={{ gridArea: "1 / 1" }}>
            <Key at={from} out={readAt - 2} swatch={SENT}>
              sent before
            </Key>
          </span>
          <span style={{ gridArea: "1 / 1" }}>
            <Key at={readAt + 4} swatch={CACHED}>
              read from the cache
            </Key>
          </span>
        </span>
        <Key at={from + 4} swatch={NEW}>
          new this turn
        </Key>
      </div>
      {/* The baseline with the bars; the cents scale on "in cents". */}
      <Svg opacity={ease(frame, from - 4, 12)}>
        <line x1={CHART.x0 - 12} x2={right + 10} y1={geo.base + 0.5} y2={geo.base + 0.5} stroke={INK} strokeWidth={1.6} />
      </Svg>
      <Axes geo={geo} at={inCentsAt - 4} money={cents} title="input cost of each turn" />
      <Stairs
        geo={geo}
        turns={TURNS}
        state={(t) => ({ sent: ease(frame, from - 2 + t * 0.6, 8), fresh: ease(frame, from + 1 + t * 0.6, 8) })}
        cache={cache}
        cacheTint={cacheTint}
        cacheRate={CACHE.fraction}
        glow={(t) => pulse(frame, newAt + t * 0.5, 16)}
        // "You still send it all": every bar, whole.
        flash={(t) => pulse(frame, sendAt + t * 0.6, 14)}
        // "the repeat", then "whatever you sent last turn": only what each
        // turn sent before, system prompt and all.
        flashSent={(t) => Math.max(pulse(frame, repeatAt - 2 + t * 0.6, 16), pulse(frame, lastAt + t * 0.6, 16))}
      />

      {/* What turn 40 sent last turn, before it shrinks: from the baseline, so
          the system prompt is in it. */}
      <VBracket x={right + 10} y0={geo.ty(LAST.resent)} y1={geo.base - 1} at={lastAt - 2} out={twentiethAt + 4} right={false} />
      <Note at={lastAt} out={twentiethAt + 4} x={right + 28} y={(geo.ty(LAST.resent) + geo.base) / 2 - 50} width={320}>
        <span style={{ display: "block", ...note(24, INK), fontWeight: 600 }}>sent last turn</span>
        <span style={{ display: "block", ...note(22, INK_SOFT), ...TABULAR }}>{int(LAST.resent)} tokens</span>
      </Note>
      <Note at={sysAt} out={twentiethAt + 4} x={right + 28} y={(geo.ty(LAST.resent) + geo.base) / 2 + 10} width={320}>
        <span style={{ display: "block", ...note(22, INK_SOFT) }}>system prompt included</span>
      </Note>

      {/* The staircase it was. */}
      <Svg opacity={ease(frame, twentiethAt + 4, 16)}>
        <path d={ghost} fill="none" stroke={INK_SOFT} strokeWidth={1.8} strokeDasharray="6 6" />
      </Svg>
      {/* Under the dashed edge and right of where it crosses, clear of Fig. 7. */}
      <Note at={flatAt - 4} x={geo.x(33) + 10} y={lastTop + 140}>
        <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>without the cache</span>
      </Note>
      <Note at={twentiethAt} x={RX} y={geo.base - 112} width={360}>
        <span style={{ display: "block", ...note(24, CACHED_INK), fontWeight: 650 }}>a twentieth of the price</span>
        <span style={{ display: "block", ...note(21, INK_SOFT), ...TABULAR }}>
          {usd(PRICE.cached, 2)} a million, not {usd(PRICE.in, 2)}
        </span>
      </Note>
      <Note at={newAt + 2} x={RX} y={geo.base - 206} width={360}>
        <span style={{ ...note(24, NEW_INK), fontWeight: 650, whiteSpace: "nowrap" }}>only the new slice pays in full</span>
      </Note>

      {/* Forty turns, with and without: the whole bill, replies and all, which
          is why it falls by less than the input drawn under it. */}
      <Note at={fortyAt - 4} x={CHART.x0 + 90} y={y(446)}>
        <span style={{ ...label(24, INK_SOFT), whiteSpace: "nowrap" }}>
          <span style={TABULAR}>{CACHE.turns}</span> turns, the whole bill with replies
        </span>
      </Note>
      <Note at={dollarAt - 4} x={CHART.x0 + 90} y={billY}>
        <span style={{ ...headline(52), color: INK_SOFT, ...TABULAR, ...halo }}>{usd(CACHE.plain)}</span>
      </Note>
      <Arrow from={[CHART.x0 + 280, billY + 28]} to={[CHART.x0 + 340, billY + 28]} at={centsAt - 6} dur={10} color={INK_SOFT} />
      <Note at={centsAt - 2} x={CHART.x0 + 360} y={billY}>
        <span style={{ display: "block", ...headline(52), color: CACHED_INK, ...TABULAR, ...halo }}>{usd(CACHE.cached)}</span>
        <span style={{ display: "block", marginTop: 14, ...note(26, INK), fontWeight: 650, ...halo }}>
          <span style={TABULAR}>{pct(CACHE.saved)}</span> less
        </span>
      </Note>

      {/* ── Fig. 7: one request, top to bottom ── */}
      <FigLabel n="7" title="One request, in order" at={prefixFrom - 2} x={RX} y={y(REQ_Y - 50)} />
      {REQUEST.map((row, i) => {
        const p = ease(frame, requestAt - 4 + i * 5, 12);
        if (p <= 0) return null;
        // The reusable part fills teal from the top; the first thing that
        // changed, the new part, fills solid blue.
        const fill = ease(frame, fillAt[i] - 2, 12);
        const mark = i === 0 ? pulse(frame, neverAt - 2, 26) : 0;
        const tone = row.cached ? CACHED : NEW;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: RX,
              top: y(REQ_Y + i * REQ_STEP) + (1 - p) * 8,
              width: REQ_W,
              height: 40,
              borderRadius: 4,
              boxSizing: "border-box",
              border: `2px solid ${tone}`,
              background: row.cached
                ? `color-mix(in srgb, ${CACHED} ${Math.round(fill * 34 + mark * 20)}%, ${PAPER})`
                : `color-mix(in srgb, ${NEW} ${Math.round(fill * 100)}%, ${PAPER})`,
              display: "flex",
              alignItems: "center",
              paddingLeft: 12,
              opacity: p,
              ...note(20, row.cached ? INK : mix(INK, PAPER, fill)),
              fontWeight: 600,
              whiteSpace: "nowrap",
            }}
          >
            {row.text}
          </div>
        );
      })}
      <Note at={firstAt - 4} x={RX + REQ_W + 12} y={y(REQ_Y) + 6}>
        <span style={{ ...note(22, INK), fontWeight: 650 }}>first</span>
      </Note>
      <Note at={matchAt + 2} x={RX} y={y(REQ_Y + 3 * REQ_STEP) + 2} width={360}>
        <span style={{ ...note(21, CACHED_INK), fontWeight: 600 }}>so the cache can match it</span>
      </Note>
    </AbsoluteFill>
  );
};
