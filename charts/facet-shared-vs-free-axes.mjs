/**
 * Shared axes against independent ones, on four panels where the choice
 * changes what the chart says.
 *
 * A facet grid is a comparison. Shared axes are what make it one: every panel
 * is measured against the same ruler, so a taller line really is a bigger
 * number and the eye can compare across panels without reading a single tick.
 * The cost is that a small series is squashed into the bottom of its panel by
 * whatever the largest one happens to be.
 *
 * Free axes fix the squashing by giving each panel its own scale, and in doing
 * so they quietly stop the grid being a comparison at all. In the lower row
 * every panel fills its frame, so all four look about the same size while the
 * numbers behind them differ by a factor of forty. Nothing is hidden: the
 * ticks are right there and each one is different. The problem is that reading
 * them is work, and the shape is free, so the shape is what gets believed.
 *
 * Free axes are the right choice when the panels are about *trend* rather than
 * level, and then the y label should say so.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Four series drawn in a faceted grid twice: once on shared axes, where the small series are flat lines near zero, and once on independent axes, where all four fill their panels and look alike despite differing forty-fold.";

const MONTHS = 12;
const SERIES_DEFS = [
  { key: "Enterprise", base: 780, slope: 22 },
  { key: "Mid-market", base: 210, slope: 9 },
  { key: "Small business", base: 64, slope: 3.4 },
  { key: "Self-serve", base: 19, slope: 1.3 },
];

const wave = (m) => Math.sin((m / MONTHS) * Math.PI * 2) * 0.06;

const values = SERIES_DEFS.map((s) => ({
  ...s,
  points: Array.from({ length: MONTHS }, (_, m) => ({
    m,
    v: (s.base + s.slope * m) * (1 + wave(m)),
  })),
}));

const SHARED = "Shared axes";
const FREE = "Free axes";

const MAX = Math.max(...values.flatMap((s) => s.points.map((p) => p.v)));

/** Free axes are drawn by rescaling each series into a common 0-1 frame,
 *  because Plot has one y scale per plot: `fy` panels are windows onto one
 *  pair of axes, not separate plots (see charts/_theme.mjs). Normalising is
 *  what "each panel gets its own scale" actually means. */
const rows = values.flatMap((s) => {
  const top = Math.max(...s.points.map((p) => p.v));
  return s.points.flatMap((p) => [
    { panel: SHARED, key: s.key, m: p.m, y: p.v / MAX },
    { panel: FREE, key: s.key, m: p.m, y: p.v / top },
  ]);
});

const BIGGEST = values[0];
const SMALLEST = values.at(-1);
const RATIO = Math.round(BIGGEST.points.at(-1).v / SMALLEST.points.at(-1).v);

export const caption = `Four segments, one chart, two axis choices. Shared axes make the grid a comparison: one ruler, so a taller line is a bigger number and no ticks need reading. The cost is that the three smaller segments are pressed flat by the largest. Free axes fix the flattening and quietly stop it being a comparison, because now every panel fills its frame and all four look alike while the numbers differ ${RATIO}-fold. Nothing is hidden, the ticks are right there and each is different; the trouble is that reading them is work and the shape is free, so the shape is what gets believed. Free axes are right when the panels are about trend rather than level, and the label should say so.`;

export function render() {
  return plot({
    height: 340,
    marginTop: 34,
    marginLeft: 30,
    marginRight: 92,
    marginBottom: 46,
    ariaLabel: title,
    fx: { label: null, domain: SERIES_DEFS.map((s) => s.key) },
    fy: { label: null, domain: [SHARED, FREE] },
    x: { label: "Month", labelAnchor: "center", domain: [0, MONTHS - 1], ticks: 3 },
    // Ticks off on purpose: on the free-axis row every panel would carry a
    // different scale, and the chart is about what the reader takes in without
    // reading them.
    y: { label: null, domain: [0, 1.1], ticks: [], grid: false },
    marks: [
      Plot.areaY(rows, {
        fx: "key",
        fy: "panel",
        x: "m",
        y: "y",
        fill: (d) => (d.panel === FREE ? ACCENT : PRIMARY),
        fillOpacity: 0.18,
      }),
      Plot.line(rows, {
        fx: "key",
        fy: "panel",
        x: "m",
        y: "y",
        z: (d) => `${d.panel}-${d.key}`,
        stroke: (d) => (d.panel === FREE ? ACCENT : PRIMARY),
        strokeWidth: 1.9,
      }),
      // The number each panel is actually showing, so the free row's "all the
      // same size" is visibly false rather than merely asserted.
      Plot.text(
        values.map((s) => ({ key: s.key, top: s.points.at(-1).v })),
        {
          fx: "key",
          fy: () => FREE,
          frameAnchor: "top-left",
          text: (d) => `peaks at ${Math.round(d.top)}`,
          fill: MUTED,
          fontSize: 9.5,
          fontWeight: 600,
          textAnchor: "start",
          dx: 5,
          dy: 5,
          ...HALO,
        },
      ),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
