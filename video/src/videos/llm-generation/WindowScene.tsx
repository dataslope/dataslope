import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, headline, INK, INK_SOFT, label, note, TABULAR } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ds, inkOf } from "../../theme/brand";
import { BUDGET, count, ROOM, USED, WINDOW } from "./data";
import { Headline, Kicker, Spot, Svg, tint, X0 } from "./kit";

/** The window bar: 200,000 tokens across this span. */
const B0 = 120;
const B1 = 1800;
const bx = (tokens: number) => B0 + ((B1 - B0) * tokens) / WINDOW;
const BAR_Y = 330;
const BAR_H = 70;
/** One color per part of the request; the room left for the answer is red. */
const PARTS = [
  { name: "System prompt", color: ds("purple", 500), ink: inkOf.purple },
  { name: "Document", color: BAR, ink: inkOf.blue },
  { name: "History", color: ds("teal", 500), ink: inkOf.teal },
  { name: "Question", color: ds("yellow", 600), ink: inkOf.yellow },
] as const;
const ANSWER = { name: "Room for the answer", color: ACCENT, ink: ACCENT_INK };
const LEG_Y = (k: number) => 440 + k * 44;
const LEG_NUM_X = 700;

/** Fig. 13: twelve turns of a chat, the window over the newest eight. */
const TURNS = 14;
const SHOWN = 12;
const SLOT = 124;
const TILE_W = 108;
const TILE_H = 52;
const TILES_Y = 752;
const FRAME_FROM = 4;
const tx = (pos: number) => X0 + pos * SLOT;
/** A turn of the chat is history, so it takes Fig. 12's History teal. */
const TURN = ds("teal", 500);
const clamp01 = (t: number) => Math.max(0, Math.min(1, t));

/**
 * Window, fill, edge: everything one request holds shares one budget (the
 * lesson's budget block, run as written), and past the window's edge nothing
 * fades: the app trims old turns, and the model never knows.
 */
export const WindowScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();
  const start = n.beat("window").from;
  const everythingAt = n.word("window", "everything");
  const partAt = [
    n.word("window", "system prompt"),
    n.word("window", "documents"),
    n.word("window", "history"),
    n.word("window", "question"),
  ];
  const answerAt = n.word("window", "answer it writes");
  const budgetAt = n.word("window", "one budget");
  const twoAt = n.word("fill", "two hundred thousand");
  const docAt = n.word("fill", "one long document");
  const sixAt = n.word("fill", "six thousand three hundred");
  const edgeAt = n.word("edge", "past the edge");
  const fadesAt = n.word("edge", "nothing fades");
  const notThereAt = n.word("edge", "not there");
  const trimAt = n.word("edge", "trim old turns");
  const beginningAt = n.word("edge", "own beginning");

  // Where each part of the request starts in the bar.
  const starts = BUDGET.map((_, i) => BUDGET.slice(0, i).reduce((a, b) => a + b.tokens, 0));
  const barY = y(BAR_Y);
  const bh = h(BAR_H);

  // Fig. 13: the chat grows by two turns, and the oldest inside slide out.
  const shift = 2 * ease(frame, trimAt, 30);
  const tilesY = y(TILES_Y);
  const th = h(TILE_H);
  const gone = ease(frame, notThereAt - 2, 8);

  return (
    <AbsoluteFill>
      <Sfx name="el-pop" at={start - 2} level={-31} />
      {partAt.map((t, k) => (
        <Sfx key={k} name="el-tap" at={t - 2} level={-31} />
      ))}
      <Sfx name="el-tap" at={answerAt - 2} level={-29} />
      <Sfx name="el-pencil" at={edgeAt - 2} level={-35} />
      <Sfx name="el-scratch" at={notThereAt - 2} level={-34} />
      <Sfx name="el-whoosh" at={trimAt} level={-35} />

      <Kicker at={start - 6}>Context windows</Kicker>
      <Headline lead="The context window" turn="is one budget." at={start - 4} turnAt={budgetAt - 2} />
      <Spot id="llm-generation-suitcase" at={start - 2} left={1450} top={y(60)} width={360} height={h(200)} />

      <FigLabel n="12" title="One request in a 200,000-token window (the lesson's budget block)" at={everythingAt - 6} x={X0} y={y(266)} />
      {/* The window itself: an outline the parts fill. */}
      <Svg opacity={ease(frame, everythingAt - 2, 12)}>
        <rect x={B0} y={barY} width={(B1 - B0) * ease(frame, everythingAt - 2, 18)} height={bh} fill="none" stroke={INK} strokeWidth={1.6} />
      </Svg>
      {BUDGET.map((b, i) => {
        const x = bx(starts[i]);
        const w = Math.max(3, bx(starts[i] + b.tokens) - x);
        const p = ease(frame, partAt[i] - 2, 16);
        return (
          <Svg key={b.part}>
            <rect x={x} y={barY} width={w * p} height={bh} fill={tint(PARTS[i].color, 40)} />
            <rect x={x} y={barY + bh - 5} width={w * p} height={5} fill={PARTS[i].color} />
          </Svg>
        );
      })}
      {/* The room left for the answer. */}
      <Svg opacity={ease(frame, answerAt - 2, 12)}>
        <rect x={bx(USED)} y={barY} width={B1 - bx(USED)} height={bh} fill={tint(ACCENT, 22)} stroke={ACCENT} strokeWidth={2} strokeDasharray="5 4" />
      </Svg>

      {/* The legend: each part named as the narration names it, its size on "two hundred thousand". */}
      {[...PARTS, ANSWER].map((p, k) => {
        const at = k < PARTS.length ? partAt[k] : answerAt;
        const tokens = k < PARTS.length ? BUDGET[k].tokens : ROOM;
        return (
          <React.Fragment key={p.name}>
            <Ink at={at - 2} dur={12} style={{ left: X0, top: y(LEG_Y(k)), display: "flex", alignItems: "center", gap: 14, whiteSpace: "nowrap" }}>
              <span style={{ width: 18, height: 18, background: p.color, flex: "none" }} />
              <span style={{ ...note(23, p.ink), fontWeight: 650 }}>{p.name}</span>
            </Ink>
            <Note at={(k === 1 ? docAt : k === PARTS.length ? sixAt : twoAt + 4) + k * 2} x={LEG_NUM_X} y={y(LEG_Y(k))} align="right">
              <span style={{ ...note(23, k === PARTS.length ? ACCENT_INK : INK), fontWeight: 600, ...TABULAR }}>{count(tokens)}</span>
            </Note>
          </React.Fragment>
        );
      })}

      {/* The verdict: how much is used, and how little is left. */}
      <Ink at={twoAt} dur={14} style={{ left: 900, top: y(442), whiteSpace: "nowrap" }}>
        <span style={{ ...note(26, INK), fontWeight: 600, ...TABULAR }}>
          {count(USED)} of {count(WINDOW)} used
        </span>
      </Ink>
      <Ink at={sixAt - 2} dur={16} style={{ left: 896, top: y(486), display: "flex", alignItems: "baseline", gap: 18, whiteSpace: "nowrap" }}>
        <span style={{ ...headline(84), color: ACCENT_INK, ...TABULAR }}>{count(ROOM)}</span>
        <span style={{ ...note(26, INK) }}>tokens left to answer in</span>
      </Ink>

      {/* Fig. 13: a long chat, trimmed to fit. */}
      <FigLabel n="13" title="A long chat, trimmed to fit (schematic)" at={edgeAt - 6} x={X0} y={y(690)} />
      <Svg opacity={ease(frame, edgeAt - 2, 12)}>
        <rect
          x={tx(FRAME_FROM) - 10}
          y={tilesY - 12}
          width={tx(SHOWN - 1) + TILE_W - tx(FRAME_FROM) + 20}
          height={th + 24}
          fill="none"
          stroke={INK}
          strokeWidth={2.4}
        />
      </Svg>
      <Note at={edgeAt + 6} x={tx(SHOWN - 1) + TILE_W + 10} y={tilesY + th + 18} align="right">
        <span style={{ ...label(21, INK) }}>the window</span>
      </Note>
      {Array.from({ length: TURNS }, (_, j) => {
        const pos = j - shift;
        const isNew = j >= SHOWN;
        // A new turn appears as it slides into the window, never outside it.
        const p = isNew ? clamp01((SHOWN - 0.4 - pos) / 0.5) : ease(frame, edgeAt - 10 + j * 2, 12);
        // Outside the window a turn is not dimmed: it is simply not there. The
        // oldest go on "not there"; the two the chat pushes out go as they cross
        // the edge, before they reach the empty places.
        const vanish = j < FRAME_FROM ? gone : clamp01((FRAME_FROM - 0.3 - pos) / 0.5);
        if (p <= 0 || vanish >= 1) return null;
        return (
          <div
            key={j}
            style={{
              position: "absolute",
              left: tx(pos),
              top: tilesY,
              width: TILE_W,
              height: th,
              boxSizing: "border-box",
              background: tint(TURN, 24),
              borderBottom: `4px solid ${TURN}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: p * (1 - vanish),
              transform: `scale(${1 - vanish * 0.4})`,
              ...note(21, inkOf.teal),
              fontWeight: 650,
            }}
          >
            turn {j + 1}
          </div>
        );
      })}
      {/* Where the trimmed turns were: an empty place the model knows nothing about. */}
      {Array.from({ length: FRAME_FROM }, (_, pos) => (
        <Svg key={pos} opacity={ease(frame, notThereAt + 4, 12)}>
          <rect x={tx(pos)} y={tilesY} width={TILE_W} height={th} fill="none" stroke={INK_SOFT} strokeWidth={1.4} strokeDasharray="4 5" />
        </Svg>
      ))}
      <Note at={notThereAt + 6} out={beginningAt - 6} x={X0} y={tilesY + th + 18}>
        <span style={{ ...note(22, INK_SOFT) }}>trimmed turns</span>
      </Note>
      <Note at={beginningAt - 2} x={X0} y={tilesY + th + 18}>
        <span style={{ ...note(22, ACCENT_INK), fontWeight: 650 }}>its own beginning</span>
      </Note>
      <Note at={fadesAt} out={notThereAt - 4} x={X0} y={tilesY + th + 18}>
        <span style={{ ...note(22, INK_SOFT) }}>past the edge: nothing fades</span>
      </Note>
    </AbsoluteFill>
  );
};
