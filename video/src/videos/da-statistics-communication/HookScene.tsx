import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, HIGHLIGHT, INK, INK_SOFT, PAPER, TABULAR, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { Drift, Headline, Kicker, pulse, Spot, X0 } from "./parts";

const COLS = 7;
const TILE_W = 76;
const TILE_H = 72;
const GAP = 12;
const GRID_Y = 330;
const ROW_PITCH = 86;
/** The questions taken slowly; the rest are the rapid-fire round. */
const TRAPS = 10;
const TOTAL = 14;

/**
 * The opening, as in Parts 1 and 2: the number and what it means, and the
 * fourteen questions as numbered tiles. The first ten turn red as the
 * narration says they hide a trap, the other four go to the rapid-fire
 * round, and tile 1 lights up on the bridge into the first question. The
 * mousetrap and stopwatch are Part 1's, so the legend reads the same in
 * every part.
 */
export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("hook").from;
  const numberAt = n.word("hook", "a number");
  const meansAt = n.word("hook", "what it means");
  const twentyAt = n.word("hook", "fourteen");
  const tenAt = n.word("plan", "Ten");
  const slowlyAt = n.word("plan", "slowly");
  const fourteenAt = n.word("plan", "four");
  const rapidAt = n.word("plan", "rapid-fire");
  const startAt = n.word("median-in", "first");
  const end = n.beat("median-in").to;

  const legendY = GRID_Y + Math.ceil(TOTAL / COLS) * ROW_PITCH + 30;

  return (
    <AbsoluteFill>
      <Sfx name="el-pop" at={twentyAt} level={-30} />
      <Sfx name="el-tap" at={tenAt + 2} level={-30} />
      <Sfx name="el-tap" at={fourteenAt + 2} level={-32} />
      <Sfx name="el-pencil" at={startAt + 2} level={-34} />

      <Drift from={from} to={end + 40}>
        <Kicker at={from}>Data analyst interview prep</Kicker>
        <Headline lead="Here's a number." turn="What does it mean?" at={numberAt - 6} turnAt={meansAt - 4} size={72} />

        <Spot id="da-statistics-communication-elephant" at={from + 4} left={1150} top={y(290)} width={640} height={460} />

        {/* ── Thirty questions, numbered ── */}
        {Array.from({ length: TOTAL }, (_, i) => {
          const col = i % COLS;
          const row = Math.floor(i / COLS);
          const inAt = twentyAt - 4 + i * 1.5;
          const p = ease(frame, inAt, 12);
          if (p <= 0) return null;
          const trap = i < TRAPS;
          const tone = trap ? ease(frame, tenAt + i, 10) : ease(frame, fourteenAt + (i - TRAPS), 10);
          const lit = i === 0 ? ease(frame, startAt, 10) : 0;
          const dim = i === 0 ? 0 : ease(frame, startAt + 4, 14) * 0.55;
          const border = trap ? `color-mix(in srgb, ${ACCENT} ${30 + 70 * tone}%, ${INK_SOFT})` : INK_SOFT;
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
                border: `${trap ? 2 + tone : 2}px solid ${border}`,
                borderRadius: 8,
                background: lit > 0 ? HIGHLIGHT : trap ? `color-mix(in srgb, ${ACCENT} ${8 * tone}%, ${PAPER})` : PAPER,
                opacity: p * (trap ? 1 : 0.45 + 0.55 * tone) * (1 - dim),
                transform: `translateY(${(1 - p) * 10}px) scale(${1 + 0.06 * pulse(frame, startAt, 16)})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                ...label(28, trap && tone > 0.5 ? ACCENT_INK : INK),
                ...TABULAR,
                fontWeight: 700,
              }}
            >
              {i + 1}
            </div>
          );
        })}

        {/* ── The two kinds, each with its spot ── */}
        <Spot id="da-sql-trap" video="da-sql" at={tenAt - 2} left={X0 - 10} top={y(legendY)} width={130} height={130} dim={startAt + 4} />
        <Note at={tenAt + 4} x={X0 + 140} y={y(legendY + 40)} dim={startAt + 4}>
          <span style={{ ...note(30, INK), whiteSpace: "nowrap" }}>
            <span style={{ color: ACCENT_INK, fontWeight: 650 }}>Ten</span> hide a trap, taken{" "}
            <span style={{ opacity: ease(frame, slowlyAt - 2, 10) }}>slowly</span>
          </span>
        </Note>
        <Spot id="da-sql-stopwatch" video="da-sql" at={fourteenAt - 2} left={X0 - 10} top={y(legendY + 120)} width={130} height={130} dim={startAt + 4} />
        <Note at={fourteenAt + 4} x={X0 + 140} y={y(legendY + 160)} dim={startAt + 4}>
          <span style={{ ...note(30, INK), whiteSpace: "nowrap" }}>
            <span style={{ fontWeight: 650 }}>Four</span> get one answer each,{" "}
            <span style={{ opacity: ease(frame, rapidAt - 2, 10) }}>rapid fire</span>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
