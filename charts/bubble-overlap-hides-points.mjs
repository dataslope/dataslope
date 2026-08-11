/**
 * Nine of these forty points are not on the chart, and nothing says so.
 *
 * A bubble chart draws a filled disc per row, and once two discs land near
 * each other the larger one paints over the smaller. Opaque, that is a total
 * loss: a point that is entirely covered leaves no trace at all, so the chart
 * does not look wrong, it looks like a chart of thirty-one points.
 *
 * That is the part worth dwelling on. Most chart problems announce themselves:
 * an overplotted scatter looks like a blob, a truncated axis has visible
 * numbers on it. This one is silent. There is no visual difference between
 * "forty points, nine hidden" and "thirty-one points", which means a reader
 * cannot even ask the right question.
 *
 * Two changes fix it, and they do different jobs. *Transparency* makes overlap
 * readable as density: where discs pile up the fill gets darker, which is
 * information rather than an accident. An *outline* keeps each disc's
 * boundary, so a small bubble sitting inside a large one is still a countable
 * object. Neither alone is enough, and together they cost nothing.
 *
 * Two further habits, when the overlap is bad: draw the largest discs first so
 * the small ones land on top, and cap the maximum radius. Beyond a certain
 * size, area stops being a comparison anybody can make and starts being a
 * territory that hides the data behind it.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY, normalSamples, rng } from "./_theme.mjs";

export const title =
  "Forty bubbles drawn opaque and drawn with transparency and an outline. In the opaque panel nine discs are completely covered by larger ones and leave no trace, so the chart appears to show thirty-one points.";

const N = 40;
const ux = rng(3_301);
const uy = rng(9_907);
const ur = rng(5_513);

/** Deliberately clustered, because that is when this happens: real data
 *  clusters, and clusters are where the big discs land on the small ones. */
const POINTS = Array.from({ length: N }, (_, i) => {
  const cluster = i % 3;
  const cx = [3.2, 5.4, 6.9][cluster];
  const cy = [4.1, 5.6, 3.4][cluster];
  return {
    i,
    x: cx + (ux() - 0.5) * 1.9,
    y: cy + (uy() - 0.5) * 1.7,
    size: 4 + Math.round(ur() * 46),
  };
});

/** Radius in data units, so "covered" can be computed rather than asserted. */
const R_MAX = 0.62;
const SIZE_MAX = Math.max(...POINTS.map((d) => d.size));
const radius = (d) => R_MAX * Math.sqrt(d.size / SIZE_MAX);

/** Painted back to front by size, so a later disc covers an earlier one. A
 *  point is lost when some larger disc contains it entirely. */
const bySize = [...POINTS].sort((a, b) => b.size - a.size);
const hidden = new Set(
  POINTS.filter((d) =>
    bySize.some(
      (o) =>
        o.size > d.size &&
        Math.hypot(o.x - d.x, o.y - d.y) + radius(d) <= radius(o),
    ),
  ).map((d) => d.i),
);

const OPAQUE = "Opaque fill";
const CLEAR = "Transparent, with an outline";
const rows = [OPAQUE, CLEAR].flatMap((panel) =>
  bySize.map((d) => ({ ...d, panel, lost: hidden.has(d.i) })),
);

const HIDDEN = hidden.size;
const VISIBLE = N - HIDDEN;

export const caption = `${N} discs, of which ${HIDDEN} sits entirely inside a larger one and leaves no trace. Opaque, the left panel is indistinguishable from a perfectly good chart of ${VISIBLE} points.`;

export function render() {
  return plot({
    height: 320,
    marginTop: 26,
    marginLeft: 30,
    marginRight: 18,
    marginBottom: 50,
    ariaLabel: title,
    x: { label: null, domain: [1.6, 8.4], ticks: [] },
    y: { label: null, domain: [2.0, 7.4], ticks: [] },
    r: { range: [2, 26] },
    fx: { label: null, domain: [OPAQUE, CLEAR] },
    marks: [
      Plot.frame({ stroke: "currentColor", strokeOpacity: 0.12 }),
      Plot.dot(
        rows.filter((d) => d.panel === OPAQUE),
        { fx: "panel", x: "x", y: "y", r: "size", fill: PRIMARY, fillOpacity: 1 },
      ),
      Plot.dot(
        rows.filter((d) => d.panel === CLEAR),
        {
          fx: "panel",
          x: "x",
          y: "y",
          r: "size",
          fill: PRIMARY,
          fillOpacity: 0.3,
          stroke: PRIMARY,
          strokeWidth: 1.2,
          strokeOpacity: 0.85,
        },
      ),
      // The lost ones, ringed in the honest panel so they can be counted.
      Plot.dot(
        rows.filter((d) => d.panel === CLEAR && d.lost),
        {
          fx: "panel",
          x: "x",
          y: "y",
          r: "size",
          fill: "none",
          stroke: ACCENT,
          strokeWidth: 1.8,
        },
      ),
      Plot.text([{ panel: OPAQUE }], {
        fx: "panel",
        x: 1.6,
        y: 2.0,
        text: () => `looks like ${VISIBLE} points`,
        fill: ACCENT,
        fontSize: 10.5,
        fontWeight: 700,
        textAnchor: "start",
        dx: 8,
        dy: -10,
        ...HALO,
      }),
      Plot.text([{ panel: CLEAR }], {
        fx: "panel",
        x: 1.6,
        y: 2.0,
        text: () => `all ${N}, with the ${HIDDEN} lost ones ringed`,
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 700,
        textAnchor: "start",
        dx: 8,
        dy: -10,
        ...HALO,
      }),
    ],
  });
}
