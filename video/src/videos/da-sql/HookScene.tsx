import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { HIGHLIGHT, INK, INK_SOFT, PAPER, TABULAR, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { Drift, Headline, Kicker, pulse, Spot, X0 } from "./parts";

const COLS = 8;
const TILE_W = 92;
const TILE_H = 72;
const GAP = 14;
const GRID_Y = 330;
const ROW_PITCH = 86;
/** The questions taken slowly; the rest are the rapid-fire round. */
const SLOW = 10;
const TOTAL = 24;

/**
 * The opening: the SQL screen, and its twenty-four questions as numbered
 * tiles. The first ten firm up in ink as the narration says they need a
 * picture (not all of them are traps, so they are not in the trap's red), the
 * other fourteen go to the rapid-fire round, and tile 1 lights up on the
 * bridge into the first question.
 */
export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("hook").from;
  const screenAt = n.word("hook", "SQL screen");
  const repeatAt = n.word("hook", "repeat");
  const twentyAt = n.word("hook", "twenty-four");
  const tenAt = n.word("plan", "Ten");
  const slowlyAt = n.word("plan", "slowly");
  const fourteenAt = n.word("plan-rapid", "fourteen");
  const rapidAt = n.word("plan-rapid", "rapid-fire");
  const startAt = n.word("where-in", "start", { nth: 1 });
  const end = n.beat("where-in").to;

  const legendY = GRID_Y + 3 * ROW_PITCH + 30;

  return (
    <AbsoluteFill>
      <Sfx name="el-pop" at={twentyAt} level={-30} />
      <Sfx name="el-tap" at={tenAt + 2} level={-30} />
      <Sfx name="el-tap" at={fourteenAt + 2} level={-32} />
      <Sfx name="el-pencil" at={startAt + 2} level={-34} />

      <Drift from={from} to={end + 40}>
        <Kicker at={from}>Data analyst interview prep</Kicker>
        <Headline lead="The SQL screen," turn="and the questions repeat." at={screenAt - 8} turnAt={repeatAt - 4} size={72} />

        <Spot id="da-sql-desk" at={from + 4} left={1150} top={y(300)} width={640} height={427} />

        {/* ── Twenty-four questions, numbered ── */}
        {Array.from({ length: TOTAL }, (_, i) => {
          const col = i % COLS;
          const row = Math.floor(i / COLS);
          const inAt = twentyAt - 4 + i * 1.5;
          const p = ease(frame, inAt, 12);
          if (p <= 0) return null;
          const slow = i < SLOW;
          const tone = slow ? ease(frame, tenAt + i, 10) : ease(frame, fourteenAt + (i - SLOW), 10);
          const lit = i === 0 ? ease(frame, startAt, 10) : 0;
          const dim = i === 0 ? 0 : ease(frame, startAt + 4, 14) * 0.55;
          const border = slow ? `color-mix(in srgb, ${INK} ${30 + 70 * tone}%, ${INK_SOFT})` : INK_SOFT;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: X0 + col * (TILE_W + GAP),
                top: y(GRID_Y + row * ROW_PITCH),
                width: TILE_W,
                height: h(TILE_H),
                boxSizing: "border-box",
                border: `${slow ? 2 + tone : 2}px solid ${border}`,
                borderRadius: 8,
                background: lit > 0 ? HIGHLIGHT : slow ? `color-mix(in srgb, ${INK} ${6 * tone}%, ${PAPER})` : PAPER,
                opacity: p * (slow ? 1 : 0.45 + 0.55 * tone) * (1 - dim),
                transform: `translateY(${(1 - p) * 10}px) scale(${1 + 0.06 * pulse(frame, startAt, 16)})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                ...label(30, INK),
                ...TABULAR,
                fontWeight: 700,
              }}
            >
              {i + 1}
            </div>
          );
        })}

        {/* ── The two kinds, each with its spot ── */}
        <Spot id="da-sql-trap" at={tenAt - 2} left={X0 - 10} top={y(legendY)} width={130} height={130} dim={startAt + 4} />
        <Note at={tenAt + 4} x={X0 + 140} y={y(legendY + 40)} dim={startAt + 4}>
          <span style={{ ...note(30, INK), whiteSpace: "nowrap" }}>
            <span style={{ fontWeight: 650 }}>Ten</span>, taken <span style={{ opacity: ease(frame, slowlyAt - 2, 10) }}>slowly</span>
          </span>
        </Note>
        <Spot id="da-sql-stopwatch" at={fourteenAt - 2} left={X0 - 10} top={y(legendY + 120)} width={130} height={130} dim={startAt + 4} />
        <Note at={fourteenAt + 4} x={X0 + 140} y={y(legendY + 160)} dim={startAt + 4}>
          <span style={{ ...note(30, INK), whiteSpace: "nowrap" }}>
            <span style={{ fontWeight: 650 }}>Fourteen</span> get one answer each,{" "}
            <span style={{ opacity: ease(frame, rapidAt - 2, 10) }}>rapid fire</span>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
