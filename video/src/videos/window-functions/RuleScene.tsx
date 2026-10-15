import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, HAIRLINE, headline, INK, label } from "../../editorial/style";
import { Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { ds } from "../../theme/brand";
import { GROUPED, ILLUSTRATIONS, regionOf, VIDEO, WINDOWED } from "./data";
import { KICKER_Y, Mono, REGION_COLOR, X0 } from "./kit";

const CELL = `color-mix(in srgb, ${INK} 14%, transparent)`;
const COMPUTED = ds("yellow", 400);
const TEXT_X = 520;

/**
 * A result drawn as blocks: one row per result row, a region-colored first
 * cell, plain cells for the columns it read, and a yellow one for the value
 * it computed. Rows ink in one after another from `at`; the computed column
 * arrives at `computedAt`.
 */
const Blocks: React.FC<{
  rows: readonly (readonly string[])[];
  cells: number;
  top: number;
  at: number;
  computedAt: number;
}> = ({ rows, cells, top, at, computedAt }) => {
  const frame = useCurrentFrame();
  const { h } = useLayout();
  const cellH = h(26);
  const gap = 8;
  return (
    <>
      {rows.map((row, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: X0,
            top: top + i * (cellH + gap),
            display: "flex",
            gap,
            opacity: ease(frame, at + i * 3, 10),
            transform: `translateX(${(1 - ease(frame, at + i * 3, 10)) * -14}px)`,
          }}
        >
          {Array.from({ length: cells }, (_, c) => {
            const computed = c === cells - 1;
            const shown = computed ? ease(frame, computedAt + i * 2, 10) : 1;
            return (
              <div
                key={c}
                style={{
                  width: c === 0 ? 52 : 72,
                  height: cellH,
                  borderRadius: 3,
                  background: c === 0 ? REGION_COLOR[regionOf(row)] : computed ? COMPUTED : CELL,
                  opacity: shown,
                }}
              />
            );
          })}
        </div>
      ))}
    </>
  );
};

/** Rule: one row per group, or every row with its group beside it. */
export const RuleScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = useNarration();
  const { y, h } = useLayout();

  const open = n.beat("rule").from - 8;
  const groupAt = n.word("rule", "GROUP BY");
  const perAt = n.word("rule", "one row per group");
  const windowAt = n.word("rule", "A window function");
  const everyAt = n.word("rule", "every row");
  const besideAt = n.word("rule", "beside it");
  const art = pop(frame, windowAt, fps, 16);

  const top1 = y(196);
  const top2 = y(440);

  return (
    <AbsoluteFill>
      <Ink at={open} dur={14} style={{ left: X0 + 4, top: y(KICKER_Y) }}>
        <span style={label(21, ACCENT_INK)}>The difference</span>
      </Ink>

      <Blocks rows={GROUPED.rows} cells={GROUPED.columns.length} top={top1 + 6} at={groupAt} computedAt={perAt} />
      <Ink at={groupAt - 2} dur={16} style={{ left: TEXT_X, top: top1, width: 900 }}>
        <div style={{ ...label(24, INK) }}>
          <Mono weight={600}>GROUP BY</Mono>
        </div>
        <div style={{ ...headline(66), marginTop: 14 }}>One row per group.</div>
      </Ink>

      <div
        style={{
          position: "absolute",
          left: X0,
          top: y(372),
          width: 1680 * ease(frame, windowAt - 8, 16),
          height: 1,
          background: HAIRLINE,
        }}
      />

      <Blocks rows={WINDOWED.rows} cells={WINDOWED.columns.length} top={top2 + 6} at={everyAt - 4} computedAt={besideAt} />
      <Ink at={windowAt - 2} dur={16} style={{ left: TEXT_X, top: top2, width: 820 }}>
        <div style={{ ...label(24, INK) }}>
          A window function, <Mono weight={600}>OVER (…)</Mono>
        </div>
        <div style={{ ...headline(66, true), color: ACCENT_INK, marginTop: 14, lineHeight: 1.08 }}>
          Every row, with its group beside it.
        </div>
      </Ink>

      {ILLUSTRATIONS ? (
        <Illustration
          video={VIDEO}
          id="window-functions-jars"
          style={{
            position: "absolute",
            left: 1380,
            top: y(470),
            width: 420,
            height: h(250),
            opacity: art,
            transform: `translateY(${bob(frame, 4, 110) + (1 - art) * 26}px)`,
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
};
