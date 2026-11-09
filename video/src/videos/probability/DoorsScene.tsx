import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { arrowHead, cubicPath, sampleCubic, type Cubic } from "../../components/arrow";
import { Illustration } from "../../components/Illustration";
import { ease, pop } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { body, headline, INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { mulberry32, VIDEO } from "./data";
import { DATA, DATA_INK, DOOR_ASPECT, DOORWAY_X, GOLD_INK, Headline, Kicker, PaintedDoor, Spot, STAT, STAT_INK, Svg } from "./parts";

const DOOR = { x: [200, 520, 840], w: 240, top: 410, h: 360 } as const;
/** How far your pick's ring stands off the painted frame. */
const RING = 14;
/** The letters that poured in, as a small heap of painted envelopes
 *  (probability-letter, 1320x862). */
const LETTER = { w: 58, h: Math.round((58 * 862) / 1320) } as const;
const LETTERS = (() => {
  const r = mulberry32(1990);
  return Array.from({ length: 14 }, (_, i) => ({
    dx: (i % 7) * 58 + (r() - 0.5) * 18 + (Math.floor(i / 7) % 2) * 26,
    dy: -Math.floor(i / 7) * 44 + (r() - 0.5) * 8,
    rot: (r() - 0.5) * 22,
    jit: r() * 6,
  }));
})();

/** A painted door (PaintedDoor) in its slot, its number over it, that can
 *  swing open on `open`; the ring round it marks your pick. */
const Door: React.FC<{ x: number; top: number; w: number; h: number; at: number; open?: number; pick?: number; n: number }> = ({
  x,
  top,
  w,
  h,
  at,
  open = 0,
  pick = 0,
  n,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 16);
  if (p <= 0) return null;
  const cx = x + w / 2;
  const dw = h * DOOR_ASPECT;
  return (
    <>
      <PaintedDoor cx={cx} top={top} height={h} open={open} opacity={p} />
      {pick > 0 ? (
        <Svg>
          <rect
            x={cx - dw / 2 - RING}
            y={top - RING}
            width={dw + 2 * RING}
            height={h + 2 * RING}
            rx={16}
            fill="none"
            stroke={STAT}
            strokeWidth={4}
            opacity={pick}
          />
        </Svg>
      ) : null}
      <div style={{ position: "absolute", left: cx, top: top - 74, transform: "translateX(-50%)", opacity: p, ...headline(48), color: INK }}>{n}</div>
    </>
  );
};

/**
 * Part 4 opens: three doors, your pick, the host's goat, and the 1990 column
 * that said to switch, with the letters that said it was wrong.
 */
export const DoorsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const doorsFrom = n.beat("doors").from;
  const threeAt = n.word("doors", "three doors");
  const carAt = n.word("doors", "a car");
  const goatsAt = n.word("doors", "goats");
  const pickAt = n.word("doors", "You pick");
  const hostAt = n.word("host", "host");
  const opensAt = n.word("host", "opens");
  const goatAt = n.word("host", "a goat");
  const switchAt = n.word("host", "switch");
  const ninetyAt = n.word("column", "nineteen ninety");
  const yesAt = n.word("column", "yes");
  const twoAt = n.word("column", "two times in three");
  const thousandsAt = n.word("column", "Thousands");
  const wrongAt = n.word("column", "wrong");

  const top = y(DOOR.top);
  const dh = h(DOOR.h);
  const open3 = ease(frame, opensAt - 2, 22);
  const pick = ease(frame, pickAt - 2, 12);

  // The switch arrow, door 1 to door 2, over the top.
  const x1 = DOOR.x[0] + DOOR.w / 2;
  const x2 = DOOR.x[1] + DOOR.w / 2;
  // From above door 1's number to above door 2's, clear of the headline.
  const ay = top - 96;
  const arc: Cubic = [
    [x1 + 34, ay + 8],
    [x1 + 80, ay - 70],
    [x2 - 90, ay - 74],
    [x2 - 30, ay + 8],
  ];
  const draw = ease(frame, switchAt - 4, 16);
  const samples = sampleCubic(arc);
  const shown = samples.slice(0, Math.max(2, Math.round(samples.length * draw)));

  return (
    <AbsoluteFill>
      {/* ── Sound: the doors, your pick, the door swinging, the arrow, the letters ── */}
      <Sfx name="el-tap" at={threeAt - 2} level={-30} />
      <Sfx name="el-tap" at={pickAt - 2} level={-28} />
      <Sfx name="el-whoosh" at={opensAt - 2} level={-33} />
      <Sfx name="el-pop" at={goatAt - 4} level={-30} />
      <Sfx name="el-pencil" at={switchAt - 4} level={-34} />
      <Sfx name="el-sprinkle" at={thousandsAt - 2} level={-33} />

      <Kicker at={doorsFrom - 10}>Monty Hall</Kicker>
      <Headline top={y(150)} first="Three doors." second="Do you switch?" firstAt={doorsFrom - 6} secondAt={switchAt - 4} />

      {DOOR.x.map((x, i) => (
        <Door key={i} n={i + 1} x={x} top={top} w={DOOR.w} h={dh} at={threeAt - 4 + i * 5} open={i === 2 ? open3 : 0} pick={i === 0 ? pick : 0} />
      ))}
      <Ink at={carAt - 2} dur={16} style={{ left: DOOR.x[0], top: top + dh + 42, whiteSpace: "nowrap" }}>
        <span style={{ ...note(26, INK) }}>
          Behind them: <b style={{ color: GOLD_INK }}>a car</b>
          <span style={{ opacity: ease(frame, goatsAt - 4, 10) }}>, and two goats</span>
        </span>
      </Ink>
      {/* High on the door, well clear of its knob. */}
      <Note at={pickAt + 4} x={DOOR.x[0] + DOOR.w / 2} y={top + dh * 0.28} from="up">
        <span style={{ ...label(24, STAT_INK), display: "inline-block", transform: "translateX(-50%)", whiteSpace: "nowrap", background: PAPER, padding: "2px 10px", borderRadius: 6 }}>
          your pick
        </span>
      </Note>
      {/* What the open door shows, in the middle of its dark doorway. */}
      <Note at={goatAt} x={DOOR.x[2] + DOOR.w / 2 + (DOORWAY_X - 0.5) * dh * DOOR_ASPECT} y={top + dh * 0.44} from="up">
        <span style={{ ...label(28, PAPER), display: "inline-block", transform: "translateX(-50%)" }}>goat</span>
      </Note>
      <Ink at={hostAt - 2} dur={14} style={{ left: DOOR.x[0], top: top + dh + 94, whiteSpace: "nowrap" }}>
        <span style={{ ...note(26, INK_SOFT) }}>The host knows where the car is, and opens a door with a goat.</span>
      </Ink>
      <Svg>
        {draw > 0 ? (
          <>
            {/* Switching in the blue the next scene gives it; your pick (and
                staying) keeps the red. */}
            <path d={cubicPath(arc)} fill="none" stroke={DATA} strokeWidth={3} strokeLinecap="round" pathLength={1} strokeDasharray={`${draw} 1`} />
            {draw > 0.85 ? (
              <path d={arrowHead(shown, 16, 9)} fill="none" stroke={DATA} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
            ) : null}
          </>
        ) : null}
      </Svg>
      <Note at={switchAt} x={(x1 + x2) / 2} y={ay - 30} from="up">
        <span style={{ ...body(32, true), color: DATA_INK, display: "inline-block", transform: "translateX(-50%)", whiteSpace: "nowrap" }}>switch?</span>
      </Note>

      {/* ── The column, and the letters ── */}
      {/* The goat, small, over the column, with room above "Parade". */}
      <Spot id="probability-goat" at={goatAt - 2} left={1440} top={y(340)} width={118} height={200} />
      <Ink at={ninetyAt - 4} dur={16} style={{ left: 1250, top: y(618), whiteSpace: "nowrap" }}>
        <span style={label(23, INK_SOFT)}>Parade magazine, 1990</span>
      </Ink>
      <Ink at={yesAt - 2} dur={16} style={{ left: 1250, top: y(658), whiteSpace: "nowrap" }}>
        <span style={{ ...body(36, true), color: INK }}>
          {/* Her advice, not her words, so no quotation marks. */}
          Switch:<span style={{ opacity: ease(frame, twoAt - 4, 12) }}> it wins two times in three.</span>
        </span>
      </Ink>
      {LETTERS.map((l, i) => {
        const p = pop(frame, thousandsAt - 2 + i * 1.4 + l.jit, fps, 14);
        if (p <= 0.001) return null;
        const ex = 1270 + l.dx;
        const ey = y(820) + l.dy;
        return (
          <Illustration
            key={i}
            video={VIDEO}
            id="probability-letter"
            style={{
              position: "absolute",
              left: ex - LETTER.w / 2,
              top: ey - LETTER.h / 2,
              width: LETTER.w,
              height: LETTER.h,
              opacity: Math.min(1, p),
              transform: `translateY(${-(1 - Math.min(1, p)) * 30}px) rotate(${l.rot}deg)`,
            }}
          />
        );
      })}
      <Note at={wrongAt - 4} x={1250} y={y(860) + 18}>
        <span style={{ ...note(23, STAT_INK), fontWeight: 500, whiteSpace: "nowrap" }}>Thousands of letters: she&apos;s wrong.</span>
      </Note>
    </AbsoluteFill>
  );
};
