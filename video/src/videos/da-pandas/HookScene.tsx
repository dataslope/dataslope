import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, HIGHLIGHT, INK, INK_SOFT, PAPER, TABULAR, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { Drift, Headline, Kicker, pulse, Spot, X0 } from "./parts";

const COLS = 10;
const TILE_W = 76;
const TILE_H = 72;
const GAP = 12;
const GRID_Y = 330;
const ROW_PITCH = 86;
/** The questions taken slowly; the rest are the rapid-fire round. */
const TRAPS = 17;
const TOTAL = 30;

/**
 * The opening, as in Part 1: pandas, and its thirty questions as numbered
 * tiles. The first seventeen turn red as the narration says they hide a
 * trap, the other thirteen go to the rapid-fire round, and tile 1 lights up
 * on the bridge into the first question. The mousetrap and stopwatch are
 * Part 1's, so the legend reads the same in every part.
 */
export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("hook").from;
  const screenAt = n.word("hook", "isn't SQL");
  const pandasAt = n.word("hook", "pandas");
  const twentyAt = n.word("hook", "thirty");
  const tenAt = n.word("plan", "Seventeen");
  const slowlyAt = n.word("plan", "slowly");
  const fourteenAt = n.word("plan", "thirteen");
  const rapidAt = n.word("plan", "rapid-fire");
  const startAt = n.word("loc-in", "start");
  const end = n.beat("loc-in").to;

  const legendY = GRID_Y + 3 * ROW_PITCH + 30;

  return (
    <AbsoluteFill>
      <Sfx name="el-pop" at={twentyAt} level={-30} />
      <Sfx name="el-tap" at={tenAt + 2} level={-30} />
      <Sfx name="el-tap" at={fourteenAt + 2} level={-32} />
      <Sfx name="el-pencil" at={startAt + 2} level={-34} />

      <Drift from={from} to={end + 40}>
        <Kicker at={from}>Data analyst interview prep</Kicker>
        <Headline lead="When it isn't SQL," turn="it's pandas." at={screenAt - 10} turnAt={pandasAt - 4} size={72} />

        <Spot id="da-pandas-panda" at={from + 4} left={1150} top={y(290)} width={640} height={460} />

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
            <span style={{ color: ACCENT_INK, fontWeight: 650 }}>Seventeen</span> hide a trap, taken{" "}
            <span style={{ opacity: ease(frame, slowlyAt - 2, 10) }}>slowly</span>
          </span>
        </Note>
        <Spot id="da-sql-stopwatch" video="da-sql" at={fourteenAt - 2} left={X0 - 10} top={y(legendY + 120)} width={130} height={130} dim={startAt + 4} />
        <Note at={fourteenAt + 4} x={X0 + 140} y={y(legendY + 160)} dim={startAt + 4}>
          <span style={{ ...note(30, INK), whiteSpace: "nowrap" }}>
            <span style={{ fontWeight: 650 }}>Thirteen</span> get one answer each,{" "}
            <span style={{ opacity: ease(frame, rapidAt - 2, 10) }}>rapid fire</span>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
