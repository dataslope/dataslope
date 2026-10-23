import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { halo, headline, label, note, TABULAR } from "../../editorial/style";
import { FigLabel, Leader, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { int, LAST, SYSTEM, TURNS, USER, REPLY } from "./data";
import {
  Arrow,
  Axes,
  Bracket,
  CHART,
  clamp01,
  pulse,
  FIG_Y,
  Headline,
  INK,
  INK_SOFT,
  Key,
  LINE,
  LINE_EDGE,
  NEW,
  NEW_INK,
  OUTPUT_INK,
  PAPER,
  SENT,
  Spot,
  Stairs,
  Svg,
  TRI,
  TRI_FILL,
  TRI_INK,
  useGeo,
  VBracket,
  X0,
} from "./kit";

/** The chat as the app sends it: role, x, width (layout px). */
const BUBBLES = [
  { text: "system prompt", x: 200, w: 560, r: 6 },
  { text: "your message", x: 500, w: 260, r: 16 },
  { text: "reply", x: 200, w: 380, r: 16 },
  { text: "your message", x: 500, w: 260, r: 16 },
  { text: "reply", x: 200, w: 380, r: 16 },
  { text: "your next message", x: 460, w: 300, r: 16 },
];
const BUBBLE_Y = 372;
const BUBBLE_H = 48;
const BUBBLE_STEP = 66;
/** The right-hand column, beside the forty bars. */
const RX = 1440;
/** Where the up-close labels sit. */
const ZX = 600;

const smooth = (t: number) => {
  const c = clamp01(t);
  return c * c * (3 - 2 * c);
};

/**
 * The resend, then its bill. The model keeps no memory, so each turn sends
 * the whole chat: turn one and turn two up close, then the camera pulls back
 * to forty turns of stacked bars (sent before, and new this turn). Then the
 * bars close into an area, which is the bill; it splits into a rectangle
 * (the system prompt) and a triangle (the chat, resent); and doubling the
 * turns doubles the one and quadruples the other, four copies of the old
 * triangle tiling the new. One scene, so the chart never cross-fades with
 * itself.
 */
export const StairsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  // ── Cues: the resend ──
  const memFrom = n.beat("memory").from;
  const modelAt = n.word("memory", "model");
  const noMemAt = n.word("memory", "no memory");
  const everyAt = n.word("memory", "every turn");
  const sendsAt = n.word("memory", "sends");
  const wholeAt = n.word("memory", "whole chat");
  const topAt = n.word("memory", "from the top");
  const oneAt = n.word("first", "Turn one");
  const twoThAt = n.word("first", "two-thousand-token");
  const sysAt = n.word("first", "system prompt");
  const firstMsgAt = n.word("first", "first message");
  const twoAt = n.word("second", "Turn two");
  const againAt = n.word("second", "again");
  const replyAt = n.word("second", "reply");
  const fiveAt = n.word("second", "five hundred fifty");
  const newTokAt = n.word("second", "new tokens");
  const climbFrom = n.beat("climb").from;
  const stairAt = n.word("climb", "staircase");
  const fortyAt = n.word("forty", "forty");
  const countAt = n.word("forty", "twenty-three thousand");
  // ── Cues: the area ──
  const areaFrom = n.beat("area").from;
  const payAt = n.word("area", "pay");
  const areaAt = n.word("area", "area");
  const underAt = n.word("area", "staircase");
  const repliesAt = n.word("area", "replies");
  const cutAt = n.word("split", "Cut");
  const rectAt = n.word("split", "rectangle");
  const sameAt = n.word("split", "same every turn");
  const triAt = n.word("triangle", "triangle");
  const chatAt = n.word("triangle", "chat itself");
  const againAndAt = n.word("triangle", "again and again");
  const nowAt = n.beat("double").from;
  const doubleAt = n.word("double", "double the turns");
  const longAt = n.word("double", "twice as long");
  const long2At = n.word("four", "twice as long");
  const tallAt = n.word("four", "twice as tall");
  const fourAt = n.word("four", "four");

  // ── The camera: two turns up close, then all forty ──
  const zAt = (f: number) => smooth((f - climbFrom - 2) / (stairAt + 8 - climbFrom - 2));
  const z = zAt(frame);
  const geo = useGeo(z);
  const full = useGeo(1);
  const zoomed = useGeo(0);
  const right = CHART.x0 + TURNS.length * CHART.slot;

  // Each bar's arrival: turn one grows (its system prompt, then its
  // message); every later turn slides over from the turn before, the resend,
  // and its new slice drops on top.
  // A later bar arrives once the camera has pulled back far enough for it
  // to fit: the zoom at which its height fills the frame, found frame by frame.
  const zFits = (sent: number) => Math.log(CHART.maxZ / sent) / Math.log(CHART.maxZ / CHART.max);
  const barAt = (t: number) => {
    const need = zFits(TURNS[t - 1].sent);
    let f = climbFrom;
    while (zAt(f) < need && f < stairAt + 8) f++;
    return f - 3;
  };
  const state = (t: number) => {
    if (t === 1) {
      const sys = SYSTEM / (SYSTEM + USER);
      return { sent: 0, fresh: sys * ease(frame, twoThAt - 2, 16) + (1 - sys) * ease(frame, firstMsgAt - 2, 10) };
    }
    if (t === 2) return { sent: ease(frame, againAt - 6, 18), fresh: ease(frame, replyAt - 2, 14), slide: true };
    return { sent: ease(frame, barAt(t), 8), fresh: ease(frame, barAt(t) + 4, 8), slide: true };
  };

  // The area: gaps close and the new slices blend in; then grey under the
  // system prompt's line, purple over it.
  const merge = ease(frame, areaAt - 4, 18);
  const lineTint = ease(frame, rectAt - 2, 16);
  const triTint = ease(frame, triAt - 2, 16);
  const L = full.ty(SYSTEM);
  const slot = full.slot;
  const x20 = CHART.x0 + 20 * slot;
  const x40 = right;
  const Hh = 11000 * full.k; // half the triangle's height: 20 turns of 550
  const H40 = 2 * Hh;

  // Twenty turns first: the other twenty sit under a veil, lifted as each
  // part doubles.
  const veilIn = ease(frame, nowAt - 4, 12);
  const veilLow = veilIn * (1 - ease(frame, longAt, 16));
  const veilHigh = veilIn * (1 - ease(frame, long2At, 16));

  // The four copies of the twenty-turn triangle.
  const A: [number, number][] = [
    [CHART.x0, L],
    [x20, L],
    [x20, L - Hh],
  ];
  const bMove = ease(frame, long2At, 18);
  const cMove = ease(frame, tallAt, 18);
  const dTurn = ease(frame, fourAt - 2, 20);
  const shift = (pts: [number, number][], dx: number, dy: number) => pts.map(([px, py]) => [px + dx, py + dy] as [number, number]);
  const rotate = (pts: [number, number][], cx: number, cy: number, deg: number) => {
    const r = (deg * Math.PI) / 180;
    return pts.map(([px, py]) => {
      const dx = px - cx;
      const dy = py - cy;
      return [cx + dx * Math.cos(r) - dy * Math.sin(r), cy + dx * Math.sin(r) + dy * Math.cos(r)] as [number, number];
    });
  };
  const copies = [
    { pts: A, at: doubleAt + 6, n: "1" },
    { pts: shift(A, (x20 - CHART.x0) * bMove, 0), at: long2At, n: "2", landed: bMove },
    { pts: shift(A, (x20 - CHART.x0) * cMove, -Hh * cMove), at: tallAt, n: "3", landed: cMove },
    { pts: rotate(A, x20, L - Hh / 2, 180 * dTurn), at: fourAt - 2, n: "4", landed: dTurn },
  ];
  const poly = (pts: [number, number][]) => pts.map(([px, py], i) => `${i ? "L" : "M"}${px},${py}`).join(" ") + " Z";

  // The staircase's top edge, for "under the staircase".
  const edge = TURNS.map((t) => {
    const top = full.ty(t.sent);
    const x = full.x(t.turn);
    return `${t.turn === 1 ? `M${x},${full.base} L${x},${top}` : `L${x},${top}`} L${x + slot},${top}`;
  }).join(" ");
  const edgeP = ease(frame, underAt - 6, 26);

  const zLabelsOut = climbFrom - 2;
  const lastTop = full.ty(LAST.sent);

  return (
    <AbsoluteFill>
      {/* ── Sound ── */}
      <Sfx name="el-sprinkle" at={memFrom} level={-34} />
      <Sfx name="el-pencil" at={everyAt - 2} level={-35} />
      <Sfx name="el-pop" at={twoThAt - 2} level={-30} />
      <Sfx name="el-whoosh" at={againAt - 6} level={-34} />
      <Sfx name="el-tap" at={replyAt - 2} level={-25} />
      <Sfx name="el-whoosh" at={climbFrom} level={-35} />
      <Sfx name="el-sprinkle" at={climbFrom + 10} level={-33} />
      <Sfx name="el-tap" at={countAt - 2} level={-25} />
      <Sfx name="el-whoosh" at={areaAt - 4} level={-35} />
      <Sfx name="el-pencil" at={cutAt} level={-34} />
      <Sfx name="el-pencil" at={triAt} level={-34} />
      <Sfx name="el-whoosh" at={longAt} level={-35} />
      <Sfx name="el-whoosh" at={long2At} level={-35} />
      <Sfx name="el-whoosh" at={tallAt} level={-35} />
      <Sfx name="el-tap" at={fourAt + 14} level={-25} />

      {/* ── Headlines ── */}
      <Headline at={memFrom - 6} second={wholeAt - 4} out={areaFrom - 12} italic="the whole chat again.">
        Every turn sends
      </Headline>
      <Headline at={areaFrom - 2} second={areaAt - 4} italic="the area under the stairs.">
        The bill is
      </Headline>

      {/* ── Fig. 2: the chat, sent whole ── */}
      <FigLabel n="2" title="One chat, as the app sends it" at={memFrom - 2} out={oneAt - 8} x={X0} y={y(FIG_Y)} />
      {BUBBLES.map((b, i) => {
        const p = ease(frame, memFrom + 2 + i * 6, 10);
        const o = ease(frame, oneAt - 8, 10);
        const fill = ease(frame, topAt - 2 + i * 4, 8);
        if (p <= 0 || o >= 1) return null;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: b.x,
              top: y(BUBBLE_Y + i * BUBBLE_STEP) + (1 - p) * 10,
              width: b.w,
              height: BUBBLE_H,
              borderRadius: b.r,
              boxSizing: "border-box",
              border: `2px solid ${LINE_EDGE}`,
              background: `color-mix(in srgb, ${SENT} ${Math.round(fill * 100)}%, ${PAPER})`,
              display: "flex",
              alignItems: "center",
              paddingLeft: 18,
              opacity: p * (1 - o),
              ...note(22, INK),
            }}
          >
            {b.text}
          </div>
        );
      })}
      <VBracket
        x={790}
        y0={y(BUBBLE_Y)}
        y1={y(BUBBLE_Y + 5 * BUBBLE_STEP) + BUBBLE_H}
        at={everyAt - 2}
        out={oneAt - 8}
        right={false}
      />
      <Note at={everyAt + 2} out={oneAt - 8} x={814} y={(y(BUBBLE_Y) + y(BUBBLE_Y + 5 * BUBBLE_STEP) + BUBBLE_H) / 2 - 34} width={220}>
        <span style={{ ...note(24, INK), fontWeight: 600 }}>all of it, sent again every turn</span>
      </Note>
      <Arrow
        from={[1046, (y(BUBBLE_Y) + y(BUBBLE_Y + 5 * BUBBLE_STEP) + BUBBLE_H) / 2]}
        to={[1176, (y(BUBBLE_Y) + y(BUBBLE_Y + 5 * BUBBLE_STEP) + BUBBLE_H) / 2]}
        at={sendsAt - 2}
        out={oneAt - 8}
      />
      <Spot id="goldfish" at={modelAt - 4} out={oneAt - 8} left={1200} top={y(372)} width={480} height={320} />
      <Note at={noMemAt} out={oneAt - 8} x={1200} y={y(372) + 336} width={480} style={{ textAlign: "center" }}>
        <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>the model: no memory between turns</span>
      </Note>

      {/* ── Fig. 3: what each turn sends ── */}
      <FigLabel n="3" title="Tokens each turn sends" at={oneAt - 2} x={X0} y={y(FIG_Y)} />
      <div
        style={{ position: "absolute", right: 1920 - 1800, top: y(FIG_Y) + 2, display: "flex", gap: 30, alignItems: "center" }}
      >
        <Key at={againAt} out={areaAt - 4} swatch={SENT}>
          sent before
        </Key>
        <Key at={newTokAt - 4} out={areaAt - 4} swatch={NEW}>
          new this turn
        </Key>
      </div>
      <Axes geo={geo} at={oneAt - 2} z={z} title="tokens sent" />
      <Stairs
        geo={geo}
        turns={TURNS}
        state={state}
        merge={merge}
        soften={merge}
        lineTint={lineTint}
        triTint={triTint}
        dividers={1 - clamp01(z * 4)}
        flash={(t) =>
          Math.max(
            // "every one of those bars", and the chat "sent again and again"
            pulse(frame, payAt + 2 + t * 0.9, 14),
            pulse(frame, againAndAt - 4 + t * 0.9, 16) * 0.8,
            t === TURNS.length ? pulse(frame, fortyAt - 2, 24) : 0,
          )
        }
        // After turn forty is read: one new slice a turn, rippling up the stairs.
        glow={(t) => pulse(frame, countAt + 34 + t * 1.1, 16)}
      />

      {/* Up close, turn one: the system prompt and the first message. */}
      <Leader points={[[ZX - 12, zoomed.ty(SYSTEM / 2)], [zoomed.x(1) + zoomed.bar + 4, zoomed.ty(SYSTEM / 2)]]} at={sysAt - 4} out={twoAt - 6} color={INK_SOFT} />
      <Note at={sysAt - 2} out={twoAt - 6} x={ZX} y={zoomed.ty(SYSTEM / 2) - 17}>
        <span style={{ ...note(26, INK), whiteSpace: "nowrap", ...TABULAR }}>
          system prompt, <b style={{ fontWeight: 650 }}>{int(SYSTEM)}</b> tokens
        </span>
      </Note>
      <Leader
        points={[[ZX - 12, zoomed.ty(SYSTEM + USER / 2) - 40], [zoomed.x(1) + zoomed.bar + 4, zoomed.ty(SYSTEM + USER / 2)]]}
        at={firstMsgAt - 2}
        out={twoAt - 6}
        color={INK_SOFT}
      />
      <Note at={firstMsgAt} out={twoAt - 6} x={ZX} y={zoomed.ty(SYSTEM + USER / 2) - 57}>
        <span style={{ ...note(26, INK), whiteSpace: "nowrap", ...TABULAR }}>
          your first message, <b style={{ fontWeight: 650 }}>{int(USER)}</b>
        </span>
      </Note>

      {/* Up close, turn two: turn one again, then the reply and the next message. */}
      <Leader
        points={[[ZX - 12, zoomed.ty(TURNS[1].resent / 2)], [zoomed.x(2) + zoomed.bar + 4, zoomed.ty(TURNS[1].resent / 2)]]}
        at={againAt + 4}
        out={zLabelsOut}
        color={INK_SOFT}
      />
      <Note at={againAt + 6} out={zLabelsOut} x={ZX} y={zoomed.ty(TURNS[1].resent / 2) - 17}>
        <span style={{ ...note(26, INK), whiteSpace: "nowrap", ...TABULAR }}>
          turn one, sent again: <b style={{ fontWeight: 650 }}>{int(TURNS[1].resent)}</b>
        </span>
      </Note>
      <VBracket
        x={zoomed.x(2) + zoomed.bar + 14}
        y0={zoomed.ty(TURNS[1].sent)}
        y1={zoomed.ty(TURNS[1].resent)}
        at={replyAt}
        out={zLabelsOut}
        color={NEW_INK}
        right={false}
      />
      <Note at={replyAt + 2} out={zLabelsOut} x={ZX} y={zoomed.ty(TURNS[1].resent + TURNS[1].newSlice / 2) - 34}>
        <span style={{ ...note(26, INK), whiteSpace: "nowrap", display: "block", ...TABULAR }}>
          the reply, {int(REPLY)}, and your next message, {int(USER)}
        </span>
      </Note>
      <Note at={fiveAt - 2} out={zLabelsOut} x={ZX} y={zoomed.ty(TURNS[1].resent + TURNS[1].newSlice / 2) + 4}>
        <span style={{ ...note(28, NEW_INK), fontWeight: 700, whiteSpace: "nowrap", ...TABULAR }}>{int(TURNS[1].newSlice)} new tokens</span>
      </Note>

      {/* Turn forty. */}
      <Note at={countAt - 4} out={areaFrom - 12} x={RX - 14} y={lastTop - 30}>
        <span style={{ display: "block", ...headline(46), ...TABULAR, whiteSpace: "nowrap" }}>{int(LAST.sent)}</span>
        <span style={{ display: "block", marginTop: 8, ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>tokens in turn 40's request</span>
      </Note>

      {/* ── The area ── */}
      <Svg>
        <path
          d={edge}
          fill="none"
          stroke={INK}
          strokeWidth={2}
          pathLength={1}
          strokeDasharray={`${edgeP} 1`}
          opacity={edgeP > 0 ? 1 - ease(frame, cutAt, 12) * 0.6 : 0}
        />
      </Svg>
      <Note at={areaAt + 2} out={cutAt - 4} x={1010} y={full.base - 150}>
        <span style={{ ...headline(40), whiteSpace: "nowrap", ...halo }}>the bill</span>
      </Note>
      <Note at={repliesAt - 2} x={RX} y={y(392)} width={360}>
        <span style={{ ...note(24, OUTPUT_INK), fontWeight: 600 }}>plus the replies, at the output price</span>
      </Note>

      {/* The cut: a rectangle under the system prompt's line, a triangle over it. */}
      <Svg>
        <line
          x1={CHART.x0}
          x2={CHART.x0 + (x40 - CHART.x0) * ease(frame, cutAt, 18)}
          y1={L}
          y2={L}
          stroke={INK}
          strokeWidth={2.4}
          strokeDasharray="10 7"
          opacity={ease(frame, cutAt, 4)}
        />
        <rect
          x={CHART.x0}
          y={L}
          width={x40 - CHART.x0}
          height={full.base - L}
          fill="none"
          stroke={LINE_EDGE}
          strokeWidth={2.4}
          opacity={ease(frame, rectAt - 2, 12) * (1 - ease(frame, nowAt - 4, 12))}
        />
        <path
          d={`M${CHART.x0},${L} L${x40},${L - H40} L${x40},${L} Z`}
          fill="none"
          stroke={TRI}
          strokeWidth={2.6}
          strokeLinejoin="round"
          pathLength={1}
          strokeDasharray={`${ease(frame, triAt - 2, 22)} 1`}
          opacity={1 - ease(frame, nowAt - 4, 12)}
        />
      </Svg>
      {/* "the same every turn": a shine runs along the rectangle, every turn of it. */}
      <Svg opacity={pulse(frame, sameAt - 2, 46)}>
        <rect
          x={CHART.x0 + (x40 - CHART.x0 - 140) * clamp01((frame - sameAt + 2) / 46)}
          y={L}
          width={140}
          height={full.base - L}
          fill={`color-mix(in srgb, ${PAPER} 55%, transparent)`}
        />
      </Svg>
      <Note at={sameAt - 6} x={CHART.x0 + 18} y={L + (full.base - L) / 2 - 15}>
        <span style={{ ...note(22, INK), fontWeight: 600, whiteSpace: "nowrap" }}>the system prompt, the same every turn</span>
      </Note>
      <Leader points={[[700, L - 330], [930, L - 150]]} at={chatAt - 2} out={doubleAt - 4} color={TRI_INK} />
      <Note at={chatAt} out={doubleAt - 4} x={440} y={L - 376}>
        <span style={{ ...note(28, TRI_INK), fontWeight: 700, whiteSpace: "nowrap" }}>the chat itself, resent</span>
      </Note>

      {/* The ledger: what each part does when the turns double. */}
      <div style={{ position: "absolute", left: RX, top: y(500) }}>
        <Key at={rectAt} swatch={LINE} edge={LINE_EDGE}>
          the rectangle
        </Key>
      </div>
      <Note at={longAt + 4} x={RX} y={y(500) + 40}>
        <span style={{ display: "flex", alignItems: "baseline", gap: 14, whiteSpace: "nowrap" }}>
          <span style={{ ...headline(54), color: LINE_EDGE, ...TABULAR }}>×2</span>
          <span style={note(22, INK_SOFT)}>twice as long</span>
        </span>
      </Note>
      <div style={{ position: "absolute", left: RX, top: y(660) }}>
        <Key at={triAt} swatch={TRI_FILL} edge={TRI}>
          the triangle
        </Key>
      </div>
      <Note at={fourAt} x={RX} y={y(660) + 40}>
        <span style={{ display: "flex", alignItems: "baseline", gap: 14, whiteSpace: "nowrap" }}>
          <span style={{ ...headline(54), color: TRI_INK, ...TABULAR }}>×4</span>
          <span style={note(22, INK_SOFT)}>twice as long and tall</span>
        </span>
      </Note>

      {/* Doubling: twenty turns, then forty. */}
      <Svg>
        <rect x={x20} y={L} width={x40 - x20 + 2} height={full.base - L + 1} fill={PAPER} opacity={veilLow * 0.74} />
        <rect x={x20} y={full.top - 10} width={x40 - x20 + 2} height={L - full.top + 10} fill={PAPER} opacity={veilHigh * 0.74} />
      </Svg>
      <Bracket x0={CHART.x0} x1={x20 - 2} y={full.base + 50} at={nowAt - 2} out={doubleAt - 4} color={INK} up />
      <Note at={nowAt} out={doubleAt - 4} x={(CHART.x0 + x20) / 2 - 50} y={full.base + 58}>
        <span style={{ ...label(22, INK), whiteSpace: "nowrap" }}>20 turns</span>
      </Note>
      <Bracket x0={CHART.x0} x1={x40} y={full.base + 50} at={doubleAt} color={INK} up />
      <Note at={doubleAt + 4} x={(CHART.x0 + x40) / 2 - 50} y={full.base + 58}>
        <span style={{ ...label(22, INK), whiteSpace: "nowrap" }}>40 turns</span>
      </Note>
      <Svg>
        {/* The rectangle: twenty turns, and its copy beside it. */}
        <rect
          x={CHART.x0}
          y={L}
          width={x20 - CHART.x0}
          height={full.base - L}
          fill="none"
          stroke={LINE_EDGE}
          strokeWidth={3}
          opacity={ease(frame, doubleAt, 12)}
        />
        <rect
          x={CHART.x0 + (x20 - CHART.x0) * ease(frame, longAt, 18)}
          y={L}
          width={x20 - CHART.x0}
          height={full.base - L}
          fill="none"
          stroke={LINE_EDGE}
          strokeWidth={3}
          strokeDasharray="9 6"
          opacity={ease(frame, longAt, 6)}
        />
        {/* The triangle: twenty turns, then three copies. */}
        {copies.map((c, i) => {
          const o = ease(frame, c.at, 8);
          if (o <= 0) return null;
          return (
            <path
              key={i}
              d={poly(c.pts)}
              fill={`color-mix(in srgb, ${TRI} 16%, transparent)`}
              stroke={TRI}
              strokeWidth={3}
              strokeLinejoin="round"
              strokeDasharray={i === 0 ? undefined : "9 6"}
              opacity={o}
            />
          );
        })}
      </Svg>
      {copies.map((c, i) => {
        const landed = i === 0 ? 1 : (c.landed ?? 1);
        const cx = (c.pts[0][0] + c.pts[1][0] + c.pts[2][0]) / 3;
        const cy = (c.pts[0][1] + c.pts[1][1] + c.pts[2][1]) / 3;
        return (
          <Note key={i} at={i === 0 ? c.at + 4 : c.at + 16} x={cx - 9} y={cy - 18} from="up" style={{ opacity: landed < 0.95 ? 0 : undefined }}>
            <span style={{ ...note(30, TRI_INK), fontWeight: 750, ...halo }}>{c.n}</span>
          </Note>
        );
      })}
    </AbsoluteFill>
  );
};
