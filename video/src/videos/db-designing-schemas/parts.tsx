import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { arrowHead, type Pt, roundedPolyline } from "../../components/arrow";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { ENTITY, type EntityLayout } from "../../editorial/erd";
import { useLayout } from "../../editorial/layout";
import {
  ACCENT,
  ACCENT_INK,
  BAR,
  BLUE_INK,
  body,
  HAIRLINE,
  headline,
  HIGHLIGHT,
  INK,
  INK_SOFT,
  label,
  PAPER,
} from "../../editorial/style";
import { Ink } from "../../editorial/ui";
import { ds } from "../../theme/brand";
import { MONO, SANS } from "../../theme/fonts";
import { type Cell, ILLUSTRATIONS, VIDEO } from "./data";

/**
 * Pieces this video needs beyond the shared editorial kit and the ERD kit
 * (editorial/erd.tsx): the eight-step rail the store is built along, a
 * database table drawn as rows and cells (after WhyNormalization's kit,
 * with columns that can arrive or be refused), Postgres's error box, and the
 * marks the narration points with.
 *
 * Colors: keys in the data blue, as the ERD kit draws them; what Postgres
 * refuses in the red accent; the phrase being read in the page's yellow.
 */

export const KEY = BAR;
export const KEY_INK = BLUE_INK;
export const MARK_BAD = `color-mix(in srgb, ${ACCENT} 26%, transparent)`;
export const MARK_KEY = `color-mix(in srgb, ${BAR} 18%, transparent)`;

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp01 = (t: number) => Math.max(0, Math.min(1, t));

/** 0 → 1 → 0 over `dur` frames from `at`: a swell for something named again. */
export const pulse = (frame: number, at: number, dur = 18) => {
  const t = (frame - at) / dur;
  return t <= 0 || t >= 1 ? 0 : Math.sin(t * Math.PI) ** 2;
};

export const Svg: React.FC<{ opacity?: number; children: React.ReactNode }> = ({ opacity = 1, children }) => (
  <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity }}>
    {children}
  </svg>
);

/** A part's kicker, top left, in sentence case: the only marker a part gets. */
export const Kicker: React.FC<{ at: number; out?: number; children: React.ReactNode }> = ({ at, out, children }) => {
  const { y } = useLayout();
  return (
    <Ink at={at} dur={14} out={out} style={{ left: 96, top: y(112), whiteSpace: "nowrap" }}>
      <span style={label(22, INK_SOFT)}>{children}</span>
    </Ink>
  );
};

/**
 * A headline line in two inks: the lead in roman on `at`, the turn in italic
 * accent following it on `second`. Both leave on `out`.
 */
export const Head: React.FC<{
  at: number;
  second?: number;
  out?: number;
  size?: number;
  top?: number;
  children: React.ReactNode;
  italic?: React.ReactNode;
}> = ({ at, second, out, size = 64, top = 150, children, italic }) => {
  const { y } = useLayout();
  return (
    <div style={{ position: "absolute", left: 92, top: y(top), display: "flex", gap: "0.28em", whiteSpace: "nowrap", ...headline(size) }}>
      <Ink at={at} dur={20} out={out} style={{ position: "relative", whiteSpace: "nowrap" }}>
        {children}
      </Ink>
      {italic !== undefined && second !== undefined ? (
        <Ink at={second} dur={18} out={out} style={{ position: "relative", ...headline(size, true), color: ACCENT_INK, whiteSpace: "nowrap" }}>
          {italic}
        </Ink>
      ) : null}
    </div>
  );
};

/** A highlighter stroke under the words it wraps, swept on `at`, lifted on `out`. */
export const Mark: React.FC<{ at: number; out?: number; dur?: number; color?: string; children: React.ReactNode }> = ({
  at,
  out,
  dur = 12,
  color = HIGHLIGHT,
  children,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, dur);
  const o = out === undefined ? 0 : ease(frame, out, 14);
  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      <span
        style={{
          position: "absolute",
          left: "-0.12em",
          top: "0.06em",
          bottom: "-0.04em",
          width: `calc((100% + 0.24em) * ${p})`,
          background: color,
          borderRadius: "0.14em",
          opacity: p > 0 ? 1 - o : 0,
        }}
      />
      <span style={{ position: "relative" }}>{children}</span>
    </span>
  );
};

/** A pen line drawn under the words it wraps, left to right on `at`. */
export const Underline: React.FC<{ at: number; out?: number; color?: string; children: React.ReactNode }> = ({
  at,
  out,
  color = ACCENT,
  children,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12);
  const o = out === undefined ? 0 : ease(frame, out, 12);
  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      {children}
      <span
        style={{
          position: "absolute",
          left: 0,
          top: "1.02em",
          width: `calc(100% * ${p})`,
          height: "0.07em",
          minHeight: 3,
          borderRadius: 2,
          background: color,
          opacity: p > 0 ? 1 - o : 0,
        }}
      />
    </span>
  );
};

/** A line struck through the words it wraps, drawn left to right on `at`. */
export const Strike: React.FC<{ at: number; color?: string; top?: string; children: React.ReactNode }> = ({
  at,
  color = ACCENT,
  top = "0.55em",
  children,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12);
  return (
    <span style={{ position: "relative", display: "inline-block", lineHeight: 1 }}>
      {children}
      <span
        style={{
          position: "absolute",
          left: "-0.06em",
          top,
          width: `calc((100% + 0.12em) * ${p})`,
          height: "0.07em",
          minHeight: 3,
          background: color,
          borderRadius: 2,
          transform: "rotate(-1.5deg)",
          transformOrigin: "0 50%",
          opacity: p > 0 ? 1 : 0,
        }}
      />
    </span>
  );
};

/**
 * A slow, eased push on a figure being talked about: its children scale by
 * `amount` from `from` to `to` about `origin`, so it is never quite frozen.
 */
export const Drift: React.FC<{ from: number; to: number; amount?: number; origin?: string; children: React.ReactNode }> = ({
  from,
  to,
  amount = 0.02,
  origin = "50% 55%",
  children,
}) => {
  const frame = useCurrentFrame();
  const t = clamp01((frame - from) / Math.max(1, to - from));
  const e = t * t * (3 - 2 * t);
  return (
    <div style={{ position: "absolute", inset: 0, transform: `scale(${1 + amount * e})`, transformOrigin: origin }}>
      {children}
    </div>
  );
};

/** A watercolor spot from illustrations.json: pops in on `at`, bobs, fades on `out`. */
export const Spot: React.FC<{
  id: string;
  at: number;
  out?: number;
  dim?: number;
  left: number;
  top: number;
  width: number;
  height: number;
}> = ({ id, at, out, dim, left, top, width, height }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, at, fps, 16);
  const o = out === undefined ? 0 : ease(frame, out, 12);
  const d = dim === undefined ? 0 : ease(frame, dim, 18) * 0.6;
  if (!ILLUSTRATIONS || p <= 0.001 || o >= 1) return null;
  return (
    <Illustration
      video={VIDEO}
      id={id}
      style={{
        position: "absolute",
        left,
        top,
        width,
        height,
        opacity: Math.min(1, p) * (1 - o) * (1 - d),
        transform: `translateY(${bob(frame, 5, 110) + (1 - p) * 30}px)`,
      }}
    />
  );
};

/**
 * An arrow along an orthogonal path, its corners rounded, drawing itself from
 * the first point on `at`, with an open head built by arrowHead() on the
 * drawn line. Keep the last segment longer than the head.
 */
export const PathArrow: React.FC<{
  points: readonly Pt[];
  at: number;
  dur?: number;
  out?: number;
  dim?: number;
  color?: string;
  width?: number;
  radius?: number;
  dash?: string;
}> = ({ points, at, dur = 18, out, dim, color = INK, width = 2.4, radius = 18, dash }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, dur);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.65;
  if (p <= 0 || o >= 1) return null;
  const { samples } = roundedPolyline(points, radius);
  // The drawn part of the line, as samples, so the head sits on what is drawn.
  const total = samples.slice(1).reduce((s, [x, yy], i) => s + Math.hypot(x - samples[i][0], yy - samples[i][1]), 0);
  const want = total * p;
  const drawn: Pt[] = [samples[0]];
  let walked = 0;
  for (let i = 1; i < samples.length; i++) {
    const [ax, ay] = samples[i - 1];
    const [bx, by] = samples[i];
    const seg = Math.hypot(bx - ax, by - ay);
    if (walked + seg >= want) {
      const f = seg ? (want - walked) / seg : 0;
      drawn.push([ax + (bx - ax) * f, ay + (by - ay) * f]);
      break;
    }
    drawn.push(samples[i]);
    walked += seg;
  }
  const dAttr = drawn.map(([x, yy], i) => `${i ? "L" : "M"}${x.toFixed(1)},${yy.toFixed(1)}`).join(" ");
  const head = 15;
  return (
    <Svg opacity={(1 - o) * (1 - d)}>
      <path d={dAttr} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={dash} />
      {want > head * 1.4 ? (
        <path
          d={arrowHead(drawn, head, head * 0.6)}
          fill="none"
          stroke={color}
          strokeWidth={width}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}
    </Svg>
  );
};

/** A soft ring that swells and fades around a point: "this one". */
export const Ping: React.FC<{ x: number; y: number; at: number; color?: string; r?: number; dur?: number }> = ({
  x,
  y,
  at,
  color = ACCENT,
  r = 26,
  dur = 22,
}) => {
  const frame = useCurrentFrame();
  const t = (frame - at) / dur;
  if (t <= 0 || t >= 1) return null;
  return (
    <Svg>
      <circle cx={x} cy={y} r={r * (0.5 + t)} fill="none" stroke={color} strokeWidth={3 * (1 - t)} opacity={1 - t} />
    </Svg>
  );
};

// ── Rows drawn over an ERD entity box ────────────────────────────────────────

/** Where row `i` of an entity box sits, whether or not the box has it. */
export const rowBox = (e: EntityLayout, i: number) => ({ top: e.top + e.head + i * e.row, mid: e.top + e.head + i * e.row + e.row / 2 });

/**
 * A row an entity box does not have, drawn where its next row would go: a
 * dashed outline holding a column name, struck through on `strikeAt` and
 * faded on `out`. For a fact that belongs somewhere else.
 */
export const GhostRow: React.FC<{ e: EntityLayout; index: number; name: string; at: number; strikeAt?: number; out?: number }> = ({
  e,
  index,
  name,
  at,
  strikeAt,
  out,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12);
  const o = out === undefined ? 0 : ease(frame, out, 12);
  if (p <= 0 || o >= 1) return null;
  const r = rowBox(e, index);
  return (
    <div
      style={{
        position: "absolute",
        left: e.left + 4,
        top: r.top + 4,
        width: e.width - 8,
        height: e.row - 8,
        boxSizing: "border-box",
        border: `2px dashed ${ACCENT}`,
        borderRadius: 4,
        display: "flex",
        alignItems: "center",
        // Where the box sets its names: after the key badge, as erd.tsx sizes it.
        paddingLeft: ENTITY.pad + (e.columns.some((c) => c.key === "PK, FK") ? 74 : e.columns.some((c) => c.key) ? 32 : 0) + ENTITY.gap - 4,
        opacity: p * (1 - o),
        transform: `translateX(${(1 - p) * -12}px)`,
        fontFamily: MONO,
        fontSize: 21,
        color: ACCENT_INK,
      }}
    >
      {strikeAt === undefined ? name : <Strike at={strikeAt}>{name}</Strike>}
    </div>
  );
};

/**
 * A highlighter wash laid over rows of an entity box, swept left to right on
 * `at` and lifted on `out`. Multiplied into the box, so the text under it
 * stays dark: a row can be lit again after the box's own mark has gone.
 */
export const RowWash: React.FC<{ e: EntityLayout; rows: readonly number[]; at: number; out?: number; color?: string }> = ({
  e,
  rows,
  at,
  out,
  color = `color-mix(in srgb, ${ds("yellow", 400)} 70%, ${PAPER})`,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12);
  const o = out === undefined ? 0 : ease(frame, out, 12);
  if (p <= 0 || o >= 1) return null;
  return (
    <>
      {rows.map((i) => {
        const r = rowBox(e, i);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: e.left + 2,
              top: r.top + 1,
              width: (e.width - 4) * p,
              height: e.row - 2,
              background: color,
              mixBlendMode: "multiply",
              opacity: 1 - o,
            }}
          />
        );
      })}
    </>
  );
};

/** A line struck across one row of an entity box, on `at`. */
export const RowStrike: React.FC<{ e: EntityLayout; index: number; at: number; out?: number }> = ({ e, index, at, out }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  const r = rowBox(e, index);
  return (
    <div
      style={{
        position: "absolute",
        left: e.left + 12,
        top: r.mid - 1.5,
        width: (e.width - 24) * p,
        height: 3,
        borderRadius: 2,
        background: ACCENT,
        opacity: 1 - o,
      }}
    />
  );
};

// ── The eight steps (the-design-process) ─────────────────────────────────────

export const STEP_LABELS = [
  "Gather requirements",
  "Identify entities",
  "Identify attributes",
  "Identify relationships",
  "Choose keys",
  "Add constraints",
  "Normalize",
  "Review with examples",
] as const;

/** The rail's row pitch and number circle, before its scale. */
export const RAIL = { pitch: 54, dot: 34, gap: 14, width: 300 } as const;

/**
 * The eight steps as a numbered list. `named[i]` is when step i inks in.
 * `active` (a fractional index, eased between steps by the caller) lights
 * the step being worked on and sets back the ones done and to come; until
 * `railFrom` every named step stands in full ink. Positioned and scaled by
 * the caller, in its own unscaled coordinates.
 */
export const StepList: React.FC<{ named: readonly number[]; railFrom: number; active: number; flash?: { step: number; at: number } }> = ({
  named,
  railFrom,
  active,
  flash,
}) => {
  const frame = useCurrentFrame();
  const rail = ease(frame, railFrom, 16);
  return (
    <>
      {STEP_LABELS.map((text, i) => {
        const p = ease(frame, named[i], 14);
        if (p <= 0) return null;
        // How lit this step is: 1 when it is the one in hand.
        const lit = clamp01(1 - Math.abs(active - i));
        const done = clamp01(active - i);
        const sw = flash && flash.step === i ? pulse(frame, flash.at, 22) : 0;
        const labelOp = lerp(1, lerp(0.42 + done * 0.3, 1, lit), rail);
        const fill = lit * rail;
        return (
          <div
            key={text}
            style={{
              position: "absolute",
              left: 0,
              top: i * RAIL.pitch,
              height: RAIL.dot,
              display: "flex",
              alignItems: "center",
              gap: RAIL.gap,
              opacity: p,
              transform: `translateX(${(1 - p) * -14}px)`,
              whiteSpace: "nowrap",
            }}
          >
            <div
              style={{
                width: RAIL.dot,
                height: RAIL.dot,
                flex: "none",
                borderRadius: "50%",
                boxSizing: "border-box",
                border: `2px solid ${fill > 0.5 ? BAR : INK}`,
                background: `color-mix(in srgb, ${BAR} ${Math.round(fill * 100)}%, color-mix(in srgb, ${INK_SOFT} ${Math.round(done * rail * 22)}%, ${PAPER}))`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: SANS,
                fontWeight: 700,
                fontSize: 19,
                color: fill > 0.5 ? PAPER : INK,
                transform: `scale(${1 + sw * 0.25})`,
                opacity: lerp(1, lerp(0.55, 1, Math.max(lit, done)), rail),
              }}
            >
              {i + 1}
            </div>
            <span
              style={{
                ...label(22, INK),
                fontWeight: lit * rail > 0.5 ? 700 : 560,
                opacity: labelOp,
                position: "relative",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  left: "-0.2em",
                  right: "-0.2em",
                  top: "0.05em",
                  bottom: "-0.05em",
                  background: HIGHLIGHT,
                  borderRadius: "0.14em",
                  opacity: fill * 0.9,
                }}
              />
              <span style={{ position: "relative" }}>{text}</span>
            </span>
          </div>
        );
      })}
    </>
  );
};

// ── A database table, drawn as rows and cells (after WhyNormalization's kit) ─

export const HEAD_SIZE = 22;
export const BODY_SIZE = 26;
const PAD = 20;
/** JetBrains Mono's advance, in em. */
const ADVANCE = 0.6;
const shown = (v: Cell) => (v === null ? "null" : v);

export type TableGeometry = {
  x: number;
  top: number;
  widths: number[];
  xs: number[];
  width: number;
  headH: number;
  rowH: number;
  rowTop: (i: number) => number;
  rowMid: (i: number) => number;
};

/** Where a table's columns and rows fall: each column as wide as its title or
 *  its longest value (counting `extra` values it will hold), plus padding. */
export const tableGeometry = ({
  x,
  top,
  cols,
  rows,
  extra = [],
  headH,
  rowH,
}: {
  x: number;
  top: number;
  cols: readonly string[];
  rows: readonly (readonly Cell[])[];
  extra?: readonly (readonly Cell[])[];
  headH: number;
  rowH: number;
}): TableGeometry => {
  const all = [...rows, ...extra];
  const widths = cols.map((c, i) =>
    Math.ceil(Math.max(c.length * ADVANCE * HEAD_SIZE, ...all.map((r) => shown(r[i] ?? "").length * ADVANCE * BODY_SIZE)) + 2 * PAD),
  );
  const xs = widths.map((_, i) => x + widths.slice(0, i).reduce((a, b) => a + b, 0));
  const width = widths.reduce((a, b) => a + b, 0);
  const rowTop = (i: number) => top + headH + i * rowH;
  return { x, top, widths, xs, width, headH, rowH, rowTop, rowMid: (i) => rowTop(i) + rowH / 2 };
};

/** A highlighter stroke behind one cell's text. */
export type CellMark = { row: number; col: number; at: number; out?: number; color?: string };
/** A cell whose value changes: the old fades and the new inks in. */
export type CellSwap = { row: number; col: number; at: number; value: string; color?: string };

const wipe = (p: number): React.CSSProperties => {
  if (p >= 1) return {};
  const edge = p * 130 - 15;
  const mask = `linear-gradient(90deg, ${INK} ${edge - 18}%, transparent ${edge + 4}%)`;
  return { WebkitMaskImage: mask, maskImage: mask, filter: `blur(${(1 - p) * 1.4}px)` };
};

const CellText: React.FC<{ value: Cell; color: string; mark?: CellMark; swaps: CellSwap[] }> = ({ value, color, mark, swaps }) => {
  const frame = useCurrentFrame();
  const current = swaps.filter((s) => frame >= s.at).pop();
  const next = swaps.find((s) => frame < s.at);
  const text = current ? current.value : shown(value);
  const fade = next ? 1 - ease(frame, next.at - 6, 6) : 1;
  const w = mark ? ease(frame, mark.at, 12) : 0;
  const gone = mark?.out === undefined ? 0 : ease(frame, mark.out, 10);
  const isNull = !current && value === null;
  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      {mark && w > 0 && gone < 1 ? (
        <span
          style={{
            position: "absolute",
            inset: "0.02em -0.28em",
            background: mark.color ?? HIGHLIGHT,
            clipPath: `inset(0 ${(1 - w) * 100}% 0 0)`,
            opacity: 1 - gone,
          }}
        />
      ) : null}
      <span
        style={{
          position: "relative",
          display: "inline-block",
          padding: "0.12em 0.1em",
          margin: "-0.12em -0.1em",
          color: current ? (current.color ?? color) : isNull ? ACCENT_INK : color,
          fontStyle: isNull ? "italic" : undefined,
          opacity: fade,
          ...(current ? wipe(ease(frame, current.at, 14)) : {}),
        }}
      >
        {text}
      </span>
    </span>
  );
};

/**
 * A database table as a SQL client prints it: a rule above, the column
 * titles, a hairline, the rows, a rule below. A column can arrive late
 * (`colAt`), so the rules lengthen to take it in, or be refused (`ghostCols`:
 * drawn dashed in the accent, and faded on `ghostOut`).
 */
export const DbTable: React.FC<{
  g: TableGeometry;
  cols: readonly string[];
  rows: readonly { cells: readonly Cell[]; at: number }[];
  at: number;
  numeric?: readonly number[];
  colAt?: Readonly<Record<number, number>>;
  ghostCols?: readonly number[];
  ghostOut?: number;
  /** A badge after a column's title from a frame on ("NOT NULL"). */
  badges?: readonly { col: number; at: number; text: string }[];
  marks?: readonly CellMark[];
  swaps?: readonly CellSwap[];
  colInk?: Readonly<Record<number, string>>;
}> = ({ g, cols, rows, at, numeric = [], colAt = {}, ghostCols = [], ghostOut, badges = [], marks = [], swaps = [], colInk = {} }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 16);
  if (p <= 0) return null;
  const colIn = cols.map((_, j) => (colAt[j] === undefined ? 1 : ease(frame, colAt[j], 14)));
  const ghostGone = ghostOut === undefined ? 0 : ease(frame, ghostOut, 12);
  const isGhost = (j: number) => ghostCols.includes(j);
  // The rules reach across every column that has arrived and is not a ghost.
  const solidW = g.widths.reduce((s, w, j) => s + (isGhost(j) ? 0 : w * colIn[j]), 0) * p;
  const bottom = g.rowTop(rows.length);
  // The Ink reveal's box is the cell; the padding goes on a box inside it, so
  // the reveal's own bleed margin is left alone.
  const cellBox = (j: number): React.CSSProperties => ({
    left: g.xs[j],
    width: g.widths[j],
    display: "flex",
    alignItems: "center",
    justifyContent: numeric.includes(j) ? "flex-end" : "flex-start",
    whiteSpace: "pre",
  });
  const inner: React.CSSProperties = { padding: `0 ${PAD}px`, display: "flex", alignItems: "center", gap: 10 };
  return (
    <>
      <div style={{ position: "absolute", left: g.x, top: g.top, width: solidW, height: 2, background: INK }} />
      <div style={{ position: "absolute", left: g.x, top: g.top + g.headH - 1, width: solidW, height: 1, background: HAIRLINE }} />
      <div style={{ position: "absolute", left: g.x, top: bottom - 1, width: solidW, height: 1.5, background: INK }} />
      {ghostCols.map((j) =>
        colIn[j] > 0 && ghostGone < 1 ? (
          <div
            key={j}
            style={{
              position: "absolute",
              left: g.xs[j] + 6,
              top: g.top + 4,
              width: g.widths[j] - 12,
              height: bottom - g.top - 8,
              boxSizing: "border-box",
              border: `2px dashed ${ACCENT}`,
              borderRadius: 4,
              opacity: colIn[j] * (1 - ghostGone),
            }}
          />
        ) : null,
      )}
      {cols.map((c, j) => {
        if (colIn[j] <= 0) return null;
        const o = isGhost(j) ? 1 - ghostGone : 1;
        if (o <= 0) return null;
        const badge = badges.find((b) => b.col === j);
        const bIn = badge ? ease(frame, badge.at, 12) : 0;
        return (
          <Ink
            key={`${j}-${c}`}
            at={colAt[j] ?? at + 2}
            dur={14}
            style={{ ...cellBox(j), top: g.top, height: g.headH, opacity: o }}
          >
            <div style={inner}>
            <span style={{ fontFamily: MONO, fontSize: HEAD_SIZE, fontWeight: 600, color: isGhost(j) ? ACCENT_INK : INK_SOFT }}>{c}</span>
            {badge && bIn > 0 ? (
              <span
                style={{
                  fontFamily: SANS,
                  fontWeight: 700,
                  fontSize: 19,
                  color: PAPER,
                  background: KEY,
                  borderRadius: 4,
                  padding: "1px 7px",
                  opacity: bIn,
                  transform: `scale(${0.8 + 0.2 * bIn})`,
                  whiteSpace: "nowrap",
                }}
              >
                {badge.text}
              </span>
            ) : null}
            </div>
          </Ink>
        );
      })}
      {rows.map((r, i) => {
        const top = g.rowTop(i);
        const rowIn = ease(frame, r.at - 2, 10);
        return (
          <React.Fragment key={i}>
            {i > 0 ? (
              <div
                style={{
                  position: "absolute",
                  left: g.x,
                  top,
                  width: solidW,
                  height: 1,
                  background: `color-mix(in srgb, ${INK} 16%, transparent)`,
                  opacity: rowIn,
                }}
              />
            ) : null}
            {r.cells.map((v, j) => {
              if (colIn[j] <= 0) return null;
              const o = isGhost(j) ? 1 - ghostGone : 1;
              if (o <= 0) return null;
              return (
                <Ink
                  key={j}
                  at={Math.max(r.at, colAt[j] ?? r.at)}
                  dur={14}
                  style={{ ...cellBox(j), top, height: g.rowH, fontFamily: MONO, fontSize: BODY_SIZE, opacity: o }}
                >
                  <div style={inner}>
                    <CellText
                      value={v}
                      color={colInk[j] ?? INK}
                      mark={marks.find((m) => m.row === i && m.col === j)}
                      swaps={swaps.filter((s) => s.row === i && s.col === j)}
                    />
                  </div>
                </Ink>
              );
            })}
          </React.Fragment>
        );
      })}
    </>
  );
};

// ── Postgres's answers ───────────────────────────────────────────────────────

/** An error as psql prints it: the ERROR line, then its DETAIL if it has one. */
export const ErrorBox: React.FC<{
  x: number;
  top: number;
  width: number;
  at: number;
  out?: number;
  message: string;
  detail?: string | null;
}> = ({ x, top, width, at, out, message, detail }) => (
  <Ink at={at} dur={16} out={out} style={{ left: x, top, width }}>
    <div
      style={{
        borderLeft: `4px solid ${ACCENT}`,
        background: `color-mix(in srgb, ${ACCENT} 9%, ${PAPER})`,
        padding: "14px 22px 16px",
        fontFamily: MONO,
        fontSize: 21,
        lineHeight: 1.45,
        whiteSpace: "pre-wrap",
        color: INK,
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <div>
        <span style={{ color: ACCENT_INK, fontWeight: 700 }}>ERROR:</span>
        {"  "}
        {message}
      </div>
      {detail ? (
        <div style={{ color: INK_SOFT }}>
          <span style={{ fontWeight: 600 }}>DETAIL:</span>
          {"  "}
          {detail}
        </div>
      ) : null}
    </div>
  </Ink>
);

/** A short note set in the body face, italic: the narration's aside on the page. */
export const Aside: React.FC<{ size?: number; color?: string; children: React.ReactNode }> = ({ size = 30, color = INK_SOFT, children }) => (
  <span style={{ ...body(size, true), color, whiteSpace: "nowrap" }}>{children}</span>
);

/** A chip: a few words of Inter in a soft rounded box. */
export const Chip: React.FC<{ tone?: "ink" | "key" | "warn" | "soft"; size?: number; children: React.ReactNode }> = ({
  tone = "ink",
  size = 22,
  children,
}) => {
  const bg =
    tone === "key"
      ? MARK_KEY
      : tone === "warn"
        ? MARK_BAD
        : tone === "soft"
          ? `color-mix(in srgb, ${INK} 5%, ${PAPER})`
          : `color-mix(in srgb, ${ds("yellow", 50)} 60%, ${PAPER})`;
  const border = tone === "key" ? KEY : tone === "warn" ? ACCENT : tone === "soft" ? HAIRLINE : INK;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "6px 14px",
        borderRadius: 8,
        border: `2px solid ${border}`,
        background: bg,
        ...label(size, INK),
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
};

/** Code inside running text, at the text's own size. */
export const Mono: React.FC<{ children: string; color?: string; weight?: number }> = ({ children, color, weight }) => (
  <span style={{ fontFamily: MONO, fontSize: "0.92em", fontWeight: weight ?? 600, color }}>{children}</span>
);
