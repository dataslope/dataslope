/**
 * Relationship-end markers for entity-relationship diagrams, in the crow's
 * foot (Information Engineering) notation the Database Design course's
 * diagrams use. Every ERD in every video draws its ends here, the way every
 * arrowhead comes from arrow.ts, so a "one" or a "many" reads the same in
 * every unit.
 *
 * Read from the entity outward, a marker has two symbols. The one nearer the
 * entity is the maximum (a bar is one, a crow's foot is many); the one
 * farther out is the minimum (a bar is one, a circle is zero):
 *
 *   exactly-one   two bars
 *   zero-or-one   a bar, then a circle
 *   one-or-many   a crow's foot, then a bar
 *   zero-or-many  a crow's foot, then a circle
 *   many          a crow's foot alone (cardinality without the minimum)
 *
 * A marker is built along the last stretch of its line, so that stretch has
 * to be straight for at least `markerLength(kind)`: an end drawn across a
 * corner points nowhere. <Relation> (editorial/erd.tsx) reports any end that
 * isn't, and `npm run check:frames` fails it.
 */
import type { Pt } from "./arrow";

export type Cardinality = "exactly-one" | "zero-or-one" | "one-or-many" | "zero-or-many" | "many";

export const CARDINALITIES: readonly Cardinality[] = ["exactly-one", "zero-or-one", "one-or-many", "zero-or-many", "many"];

/** The marker's size: the crow's foot's length, and its spread at the entity. */
export const MARKER = 22;
/** Half the length of a bar across the line, and of the foot's outer prongs
 *  at the entity, as fractions of the size. */
const BAR_HALF = 0.5;
const FOOT_HALF = 0.55;
/** A circle's radius, as a fraction of the size. */
const RING = 0.28;

/** How far back from the entity each symbol sits, as fractions of the size. */
const LAYOUT: Record<Cardinality, { foot?: true; bars: number[]; ring?: number }> = {
  "exactly-one": { bars: [0.55, 0.95] },
  "zero-or-one": { bars: [0.55], ring: 1.25 },
  "one-or-many": { foot: true, bars: [1.35] },
  "zero-or-many": { foot: true, bars: [], ring: 1.55 },
  many: { foot: true, bars: [] },
};

/** How much straight line the marker needs under it, from the entity out. */
export function markerLength(kind: Cardinality, size = MARKER): number {
  const l = LAYOUT[kind];
  const reach = Math.max(l.foot ? 1 : 0, ...l.bars, l.ring !== undefined ? l.ring + RING : 0);
  return reach * size;
}

export type Marker = {
  /** Straight strokes, each [from, to]. */
  lines: [Pt, Pt][];
  /** Hollow circles, drawn over the line with the paper as their fill. */
  rings: { c: Pt; r: number }[];
};

/**
 * The marker for one end of a relationship line. `tip` is where the line
 * meets the entity's edge, and `from` any point back along the line's last
 * straight stretch, which sets the direction the marker is built along.
 */
export function relationEnd(tip: Pt, from: Pt, kind: Cardinality, size = MARKER): Marker {
  const len = Math.hypot(tip[0] - from[0], tip[1] - from[1]) || 1;
  const ux = (tip[0] - from[0]) / len;
  const uy = (tip[1] - from[1]) / len;
  // Back along the line from the tip, and across it.
  const back = (d: number): Pt => [tip[0] - ux * d * size, tip[1] - uy * d * size];
  const across = (p: Pt, half: number, side: 1 | -1): Pt => [p[0] - uy * half * size * side, p[1] + ux * half * size * side];

  const l = LAYOUT[kind];
  const lines: [Pt, Pt][] = [];
  if (l.foot) {
    const apex = back(1);
    lines.push([apex, across(tip, FOOT_HALF, 1)], [apex, tip], [apex, across(tip, FOOT_HALF, -1)]);
  }
  for (const d of l.bars) lines.push([across(back(d), BAR_HALF, 1), across(back(d), BAR_HALF, -1)]);
  const rings = l.ring !== undefined ? [{ c: back(l.ring), r: RING * size }] : [];
  return { lines, rings };
}

/** The length of a polyline's first or last straight segment. */
export function endSegment(points: readonly Pt[], end: "start" | "end"): number {
  const [a, b] = end === "start" ? [points[0], points[1]] : [points[points.length - 1], points[points.length - 2]];
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}
