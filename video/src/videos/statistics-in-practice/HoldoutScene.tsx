import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { BAR, INK, INK_SOFT, note, PAPER } from "../../editorial/style";
import { Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { HOLDOUT, TIPS } from "./data";
import { Check, Headline, lerp, Spot, Svg, Wall } from "./parts";
import { LeadCard, WALL_BOTTOM, WALL_TOP, WALL_X } from "./WallScene";

/** The 244 bills as a grid, 22 to a row, left of the wall. */
const COLS = 22;
const PITCH = 30;
const LEFT_X = 200;
const LEFT_Y = 380;
/** The held-out bills, 10 to a row, right of the wall. */
const HELD_COLS = 10;
const RIGHT_X = 1080;
const RIGHT_Y = 400;
const HELD = [...HOLDOUT.held].sort((a, b) => a - b);
const HELD_SLOT = new Map(HELD.map((i, k) => [i, k]));
const HELD_ROWS = Math.ceil(HELD.length / HELD_COLS);
const CARD_LEFT = { x: 200, y: 790 };
const CARD_RIGHT = { x: 1080, y: 790 };

/**
 * The hold-out slice: split the bills before exploring, 70% to roam in and
 * 30% locked away; carry the question across the wall, not the data; test
 * once on the bills that never shaped the hunch.
 */
export const HoldoutScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const splitFrom = n.beat("split").from;
  const haveAt = n.word("split", "what you have");
  const exploreAt = n.word("split", "explore");
  const seventyAt = n.word("split", "Seventy");
  const thirtyAt = n.word("split", "thirty");
  const lockedAt = n.word("split", "locked away");
  const leadAt = n.word("carry", "lead");
  const acrossAt = n.word("carry", "across");
  const dataAt = n.word("carry", "data");
  const onceAt = n.word("once", "once");
  const sayAt = n.word("once", "never had a say");
  const betterAt = n.word("ab-in", "better");
  const purposeAt = n.word("ab-in", "purpose");

  const fly = (k: number) => ease(frame, thirtyAt - 2 + k * 0.5, 22);
  const seal = ease(frame, lockedAt - 4, 16);
  const open = ease(frame, onceAt - 6, 14);
  const lit = (k: number) => ease(frame, onceAt - 2 + k * 0.5, 8);
  const exploreLit = ease(frame, seventyAt - 6, 16);
  const stay = ease(frame, dataAt - 6, 14);
  const fade = ease(frame, betterAt - 4, 18);
  const carry = ease(frame, acrossAt - 6, 26);
  const cardIn = ease(frame, leadAt - 6, 12);

  const leftDot = (i: number) =>
    [LEFT_X + (i % COLS) * PITCH, y(LEFT_Y) + h(Math.floor(i / COLS) * PITCH)] as const;
  const rightDot = (k: number) =>
    [RIGHT_X + (k % HELD_COLS) * PITCH, y(RIGHT_Y) + h(Math.floor(k / HELD_COLS) * PITCH)] as const;
  const box = {
    x0: RIGHT_X - 26,
    x1: RIGHT_X + (HELD_COLS - 1) * PITCH + 26,
    y0: y(RIGHT_Y) - h(26),
    y1: y(RIGHT_Y) + h((HELD_ROWS - 1) * PITCH + 26),
  };

  return (
    <AbsoluteFill>
      {/* ── Sound: the bills, the slice flying over, the lock, the card, the one test ── */}
      <Sfx name="el-sprinkle" at={haveAt - 4} level={-34} />
      <Sfx name="el-whoosh" at={thirtyAt - 2} level={-32} />
      <Sfx name="el-pop" at={lockedAt - 4} level={-30} />
      <Sfx name="el-whoosh" at={acrossAt - 6} level={-34} />
      <Sfx name="el-tap" at={onceAt - 4} level={-28} />

      <Headline lead="Split first," turn="then explore." at={splitFrom - 6} turnAt={exploreAt - 4} out={betterAt - 6} />
      <Headline lead="Better still," turn="make fresh data." at={betterAt - 2} turnAt={purposeAt - 14} />
      <Wall x={WALL_X} top={y(WALL_TOP)} bottom={y(WALL_BOTTOM)} at={splitFrom - 60} />

      <Spot id="statistics-in-practice-chest" at={lockedAt - 6} left={1440} top={y(372)} width={330} height={300} />

      {/* ── The bills ── */}
      <Svg>
        {TIPS.billPct.map((_, i) => {
          const a = ease(frame, haveAt - 4 + i * 0.1, 8);
          if (a <= 0) return null;
          const [lx, ly] = leftDot(i);
          const k = HELD_SLOT.get(i);
          if (k === undefined) {
            return (
              <circle
                key={i}
                cx={lx}
                cy={ly}
                r={7 * a}
                fill={`color-mix(in srgb, ${BAR} ${Math.round(exploreLit * 100)}%, color-mix(in srgb, ${INK} 55%, ${PAPER}))`}
                opacity={(1 - 0.6 * stay) * (1 - 0.7 * fade)}
              />
            );
          }
          const t = fly(k);
          const [rx, ry] = rightDot(k);
          // An arc over the wall on the way across.
          const arc = Math.sin(t * Math.PI) * 120;
          const on = lit(k);
          return (
            <circle
              key={i}
              cx={lerp(lx, rx, t)}
              cy={lerp(ly, ry, t) - arc}
              r={7 * a}
              fill={`color-mix(in srgb, ${BAR} ${Math.round(on * 100)}%, color-mix(in srgb, ${INK} ${Math.round(lerp(55, 35, seal))}%, ${PAPER}))`}
            />
          );
        })}
        {seal > 0 ? (
          <rect
            x={box.x0}
            y={box.y0}
            width={box.x1 - box.x0}
            height={box.y1 - box.y0}
            rx={14}
            fill="none"
            stroke={INK}
            strokeWidth={lerp(2, 3, open)}
            strokeDasharray={open < 1 ? `${lerp(8, 40, open)} ${lerp(6, 0, open)}` : undefined}
            opacity={seal}
          />
        ) : null}
      </Svg>

      {/* ── Labels ── */}
      <Ink at={seventyAt - 2} dur={14} out={dataAt - 6} style={{ left: LEFT_X - 8, top: y(LEFT_Y + 12 * PITCH), whiteSpace: "nowrap" }}>
        <span style={{ ...note(24, INK), fontWeight: 650 }}>{HOLDOUT.nExplore} bills to explore</span>
        <span style={{ ...note(22, INK_SOFT), marginLeft: 12 }}>{Math.round((1 - HOLDOUT.share) * 100)}%</span>
      </Ink>
      <Ink at={dataAt - 2} dur={14} style={{ left: LEFT_X - 8, top: y(LEFT_Y + 12 * PITCH), whiteSpace: "nowrap" }}>
        <span style={{ ...note(24, INK_SOFT), fontWeight: 600 }}>The data stays on this side.</span>
      </Ink>
      <Ink at={lockedAt - 2} dur={14} style={{ left: box.x0, top: box.y1 + 14, whiteSpace: "nowrap" }}>
        <span style={{ ...note(24, INK), fontWeight: 650 }}>{HOLDOUT.nHeld} locked away</span>
        <span style={{ ...note(22, INK_SOFT), marginLeft: 12 }}>{Math.round(HOLDOUT.share * 100)}%</span>
      </Ink>
      <Check x={box.x0 + 2} y={box.y1 + 76} at={onceAt - 4} />
      <Ink at={onceAt - 2} dur={14} style={{ left: box.x0 + 44, top: box.y1 + 56, whiteSpace: "nowrap" }}>
        <span style={{ ...note(24, INK), fontWeight: 650 }}>tested once</span>
      </Ink>
      <Ink at={sayAt - 4} dur={14} style={{ left: box.x0 + 200, top: box.y1 + 58, whiteSpace: "nowrap" }}>
        <span style={{ ...note(22, INK_SOFT) }}>on bills that never shaped the hunch</span>
      </Ink>

      {/* ── The lead, carried over the wall without its data ── */}
      {cardIn > 0 ? (
        <LeadCard
          x={lerp(CARD_LEFT.x, CARD_RIGHT.x, carry)}
          y={y(lerp(CARD_LEFT.y, CARD_RIGHT.y, carry)) - Math.sin(carry * Math.PI) * 70}
          opacity={cardIn * (1 - 0.6 * fade)}
        />
      ) : null}
    </AbsoluteFill>
  );
};
