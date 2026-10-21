import React from "react";
import { useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { ENTITY, type EntityLayout } from "../../editorial/erd";
import { ACCENT, BAR, BLUE_INK, HIGHLIGHT, INK, PAPER } from "../../editorial/style";
import { MONO, SANS } from "../../theme/fonts";

/**
 * The ERD kit's <Entity> (editorial/erd.tsx), drawn the same way, with one
 * addition: a key badge can wait for its own cue. The store is built step by
 * step, and its primary and unique keys belong to step five ("Step five,
 * keys"), not to the step that adds their row; drawn with the row, every box
 * arrived already answering step five. `keyAt` names, per column, when the
 * badge's PK or UK inks in. An FK always arrives with its row: the pointer
 * that makes it is step three's, and a pair like "PK, FK" shows its FK first
 * and gains its PK on the cue. The key column keeps its width throughout, so
 * no name moves when a badge arrives.
 *
 * Kept here until the kit's Entity takes a `keyAt` of its own; then this file
 * goes, and StoreErd passes the same prop to the kit's.
 */

const TONES = {
  key: `color-mix(in srgb, ${BAR} 18%, transparent)`,
  note: HIGHLIGHT,
  warn: `color-mix(in srgb, ${ACCENT} 24%, transparent)`,
} as const;

const HEADER_FILL = `color-mix(in srgb, ${INK} 7%, ${PAPER})`;

/** The key column's width, as the kit sizes it. */
const badgeWidth = (columns: EntityLayout["columns"]) =>
  columns.some((c) => c.key?.includes(",")) ? 74 : columns.some((c) => c.key) ? 32 : 0;

export const KeyedEntity: React.FC<{
  layout: EntityLayout;
  at: number;
  rowGap?: number;
  rowAt?: Record<string, number>;
  /** When each column's PK or UK badge inks in; without one, with its row. */
  keyAt?: Record<string, number>;
  marks?: Record<string, { at: number; tone?: keyof typeof TONES; out?: number }>;
  dim?: number;
  out?: number;
}> = ({ layout, at, rowGap = 5, rowAt = {}, keyAt = {}, marks = {}, dim, out }) => {
  const frame = useCurrentFrame();
  const shown = ease(frame, at, 12);
  const gone = out === undefined ? 0 : ease(frame, out, 10);
  if (shown <= 0 || gone >= 1) return null;
  const rowTimes = layout.columns.map((c, i) => rowAt[c.name] ?? at + 8 + i * rowGap);
  const rowIn = rowTimes.map((t) => ease(frame, t, 10));
  // The box grows to the last row that has started to arrive.
  const filled = rowIn.reduce((n, p, i) => (p > 0 ? Math.max(n, i + p) : n), 0);
  const height = 2 * ENTITY.border + layout.head + filled * layout.row;
  const dimmed = dim === undefined ? 0 : ease(frame, dim, 14) * 0.55;
  const badge = badgeWidth(layout.columns);
  return (
    <div
      style={{
        position: "absolute",
        left: layout.x,
        top: layout.y,
        width: layout.width,
        height,
        opacity: shown * (1 - gone) * (1 - dimmed),
        transform: `translateY(${(1 - shown) * 10}px)`,
        background: PAPER,
        border: `${ENTITY.border}px solid ${INK}`,
        borderRadius: 6,
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          height: layout.head,
          boxSizing: "border-box",
          display: "flex",
          alignItems: "center",
          padding: `0 ${ENTITY.pad}px`,
          background: HEADER_FILL,
          borderBottom: filled > 0 ? `1.5px solid ${INK}` : undefined,
          fontFamily: SANS,
          fontWeight: 650,
          fontSize: 25,
          letterSpacing: "-0.01em",
          color: INK,
          whiteSpace: "nowrap",
        }}
      >
        {layout.name}
      </div>
      {layout.columns.map((c, i) => {
        const p = rowIn[i];
        if (p <= 0) return null;
        const mark = marks[c.name];
        const wash = mark ? ease(frame, mark.at, 10) * (1 - (mark.out === undefined ? 0 : ease(frame, mark.out, 10))) : 0;
        // "PK, FK" as two parts: the FK with the row, the PK on its cue.
        const parts = (c.key ?? "").split(", ").filter(Boolean);
        const cue = keyAt[c.name];
        const partIn = parts.map((k) => (k === "FK" || cue === undefined ? 1 : ease(frame, cue, 10)));
        return (
          <div
            key={c.name}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: layout.head + i * layout.row,
              height: layout.row,
              display: "flex",
              alignItems: "center",
              gap: ENTITY.gap,
              padding: `0 ${ENTITY.pad}px`,
              opacity: p,
              transform: `translateX(${(1 - p) * -12}px)`,
              borderTop: i ? `1px solid color-mix(in srgb, ${INK} 22%, transparent)` : undefined,
              background: wash > 0 ? TONES[mark!.tone ?? "note"] : undefined,
            }}
          >
            <span
              style={{
                width: badge,
                display: badge ? undefined : "none",
                flex: "none",
                fontFamily: SANS,
                fontWeight: 700,
                fontSize: 19,
                color: BLUE_INK,
                whiteSpace: "nowrap",
              }}
            >
              {parts.map((k, j) => (
                <React.Fragment key={k}>
                  {/* The comma shows once the parts on both sides of it have. */}
                  {j ? <span style={{ opacity: Math.min(partIn[j - 1], partIn[j]) }}>, </span> : null}
                  <span style={{ opacity: partIn[j] }}>{k}</span>
                </React.Fragment>
              ))}
            </span>
            <span style={{ fontFamily: MONO, fontSize: 21, color: INK, whiteSpace: "nowrap", flex: "1 1 auto", overflow: "hidden" }}>
              {c.name}
            </span>
          </div>
        );
      })}
    </div>
  );
};
