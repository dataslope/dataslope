import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, HIGHLIGHT, INK, INK_SOFT, TABULAR, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { BDAY } from "./data";
import { Card, DATA, DATA_LIGHT, Drift, Headline, Kicker, mulberry32, Person, pulse, Spot, Svg, X0 } from "./parts";

const ROOM = { x: X0, y: 300, w: 560, h: 380 };
const BAR_Y = 742;
const BAR_PX = 4;
const CARD = { w: 100, h: 140, pitch: 118, y: 380 };
/** The questions worked through; the last two are quick ones. */
const WORKED = 12;
const TOTAL = 14;
const SET_ASIDE = 70;

/** Where each of the room's twenty-three people stands, the same on every
 *  frame: a loose grid, nudged, and kept a shoulder's width (32px) inside the
 *  room's right wall, which the odd rows' last column could otherwise touch. */
const SPOTS = (() => {
  const r = mulberry32(23);
  const out: [number, number][] = [];
  for (let i = 0; i < BDAY.people; i++) {
    const col = i % 6;
    const row = Math.floor(i / 6);
    const x = ROOM.x + 60 + col * 88 + (r() - 0.5) * 34 + (row % 2) * 30;
    out.push([Math.min(x, ROOM.x + ROOM.w - 32), ROOM.y + 70 + row * 82 + (r() - 0.5) * 22]);
  }
  return out;
})();

/**
 * The opening. A puzzle the viewer answers in their head (the room of 23,
 * set against the 365 days the gut compares it with), left open until
 * question 12; then the fourteen questions dealt as cards, twelve turned up
 * and two set aside, and card 1 lit on the way into the first.
 */
export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("hook").from;
  const peopleAt = n.word("hook", "Twenty-three people");
  const shareAt = n.word("hook", "share a birthday");
  const sayNoAt = n.word("hook", "Most people say no");
  const tinyAt = n.word("hook", "twenty-three is tiny");
  const daysAt = n.word("hook", "three hundred and sixty-five");
  const holdAt = n.word("hook", "Hold on to your answer");
  const settleAt = n.word("hook", "settle it");
  const wrongAt = n.word("plan", "usually wrong");
  const definitionsAt = n.word("plan", "definitions");
  const fourteenAt = n.word("plan", "fourteen questions");
  const twelveAt = n.word("plan-last", "Twelve");
  const numbersAt = n.word("plan-last", "with numbers");
  const lastAt = n.word("plan-last", "the last two");
  const quickAt = n.word("plan-last", "are quick");
  const startAt = n.word("cond-in", "Start");
  const leansAt = n.word("cond-in", "leans on");
  const end = n.beat("cond-in").to;

  const roomOut = definitionsAt;
  const hold = pulse(frame, holdAt, 30) + pulse(frame, settleAt, 24) * 0.6;
  const roomLine = ease(frame, peopleAt - 4, 16);
  const bar23 = ease(frame, tinyAt, 14);
  const bar365 = ease(frame, daysAt, 24);
  const barsOut = ease(frame, roomOut, 12);

  return (
    <AbsoluteFill>
      <Sfx name="el-sprinkle" at={peopleAt} level={-34} />
      <Sfx name="el-pencil" at={daysAt + 2} level={-36} />
      <Sfx name="el-tap" at={holdAt + 2} level={-32} />
      <Sfx name="riffle" at={fourteenAt} level={-30} />
      <Sfx name="el-tap" at={lastAt + 4} level={-34} />
      <Sfx name="el-pop" at={startAt + 2} level={-32} />

      <Drift from={from} to={end + 40}>
        <Kicker at={from}>Data scientist interview prep</Kicker>
        <Headline lead="Twenty-three people in a room." turn="Do two share a birthday?" at={peopleAt - 6} turnAt={shareAt - 8} size={64} />

        <Spot id="ds-probability-rabbit" at={from + 4} out={fourteenAt - 8} left={1200} top={y(270)} width={600} height={440} />

        {/* ── The room ── */}
        <Svg opacity={1 - ease(frame, roomOut, 12)}>
          <rect
            x={ROOM.x}
            y={y(ROOM.y)}
            width={ROOM.w}
            height={h(ROOM.h)}
            rx={14}
            fill={`color-mix(in srgb, ${HIGHLIGHT} ${Math.min(1, hold) * 45}%, transparent)`}
            stroke={INK_SOFT}
            strokeWidth={2 + hold}
            pathLength={1}
            strokeDasharray={`${roomLine} 1`}
          />
          {SPOTS.map(([px, py], i) => {
            const p = ease(frame, peopleAt + i * 1.2, 10);
            return p > 0 ? <Person key={i} x={px} y={y(py)} size={44 * p} color={DATA} opacity={p} /> : null;
          })}
        </Svg>
        <Note at={peopleAt + 30} x={ROOM.x + ROOM.w + 30} y={y(ROOM.y + 20)} out={roomOut}>
          <span style={{ ...label(26, INK), ...TABULAR, whiteSpace: "nowrap" }}>{BDAY.people} people</span>
        </Note>
        <Note at={sayNoAt} x={ROOM.x + ROOM.w + 30} y={y(ROOM.y + 150)} out={roomOut}>
          <span style={{ ...note(30, ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>
            {/* Pointed at, not struck: the hook leaves its question open until question 12. */}
            <span style={{ display: "inline-block", transform: `scale(${1 + 0.08 * pulse(frame, wrongAt, 26)})`, transformOrigin: "0 50%" }}>
              Most people say no.
            </span>
          </span>
        </Note>

        {/* ── Twenty-three against three hundred and sixty-five ── */}
        <Svg opacity={1 - barsOut}>
          <rect x={X0} y={y(BAR_Y)} width={BDAY.people * BAR_PX * bar23} height={h(26)} rx={4} fill={DATA} />
          <rect x={X0} y={y(BAR_Y + 52)} width={365 * BAR_PX * bar365} height={h(26)} rx={4} fill={DATA_LIGHT} />
        </Svg>
        <Note at={tinyAt + 4} x={X0 + BDAY.people * BAR_PX + 18} y={y(BAR_Y) - 4} out={roomOut}>
          <span style={{ ...label(22, INK), ...TABULAR, whiteSpace: "nowrap" }}>23 people</span>
        </Note>
        <Note at={daysAt + 18} x={X0 + 365 * BAR_PX + 18} y={y(BAR_Y + 52) - 4} out={roomOut}>
          <span style={{ ...label(22, INK), ...TABULAR, whiteSpace: "nowrap" }}>365 days</span>
        </Note>

        {/* ── Fourteen questions, dealt ── */}
        {Array.from({ length: TOTAL }, (_, i) => {
          const worked = i < WORKED;
          return (
            <Card
              key={i}
              n={i + 1}
              x={X0 + i * CARD.pitch}
              fromX={X0 + i * CARD.pitch - 40}
              y={y(CARD.y)}
              w={CARD.w}
              h={h(CARD.h)}
              at={fourteenAt - 4 + i * 2}
              turnAt={worked ? twelveAt + i * 2 : lastAt + (i - WORKED) * 4}
              toX={worked ? undefined : X0 + i * CARD.pitch + SET_ASIDE}
              moveAt={worked ? undefined : lastAt}
              tilt={worked ? 0 : i === WORKED ? -4 : 5}
              lit={i === 0 ? ease(frame, startAt, 10) : 0}
              dim={i === 0 ? 0 : ease(frame, leansAt - 4, 14)}
            />
          );
        })}
        <Note at={numbersAt} x={X0} y={y(CARD.y + CARD.h + 30)} dim={leansAt - 4}>
          <span style={{ ...note(28, INK), whiteSpace: "nowrap" }}>
            <span style={{ ...TABULAR, fontWeight: 650 }}>{WORKED}</span> worked through with numbers
          </span>
        </Note>
        <Note at={quickAt} x={X0 + WORKED * CARD.pitch + SET_ASIDE} y={y(CARD.y + CARD.h + 30)} dim={leansAt - 4}>
          <span style={{ ...note(28, INK), whiteSpace: "nowrap" }}>
            <span style={{ ...TABULAR, fontWeight: 650 }}>{TOTAL - WORKED}</span> quick ones
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
