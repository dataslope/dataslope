/**
 * What standardizing does and, more usefully, what it does not.
 *
 * Subtracting the mean and dividing by the standard deviation moves and
 * rescales a distribution: it lands centred on zero with a spread of one, and
 * the axis stops being millimetres or dollars and becomes standard deviations.
 * That is the whole operation, and it is what makes two variables measured in
 * different units comparable.
 *
 * The shape is untouched, which is the part people quietly assume away. Both
 * panels here are standardized to exactly mean 0 and sd 1; one was normal to
 * begin with and one was not, and the second is just as skewed afterwards as
 * before. So a z-score of 2 means "two standard deviations out" on both, and
 * means "about the 98th percentile" on only one of them. Reaching for the
 * normal table after standardizing is assuming normality, not establishing it.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY, normalSamples, rng } from "./_theme.mjs";

export const title =
  "Two distributions standardized to mean zero and standard deviation one: a normal one and a right-skewed one. Both are centred and scaled identically, and the skewed one keeps its long tail.";

const N = 3000;
const BINS = 46;
const LO = -3.2;
const HI = 4.6;

/** Standardize: the operation the chart is about. */
function standardize(xs) {
  const m = xs.reduce((s, x) => s + x, 0) / xs.length;
  const sd = Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1));
  return xs.map((x) => (x - m) / sd);
}

/** Heights in mm: already normal, just on a scale nobody can compare. */
const NORMAL = standardize(normalSamples(N, 1740, 72, 808));

/** Session durations: log-normal, the usual right-skewed shape. */
const u = rng(909);
const SKEWED = standardize(
  Array.from({ length: N }, () => {
    const a = Math.max(u(), Number.EPSILON);
    const b = u();
    const z = Math.sqrt(-2 * Math.log(a)) * Math.cos(2 * Math.PI * b);
    return Math.exp(0.85 * z);
  }),
);

const PANELS = [
  { key: "Normal to begin with", values: NORMAL },
  { key: "Skewed to begin with", values: SKEWED },
];

const width = (HI - LO) / BINS;
const rows = PANELS.flatMap(({ key, values }) => {
  const counts = new Array(BINS).fill(0);
  for (const v of values) {
    const i = Math.floor((v - LO) / width);
    if (i >= 0 && i < BINS) counts[i]++;
  }
  return counts.map((c, i) => ({
    panel: key,
    x1: LO + i * width,
    x2: LO + (i + 1) * width,
    share: c / values.length,
  }));
});

/** Share beyond z = 2 in each panel: the same threshold, two different answers. */
const beyond2 = (xs) => xs.filter((v) => v > 2).length / xs.length;

/** Tallest bar across both panels. Hard-coding this domain let the skewed
 *  panel's peak run past the frame, and the inlined SVG has `overflow:
 *  visible`, so it drew over the caption of the chart above it rather than
 *  being cut off. */
const PEAK = Math.max(...rows.map((r) => r.share));

export const caption = `Both panels are standardized to mean 0 and standard deviation 1, and both were built from ${N.toLocaleString()} values. Subtracting the mean and dividing by the spread moves and rescales a distribution; it does not reshape one. The skewed panel is exactly as skewed afterwards as before, so z = 2 sits beyond ${(beyond2(NORMAL) * 100).toFixed(1)}% of the normal data and ${(beyond2(SKEWED) * 100).toFixed(1)}% of the skewed data. A z-score always means "this many standard deviations out"; it only means "this percentile" when the distribution is normal, so reaching for the normal table after standardizing assumes that rather than establishing it.`;

export function render() {
  return plot({
    height: 300,
    marginTop: 30,
    marginLeft: 58,
    marginRight: 22,
    marginBottom: 46,
    ariaLabel: title,
    fx: { label: null, domain: PANELS.map((p) => p.key) },
    x: {
      label: "Standard deviations from the mean (z)",
      labelAnchor: "center",
      domain: [LO, HI],
      ticks: [-3, -2, -1, 0, 1, 2, 3, 4],
    },
    y: { label: "Share of values", domain: [0, PEAK * 1.18], ticks: 4, tickFormat: "%" },
    marks: [
      Plot.rect(rows, {
        fx: "panel",
        x1: "x1",
        x2: "x2",
        y1: 0,
        y2: "share",
        fill: (d) => (d.panel.startsWith("Skewed") ? ACCENT : PRIMARY),
        fillOpacity: 0.55,
        insetLeft: 0.4,
        insetRight: 0.4,
      }),
      Plot.ruleX([0], { stroke: MUTED, strokeOpacity: 0.7 }),
      Plot.ruleX([2], { stroke: MUTED, strokeDasharray: "4 3" }),
      Plot.text(
        PANELS.map((p) => ({
          panel: p.key,
          share: beyond2(p.values),
        })),
        {
          fx: "panel",
          x: 2,
          y: PEAK * 1.02,
          text: (d) => `${(d.share * 100).toFixed(1)}%\nbeyond z = 2`,
          fill: MUTED,
          fontSize: 10.5,
          fontWeight: 600,
          lineHeight: 1.35,
          textAnchor: "start",
          dx: 6,
          ...HALO,
        },
      ),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
