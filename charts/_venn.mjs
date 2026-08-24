/**
 * The two-circle Venn behind the SQL join diagrams.
 *
 * A join picture highlights *regions*, and half the regions we need are not
 * whole circles: an inner join is the overlap alone, an anti-join is one
 * circle minus the overlap. Two stacked translucent discs cannot express
 * either. Where they can express something they express it by doubling their
 * own opacity in the middle, so the overlap comes out a third colour nobody
 * chose and the reader is invited to read meaning into it.
 *
 * So a panel is built from closed polygons whose union is exactly the region
 * the join keeps, and a second set whose union is exactly what it drops. Both
 * sets are *merged* rather than drawn piece by piece — `LEFT JOIN` is one
 * circle-shaped path, not a crescent abutting a lens — because two paths
 * sharing an edge leave an antialiasing seam along it, and a seam inside a
 * region that is meant to read as one thing is a distinction the figure does
 * not intend.
 *
 * That is also what removes every outline from the drawing. Nothing here is
 * stroked: the shapes are told apart by their fills meeting, the same reason
 * the house theme draws no frame and no tick marks. The one line the eye
 * still needs — where the two circles cross — is the boundary between two
 * fills, so it costs no ink of its own.
 */
import { Plot, HALO, MUTED, PRIMARY } from "./_theme.mjs";

const TAU = Math.PI * 2;

/** The three disjoint regions of a two-circle Venn, by the join vocabulary
 *  they belong to: keys only on the left, keys on both sides, keys only on
 *  the right. */
export const LEFT = "left";
export const BOTH = "both";
export const RIGHT = "right";

/**
 * Points along a circular arc, from `a0` to `a1` radians. Angles are measured
 * the usual way from the positive x axis; a chart drawing into a downward y
 * domain gets a vertically mirrored arc, which for shapes symmetric about the
 * x axis (all of these) is the same shape.
 *
 * 44 segments is under a third of a degree of chord error at the sizes drawn
 * here and keeps each path a few hundred bytes; the SVG is inlined into the
 * page, so path length is page weight.
 */
function arcPoints(cx, cy, r, a0, a1, steps = 44) {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const a = a0 + ((a1 - a0) * i) / steps;
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  });
}

/**
 * Every shape a join panel can need, for two circles of radius `r` whose
 * centres sit `sep` apart either side of `cx`.
 *
 * The two circles cross at `x = cx`, at `±t` radians from each centre, and
 * every path below is stitched from arcs that start and end at those two
 * crossings. `circleA`/`circleB`/`union` are the merged forms of the
 * neighbouring regions, so a join that keeps a whole circle draws one path.
 */
export function vennShapes({ cx, cy, r, sep }) {
  const ax = cx - sep / 2;
  const bx = cx + sep / 2;
  const t = Math.acos(sep / (2 * r));
  const straddle = Math.PI - t;
  return {
    // Left only: around the outside of A, back along the inside of B.
    [LEFT]: [
      ...arcPoints(ax, cy, r, t, TAU - t),
      ...arcPoints(bx, cy, r, Math.PI + t, straddle),
    ],
    // The lens: the inner arc of each circle.
    [BOTH]: [
      ...arcPoints(ax, cy, r, -t, t),
      ...arcPoints(bx, cy, r, straddle, Math.PI + t),
    ],
    // Right only: the mirror of left only.
    [RIGHT]: [
      ...arcPoints(bx, cy, r, -straddle, straddle),
      ...arcPoints(ax, cy, r, t, -t),
    ],
    circleA: arcPoints(ax, cy, r, 0, TAU),
    circleB: arcPoints(bx, cy, r, 0, TAU),
    union: [
      ...arcPoints(ax, cy, r, t, TAU - t),
      ...arcPoints(bx, cy, r, -straddle, straddle),
    ],
    ax,
    bx,
  };
}

/**
 * The merged paths covering exactly `regions`, so no two of them share an
 * edge. Every subset of three regions is either a single shape already named
 * above or the two crescents, which do not touch.
 */
function pathsFor(regions, shapes) {
  const has = (k) => regions.includes(k);
  if (regions.length === 0) return [];
  if (regions.length === 3) return [shapes.union];
  if (regions.length === 2) {
    if (has(LEFT) && has(BOTH)) return [shapes.circleA];
    if (has(BOTH) && has(RIGHT)) return [shapes.circleB];
    return [shapes[LEFT], shapes[RIGHT]];
  }
  return [shapes[regions[0]]];
}

// ── Drawing constants ───────────────────────────────────────────────────────
//
// The figure is authored in a 400-unit-wide space and drawn into whatever the
// content column gives it. That width is not cosmetic: `scripts/build-charts.mjs`
// publishes a per-chart minimum width from the smallest type in the markup, and
// below 400 a chart's floor lands under the threshold that would make a phone
// scroll it sideways. A comparison figure that has to be scrolled to be
// compared is not a comparison figure, so these panels give up some drawing
// room to stay whole on a phone.

export const WIDTH = 400;
/** Circle radius and centre separation. `sep` a little over `r` overlaps less
 *  than the textbook Venn (where each circle passes through the other's
 *  centre), which leaves the two crescents wide enough to letter. */
const R = 37;
const SEP = 41;
/** Bands inside a panel: the title above the circles, the note below them. */
const TITLE_DROP = 13;
const CIRCLE_GAP = 15;
const NOTE_DROP = 24;
/** Every size here is at or above 10, the authoring floor in build-charts. */
const TITLE_SIZE = 11;
const NOTE_SIZE = 10;
const SIDE_SIZE = 10;

const OFF_OPACITY = 0.3;
const KEPT_OPACITY = 0.42;
/** Laid over the kept fill rather than replacing it, so the overlap reads the
 *  same depth in every panel that keeps it: the lens is where a join actually
 *  matches, and the picture should say so whether or not anything else is
 *  shaded. */
const LENS_OPACITY = 0.3;

const halo = { ...HALO, strokeWidth: 2.6 };

/**
 * A grid of join panels, as Plot marks plus the height they need.
 *
 * Each panel is `{ title, note, keeps }`, where `keeps` lists the regions the
 * join returns. Positions come back in the same units the caller gives
 * `plot()` as its x and y domains, with y running downwards — see the specs.
 */
export function vennPanels(panels, { columns = 2, width = WIDTH, top = 4 } = {}) {
  const panelWidth = width / columns;
  const panelHeight = TITLE_DROP + CIRCLE_GAP + 2 * R + NOTE_DROP + 22;
  const height = top + Math.ceil(panels.length / columns) * panelHeight;

  const placed = panels.map((panel, i) => {
    const originY = top + Math.floor(i / columns) * panelHeight;
    const cx = ((i % columns) + 0.5) * panelWidth;
    const cy = originY + TITLE_DROP + CIRCLE_GAP + R;
    return {
      ...panel,
      cx,
      cy,
      titleY: originY + TITLE_DROP,
      noteY: cy + R + NOTE_DROP,
      shapes: vennShapes({ cx, cy, r: R, sep: SEP }),
    };
  });

  /** One flat array of points per fill, tagged so Plot draws a path per shape. */
  const trace = (pick) =>
    placed.flatMap((p, i) =>
      pick(p).flatMap((path, j) => path.map((pt) => ({ ...pt, key: `${i}-${j}` }))),
    );

  const dropped = trace((p) => pathsFor([LEFT, BOTH, RIGHT].filter((k) => !p.keeps.includes(k)), p.shapes));
  const kept = trace((p) => pathsFor(p.keeps, p.shapes));
  const lens = trace((p) => (p.keeps.includes(BOTH) ? [p.shapes[BOTH]] : []));

  const sides = placed.flatMap((p) => [
    { x: p.cx - SEP / 2 - R * 0.44, y: p.cy, text: "left" },
    { x: p.cx + SEP / 2 + R * 0.44, y: p.cy, text: "right" },
  ]);

  const marks = [
    Plot.line(dropped, { x: "x", y: "y", z: "key", fill: MUTED, fillOpacity: OFF_OPACITY }),
    Plot.line(kept, { x: "x", y: "y", z: "key", fill: PRIMARY, fillOpacity: KEPT_OPACITY }),
    Plot.line(lens, { x: "x", y: "y", z: "key", fill: PRIMARY, fillOpacity: LENS_OPACITY }),
    Plot.text(sides, {
      x: "x",
      y: "y",
      text: "text",
      fill: "currentColor",
      fillOpacity: 0.72,
      fontSize: SIDE_SIZE,
      ...halo,
    }),
    Plot.text(placed, {
      x: "cx",
      y: "titleY",
      text: "title",
      fill: "currentColor",
      fontSize: TITLE_SIZE,
      fontWeight: 700,
      ...halo,
    }),
    Plot.text(placed, {
      x: "cx",
      y: "noteY",
      text: "note",
      fill: "currentColor",
      fillOpacity: 0.66,
      fontSize: NOTE_SIZE,
      lineHeight: 1.35,
      ...halo,
    }),
  ];

  return { marks, height, width };
}

/** The scale options a Venn figure wants: a plain pixel space with y running
 *  downwards, no axes, no grid, and margins of nothing to run past. */
export function vennSpace(width, height) {
  return {
    width,
    height,
    marginTop: 0,
    marginRight: 0,
    marginBottom: 0,
    marginLeft: 0,
    x: { axis: null, domain: [0, width] },
    y: { axis: null, grid: false, domain: [height, 0] },
  };
}
