import React from "react";
import { useCurrentFrame } from "remotion";
import type { Pt } from "../components/arrow";
import { type Cardinality, endSegment, MARKER, markerLength, relationEnd } from "../components/crowsfoot";
import { ease } from "../components/motion";
import { ds } from "../theme/brand";
import { MONO, SANS } from "../theme/fonts";
import { useLayout } from "./layout";
import { BAR, BLUE_INK, HIGHLIGHT, INK, INK_SOFT, PAPER, ACCENT, halo, note } from "./style";

/**
 * Entity-relationship diagrams for the editorial videos: an entity drawn as a
 * table box (its name, then one row per column, keys marked), and a
 * relationship drawn as a line between two of them with crow's-foot ends
 * (components/crowsfoot.ts). Both build themselves in time, so a diagram
 * grows as the narration names its parts rather than sitting finished on
 * the page:
 *
 *   const orders = useEntityLayout({ x: 980, y: y(420), name: "orders", columns: [...] });
 *   <Entity layout={orders} at={n.word("orders", "orders")} rowAt={{ customer_id: n.word("fk", "customer") }} />
 *   <Relation points={[customers.anchor("right", "id"), orders.anchor("left", "customer_id")]}
 *             from="exactly-one" to="zero-or-many" at={n.word("fk", "points")} />
 *
 * Keys share the data blue, as WhyNormalization's foreign-key arrow does.
 */

export type EntityColumn = {
  name: string;
  /** The column's type, as the lesson's DDL spells it (`integer`, `text`). */
  type?: string;
  /** Its role in a key: primary, foreign, unique (an alternate key, as the
   *  lessons' ER diagrams mark `email UK`), or two at once. */
  key?: "PK" | "FK" | "UK" | "PK, FK" | "FK, UK";
};

export type EntitySpec = {
  /** Top-left corner, in page px (pass the y through the layout's `y()`). */
  x: number;
  y: number;
  /** Defaults to ENTITY.width. */
  width?: number;
  name: string;
  columns: readonly EntityColumn[];
};

/** Box metrics before the layout's `h()`. `border` is the box's outline,
 *  which sits outside the header and rows rather than inside them: drawn
 *  inside, it took 4px off the bottom of the last row, clipped by the box. */
export const ENTITY = { head: 56, row: 46, width: 380, pad: 18, gap: 16, border: 2 };

/** The key column's width: wide enough for the entity's widest key (a pair
 *  like "PK, FK" needs about 66px at 19px bold), and none at all when it has
 *  no keys, so names never crowd their badge and keyless tables don't indent. */
const badgeWidth = (columns: readonly EntityColumn[]) =>
  columns.some((c) => c.key?.includes(",")) ? 74 : columns.some((c) => c.key) ? 32 : 0;

export type EntityLayout = ReturnType<typeof entityLayout>;

/** Where an entity's parts sit, and where a relationship meets it. */
export function entityLayout(spec: EntitySpec, h: (v: number) => number = (v) => v) {
  const head = h(ENTITY.head);
  const row = h(ENTITY.row);
  const width = spec.width ?? ENTITY.width;
  const rows = spec.columns.map((_, i) => {
    const top = spec.y + ENTITY.border + head + i * row;
    return { top, mid: top + row / 2 };
  });
  const height = 2 * ENTITY.border + head + spec.columns.length * row;
  const index = (r: number | string) => (typeof r === "number" ? r : spec.columns.findIndex((c) => c.name === r));
  return {
    ...spec,
    width,
    head,
    row,
    rows,
    height,
    left: spec.x,
    right: spec.x + width,
    top: spec.y,
    bottom: spec.y + height,
    /**
     * Where a relationship line meets this entity: on a side, level with a
     * column's row (by index or name) or, with no row, the header. `along`
     * shifts a top or bottom anchor sideways from the middle.
     */
    anchor(side: "left" | "right" | "top" | "bottom", r?: number | string, along = 0): Pt {
      if (side === "top") return [spec.x + width / 2 + along, spec.y];
      if (side === "bottom") return [spec.x + width / 2 + along, spec.y + height];
      const yAt = r === undefined ? spec.y + head / 2 : rows[index(r)]?.mid ?? spec.y + head / 2;
      return [side === "left" ? spec.x : spec.x + width, yAt];
    },
  };
}

/** entityLayout with the page's own vertical scale. */
export function useEntityLayout(spec: EntitySpec) {
  const { h } = useLayout();
  return entityLayout(spec, h);
}

const TONES = {
  key: `color-mix(in srgb, ${BAR} 18%, transparent)`,
  note: HIGHLIGHT,
  warn: `color-mix(in srgb, ${ACCENT} 24%, transparent)`,
} as const;

const HEADER_FILL = `color-mix(in srgb, ${INK} 7%, ${PAPER})`;
const BOX_FILL = `color-mix(in srgb, ${ds("yellow", 50)} 45%, ${PAPER})`;

/**
 * An entity, drawn as a table box. The box and its name arrive on `at`, then
 * its rows one after another (`rowGap` frames apart), or each on its own cue
 * in `rowAt` (by column name), and the box grows down to hold them. `marks`
 * washes a row (by column name) from a frame on: `key` blue, `note` the
 * page's yellow, `warn` the accent.
 */
export const Entity: React.FC<{
  layout: EntityLayout;
  at: number;
  rowGap?: number;
  rowAt?: Record<string, number>;
  marks?: Record<string, { at: number; tone?: keyof typeof TONES; out?: number }>;
  /** Fades the whole entity back from this frame, for when the talk moves on. */
  dim?: number;
  out?: number;
}> = ({ layout, at, rowGap = 5, rowAt = {}, marks = {}, dim, out }) => {
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
        background: BOX_FILL,
        border: `${ENTITY.border}px solid ${INK}`,
        borderRadius: 6,
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          height: layout.head,
          // Its rule inside the header, so the first row starts below it.
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
                opacity: c.key ? 1 : 0,
              }}
            >
              {c.key ?? ""}
            </span>
            <span style={{ fontFamily: MONO, fontSize: 21, color: INK, whiteSpace: "nowrap", flex: "1 1 auto", overflow: "hidden" }}>
              {c.name}
            </span>
            {c.type ? (
              <span style={{ fontFamily: MONO, fontSize: 19, color: INK_SOFT, whiteSpace: "nowrap" }}>{c.type}</span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
};

const pointsAttr = (pts: readonly Pt[]) => pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

/**
 * A relationship: a line through `points`, from one entity's edge (the first
 * point) to another's (the last), with a crow's-foot marker at each end. The
 * line draws itself over `dur` frames from `at`; the `from` marker arrives
 * with it and the `to` marker as the line reaches it, unless `fromAt` or
 * `toAt` cue an end to its own word (a scene that reads each end aloud). An
 * end given `null` stays bare: a line whose cardinality is the question. Keep the line
 * orthogonal, and its first and last segments straight for at least the
 * marker's length: a marker built across a corner is reported, and fails
 * `npm run check:frames`.
 */
export const Relation: React.FC<{
  points: readonly Pt[];
  /** Each end's marker, or null for a bare end. */
  from: Cardinality | null;
  to: Cardinality | null;
  at: number;
  dur?: number;
  /** When each end's marker builds, if not with the line. */
  fromAt?: number;
  toAt?: number;
  /** The line's ink: INK by default, or the key blue for a key link. */
  color?: string;
  width?: number;
  size?: number;
  /** The relationship's verb ("places"), set beside the line. */
  label?: string;
  labelAt?: number;
  /** Where the label's left edge sits; by default, beside the middle segment. */
  labelPos?: Pt;
  /** Names the relation in check reports. */
  name?: string;
  dim?: number;
  out?: number;
}> = ({ points, from, to, at, dur = 18, fromAt, toAt, color = INK, width = 2.4, size = MARKER, label, labelAt, labelPos, name, dim, out }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, dur);
  const gone = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || gone >= 1 || points.length < 2) return null;

  for (const [end, kind] of [["start", from], ["end", to]] as const) {
    if (kind === null) continue;
    const have = endSegment(points, end);
    const need = markerLength(kind, size) + 6;
    if (have < need) {
      console.log(
        `[relation] ${name ?? label ?? "relation"} ${end === "start" ? "from" : "to"} end (${kind}) sits on ${have.toFixed(0)}px of straight line; it needs ${need.toFixed(0)}px`,
      );
    }
  }

  const dimmed = dim === undefined ? 0 : ease(frame, dim, 14) * 0.55;
  const fromIn = ease(frame, fromAt ?? at, 8);
  const toIn = ease(frame, toAt ?? at + dur * 0.8, 8);
  const marker = (tip: Pt, back: Pt, kind: Cardinality | null, o: number) => {
    if (o <= 0 || kind === null) return null;
    const m = relationEnd(tip, back, kind, size);
    return (
      <g opacity={o}>
        {m.lines.map(([a, b], i) => (
          <line key={i} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={color} strokeWidth={width} strokeLinecap="round" />
        ))}
        {m.rings.map((r, i) => (
          <circle key={i} cx={r.c[0]} cy={r.c[1]} r={r.r} fill={PAPER} stroke={color} strokeWidth={width} />
        ))}
      </g>
    );
  };
  const mid = Math.floor((points.length - 1) / 2);
  const [a, b] = [points[mid], points[mid + 1]];
  const at2: Pt = labelPos ?? [(a[0] + b[0]) / 2 + 12, (a[1] + b[1]) / 2 - 34];
  const labelIn = label ? ease(frame, labelAt ?? at + dur * 0.6, 12) : 0;

  return (
    <>
      <svg
        width={1920}
        height={1080}
        style={{ position: "absolute", left: 0, top: 0, overflow: "visible", opacity: (1 - gone) * (1 - dimmed) }}
      >
        <polyline
          points={pointsAttr(points)}
          fill="none"
          stroke={color}
          strokeWidth={width}
          strokeLinejoin="round"
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - p}
        />
        {marker(points[0], points[1], from, fromIn)}
        {marker(points[points.length - 1], points[points.length - 2], to, toIn)}
      </svg>
      {labelIn > 0 ? (
        <div
          style={{
            position: "absolute",
            left: at2[0],
            top: at2[1],
            opacity: labelIn * (1 - gone) * (1 - dimmed),
            whiteSpace: "nowrap",
            ...note(21, INK_SOFT),
            fontStyle: "italic",
            ...halo,
          }}
        >
          {label}
        </div>
      ) : null}
    </>
  );
};
