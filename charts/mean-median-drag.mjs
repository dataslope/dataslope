/**
 * What "robust" actually means, measured: drag one value out of a sample and
 * watch only one of the two summaries follow it.
 *
 * The lesson's neighbouring figures make the static case. `skew-mean-median-mode`
 * marks the three centres on one skewed density, and `outlier-influence` puts a
 * clean sample beside a contaminated one. Both show that the mean moves and the
 * median does not. Neither shows the *shape* of the movement, which is the part
 * that makes the property predictable rather than anecdotal: the mean is a
 * straight line in the outlier's value, with slope exactly 1/n, and the median
 * is flat with a small step where the sorted order changes and then nothing at
 * all. Once a reader has seen those two shapes, "the median ignores magnitude"
 * stops being a slogan.
 *
 * Only one value moves. Nineteen of the twenty points are held fixed at their
 * drawn positions and the twentieth is swept across the axis, so every
 * difference between the two curves is attributable to that one row, which is
 * exactly the claim being made.
 *
 * The rug along the bottom is the nineteen fixed values, at the same x scale,
 * so the reader can see where the data actually lives and how far outside it
 * the mean has been dragged by the time the sweep ends.
 */
import { Plot, plot, linspace, HALO, MUTED, PRIMARY, ACCENT, GUIDE, normalSamples } from "./_theme.mjs";

export const title =
  "The mean and the median of a twenty-value sample plotted against the value of a single point as it is dragged from inside the data out to five times the typical value. The mean rises as a straight line and leaves the data behind; the median rises briefly and then stays flat.";

/** Nineteen values that never move, rounded so the numbers on the page are the
 *  numbers in the arithmetic. Read as house prices in thousands. */
const FIXED = normalSamples(19, 320, 55, 8317).map((v) => Math.round(v));

const SORTED_FIXED = [...FIXED].sort((a, b) => a - b);
const X_MIN = 150;
const X_MAX = 1600;
const SWEEP = linspace(X_MIN, X_MAX, 241);

const mean = (xs) => xs.reduce((s, x) => s + x, 0) / xs.length;
const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

const SERIESES = [
  { key: "Mean", f: mean, color: ACCENT },
  { key: "Median", f: median, color: PRIMARY },
];

const rows = SWEEP.flatMap((v) =>
  SERIESES.map((s) => ({ key: s.key, color: s.color, x: v, y: s.f([...FIXED, v]) })),
);

const at = (key, x) => SERIESES.find((s) => s.key === key).f([...FIXED, x]);

/** Where the twentieth point starts out: sitting quietly inside the others. */
const TYPICAL = Math.round(median(SORTED_FIXED));
const MEAN_SHIFT = at("Mean", X_MAX) - at("Mean", TYPICAL);
const MEDIAN_SHIFT = at("Median", X_MAX) - at("Median", TYPICAL);

export const caption = `Nineteen of these twenty values are nailed down; only the twentieth moves, and the horizontal axis is where it has been dragged to. The mean tracks it as a straight line of slope 1/n, so pushing one house from \$${TYPICAL}k to \$${X_MAX}k lifts the "average price" by \$${Math.round(MEAN_SHIFT)}k, past every other house in the sample. The median moves \$${Math.round(MEDIAN_SHIFT)}k and then stops: once the point is above the middle it no longer matters *how far* above. That flat line is the whole of what "robust" means, and it is why a skewed price list is reported as a median.`;

export function render() {
  return plot({
    height: 350,
    marginTop: 26,
    marginLeft: 62,
    marginRight: 92,
    marginBottom: 62,
    ariaLabel: title,
    x: {
      label: "Where the one moved value sits ($ thousands)",
      labelAnchor: "center",
      domain: [X_MIN, X_MAX],
      ticks: 6,
    },
    // The domain is cropped to where the two summaries actually live. Anchored
    // at zero the whole story would be two nearly-touching lines in the top
    // eighth of the panel, and the flatness of the median, which is the point,
    // would be indistinguishable from the mean's climb.
    y: { label: "Summary of all 20 values ($ thousands)", domain: [280, 400], ticks: 6 },
    marks: [
      // The nineteen values that do not move, as a rug: it shows where the data
      // is, which is what makes the mean's later position look as wrong as it is.
      Plot.ruleX(SORTED_FIXED, {
        y1: 286,
        y2: 296,
        stroke: MUTED,
        strokeOpacity: 0.55,
        strokeWidth: 1.2,
      }),
      Plot.text([{}], {
        x: SORTED_FIXED[SORTED_FIXED.length - 1],
        y: 291,
        text: () => "the 19 values held fixed",
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "start",
        dx: 10,
        ...HALO,
      }),

      // Where the sweep starts: the twentieth point indistinguishable from the
      // rest, which is the honest baseline for "how much did it move".
      Plot.ruleX([TYPICAL], { stroke: GUIDE, strokeWidth: 1, strokeDasharray: "3,3" }),
      Plot.text([{}], {
        x: TYPICAL,
        y: 400,
        text: () => "the moved value\nstarts here",
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.3,
        textAnchor: "start",
        dx: 7,
        dy: 4,
        ...HALO,
      }),

      ...SERIESES.map((s) =>
        Plot.line(rows.filter((d) => d.key === s.key), {
          x: "x",
          y: "y",
          stroke: s.color,
          strokeWidth: 2.4,
        }),
      ),

      // Labels at the right end of each curve, where the gap between them is
      // widest and there is room for both.
      ...SERIESES.map((s) =>
        Plot.text([{}], {
          x: X_MAX,
          y: at(s.key, X_MAX),
          text: () => s.key,
          fill: s.color,
          fontSize: 12,
          fontWeight: 600,
          textAnchor: "start",
          dx: 8,
          ...HALO,
        }),
      ),
    ],
  });
}
