/**
 * The Core Web Vitals thresholds, drawn as the bands they actually are.
 *
 * Each metric has two cut points rather than one target, and the middle band
 * is wide: "needs improvement" spans four seconds on LCP and half a second on
 * INP. A single number with no bands behind it tells a reader nothing about
 * how much trouble they are in.
 *
 * The marked dots are a plausible unoptimised page, placed so the figure shows
 * the ordinary case: two metrics that look fine and one that does not, which is
 * how these usually arrive.
 *
 * Each metric is drawn on its own axis, in its own units, because they have
 * nothing in common but the traffic-light scheme. That is why this is a set of
 * three rows rather than one chart with a shared scale.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY, SERIES } from "./_theme.mjs";

export const title =
  "Three Core Web Vitals as horizontal bands: LCP good below 2.5 seconds and poor above 4, INP good below 200 milliseconds and poor above 500, CLS good below 0.1 and poor above 0.25, with a sample page marked on each.";

/** Thresholds are Google's published ones; the sample is illustrative. */
const METRICS = [
  { key: "LCP", unit: "s", good: 2.5, poor: 4.0, max: 6.0, sample: 3.4, note: "largest paint" },
  { key: "INP", unit: "ms", good: 200, poor: 500, max: 800, sample: 145, note: "interaction delay" },
  { key: "CLS", unit: "", good: 0.1, poor: 0.25, max: 0.5, sample: 0.31, note: "layout shift" },
];

const GOOD = SERIES[2];
const grade = (m) => (m.sample <= m.good ? "good" : m.sample <= m.poor ? "needs work" : "poor");
const FAILING = METRICS.filter((m) => grade(m) === "poor").map((m) => m.key);

export const caption =
  `Two cut points per metric, not one target, and the middle band is wide. The marked page passes ${METRICS.filter((m) => grade(m) === "good").length} of the three and fails ${FAILING.join(" and ") || "none"}, which is the usual shape of a first measurement: most of it is fine and one number is not. A vitals score without its bands is a number with nowhere to stand.`;

// Each row is drawn in its own fraction of a shared 0-1 axis, so three
// different units can share one frame without pretending to be comparable.
const rows = METRICS.map((m, i) => ({ ...m, y: m.key, frac: (v) => v / m.max }));

const bands = rows.flatMap((m) => [
  { y: m.y, x1: 0, x2: m.frac(m.good), fill: GOOD, label: "good" },
  { y: m.y, x1: m.frac(m.good), x2: m.frac(m.poor), fill: MUTED, label: "needs work" },
  { y: m.y, x1: m.frac(m.poor), x2: 1, fill: ACCENT, label: "poor" },
]);

const fmt = (m, v) => `${v}${m.unit}`;

export function render() {
  return plot({
    height: 300,
    marginTop: 44,
    marginLeft: 38,
    marginRight: 116,
    marginBottom: 40,
    ariaLabel: title,
    x: { axis: null, domain: [0, 1] },
    y: { label: null, domain: METRICS.map((m) => m.key), padding: 0.42 },
    marks: [
      Plot.barX(bands, { x1: "x1", x2: "x2", y: "y", fill: "fill", fillOpacity: 0.32 }),
      // Threshold values, printed on the boundaries they belong to.
      Plot.text(rows, {
        x: (d) => d.frac(d.good),
        y: "y",
        text: (d) => fmt(d, d.good),
        fill: MUTED,
        fontSize: 10,
        fontWeight: 600,
        textAnchor: "middle",
        dy: -20,
        ...HALO,
      }),
      Plot.text(rows, {
        x: (d) => d.frac(d.poor),
        y: "y",
        text: (d) => fmt(d, d.poor),
        fill: MUTED,
        fontSize: 10,
        fontWeight: 600,
        textAnchor: "middle",
        dy: -20,
        ...HALO,
      }),
      Plot.dot(rows, { x: (d) => d.frac(d.sample), y: "y", fill: PRIMARY, r: 6 }),
      Plot.text(rows, {
        x: (d) => d.frac(d.sample),
        y: "y",
        text: (d) => `this page: ${fmt(d, d.sample)}`,
        fill: (d) => (grade(d) === "poor" ? ACCENT : PRIMARY),
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "middle",
        dy: 22,
        ...HALO,
      }),
      Plot.text(rows, {
        x: 1,
        y: "y",
        text: (d) => d.note,
        fill: MUTED,
        fontSize: 10.5,
        textAnchor: "start",
        dx: 12,
        ...HALO,
      }),
      // The legend, once, above the first row.
      ...["good", "needs work", "poor"].map((label, i) =>
        Plot.text([{}], {
          frameAnchor: "top-left",
          text: () => label,
          fill: [GOOD, MUTED, ACCENT][i],
          fontSize: 10.5,
          fontWeight: 600,
          textAnchor: "start",
          dx: 4 + i * 82,
          dy: -26,
        }),
      ),
    ],
  });
}
