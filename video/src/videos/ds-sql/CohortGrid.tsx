import React from "react";
import { useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { BAR, HIGHLIGHT, INK, INK_SOFT, PAPER, TABULAR, label, note } from "../../editorial/style";
import { COHORT } from "./data";

const LABEL_W = 96;

/**
 * The cohort chart: a row per month's new users, a column per month since,
 * each cell the share of the cohort still active, tinted by it. Empty cells
 * (past the data) stay blank, so the filled ones make a staircase, which is
 * outlined on `stairAt`. `fill(row, col)` says when each cell fills.
 */
export const CohortGrid: React.FC<{
  x: number;
  top: number;
  cell: number;
  cellH: number;
  at: number;
  fill: (row: number, col: number) => number;
  /** The month labels light up, one per row, from this frame. */
  rowsAt?: number;
  stairAt?: number;
  /** A row picked out, with a soft band. */
  rowMark?: { row: number; at: number; out?: number };
  /** Says, from `at`, what the blank cells are: months the newest cohort
   *  has not reached yet, not users who left. */
  blankNote?: { at: number; text: string };
  dim?: number;
  out?: number;
}> = ({ x, top, cell, cellH, at, fill, rowsAt, stairAt, rowMark, blankNote, dim, out }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 14);
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.6;
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  const x0 = x + LABEL_W;
  const rows = COHORT.grid;
  const cols = rows[0].cells.length;

  // The staircase: down the right edge of each row's last filled cell.
  const filled = rows.map((r) => r.cells.filter((c) => c !== null).length);
  let stair = `M${x0 + filled[0] * cell},${top}`;
  filled.forEach((f, i) => {
    stair += ` L${x0 + f * cell},${top + (i + 1) * cellH}`;
    const next = filled[i + 1];
    if (next !== undefined) stair += ` L${x0 + next * cell},${top + (i + 1) * cellH}`;
  });
  const stairP = stairAt === undefined ? 0 : ease(frame, stairAt, 30);

  return (
    <div style={{ position: "absolute", inset: 0, opacity: p * (1 - d) * (1 - o) }}>
      <div style={{ position: "absolute", left: x0, top: top - 58, ...label(19, INK_SOFT), whiteSpace: "nowrap" }}>months since first active</div>
      {Array.from({ length: cols }, (_, c) => (
        <div
          key={c}
          style={{ position: "absolute", left: x0 + c * cell, top: top - 30, width: cell, textAlign: "center", ...label(20, INK_SOFT), ...TABULAR }}
        >
          {c}
        </div>
      ))}
      {rowMark && (
        <div
          style={{
            position: "absolute",
            left: x - 8,
            top: top + rowMark.row * cellH + 3,
            width: LABEL_W + cols * cell + 16,
            height: cellH - 6,
            background: HIGHLIGHT,
            borderRadius: 6,
            opacity: ease(frame, rowMark.at, 12) * (1 - (rowMark.out === undefined ? 0 : ease(frame, rowMark.out, 12))) * 0.7,
          }}
        />
      )}
      {rows.map((r, i) => {
        const lit = rowsAt === undefined ? 1 : ease(frame, rowsAt + i * 5, 10);
        return (
          <div
            key={r.name}
            style={{
              position: "absolute",
              left: x,
              top: top + i * cellH,
              height: cellH,
              display: "flex",
              alignItems: "center",
              ...note(24, INK),
              fontWeight: 650,
              opacity: 0.45 + 0.55 * lit,
            }}
          >
            {r.name}
          </div>
        );
      })}
      {rows.map((r, i) =>
        r.cells.map((v, c) => {
          const left = x0 + c * cell;
          const t = top + i * cellH;
          if (v === null) {
            return (
              <div
                key={`${i}-${c}`}
                style={{ position: "absolute", left: left + 3, top: t + 3, width: cell - 6, height: cellH - 6, borderRadius: 6, border: `1.5px dashed color-mix(in srgb, ${INK_SOFT} 35%, transparent)` }}
              />
            );
          }
          const f = ease(frame, fill(i, c), 12);
          const tone = 18 + 0.72 * v;
          return (
            <div
              key={`${i}-${c}`}
              style={{
                position: "absolute",
                left: left + 3,
                top: t + 3,
                width: cell - 6,
                height: cellH - 6,
                borderRadius: 6,
                background: `color-mix(in srgb, ${BAR} ${tone}%, ${PAPER})`,
                opacity: f,
                transform: `scale(${0.85 + 0.15 * f})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                ...note(23, v >= 60 ? PAPER : INK),
                fontWeight: 650,
                ...TABULAR,
              }}
            >
              {v}%
            </div>
          );
        }),
      )}
      {blankNote && (
        <div
          style={{
            position: "absolute",
            left: x0 + filled[rows.length - 1] * cell,
            top: top + (rows.length - 1) * cellH,
            width: (cols - filled[rows.length - 1]) * cell,
            height: cellH,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            ...note(22, INK_SOFT),
            fontStyle: "italic",
            whiteSpace: "nowrap",
            opacity: ease(frame, blankNote.at, 12),
          }}
        >
          {blankNote.text}
        </div>
      )}
      {stairP > 0 && (
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          <path d={stair} fill="none" stroke={INK} strokeWidth={3.5} strokeLinejoin="round" pathLength={1} strokeDasharray={`${stairP} 1`} />
        </svg>
      )}
    </div>
  );
};

/** The grid's full width, labels included. */
export const cohortGridWidth = (cell: number) => LABEL_W + COHORT.grid[0].cells.length * cell;
