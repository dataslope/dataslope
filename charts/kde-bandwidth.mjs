/**
 * Bandwidth is the KDE's bin width, and it has the same failure modes.
 *
 * The sample is fixed and drawn as a rug under each curve. Too small a
 * bandwidth and every observation becomes its own bump, so the reader counts
 * modes that are noise. Too large and the two real clusters melt into one
 * hill. The middle panel is roughly Scott's rule, which is what seaborn picks
 * when you leave `bw_adjust` alone.
 *
 * Faceted legitimately: the same estimator, the same sample, the same axes,
 * one parameter varying.
 *
 * The density is computed here rather than approximated with a histogram, so
 * the smoothing is genuinely a Gaussian kernel sum and the caption's claim
 * about bandwidth is the thing being drawn.
 */
import { Plot, plot, linspace, normalSamples, ACCENT, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "One bimodal sample smoothed at three bandwidths. The narrowest gives a spiky curve with many false peaks, the widest a single smooth hill that erases both clusters, and the middle one shows the two peaks that are really there.";

export const caption =
  "Bandwidth is the KDE's bin width. Too small invents peaks out of individual observations; too large melts real structure into one hill. The curve is a choice about smoothing, not a property of the data.";

const SAMPLE = [
  ...normalSamples(70, 3.4, 0.35, 81),
  ...normalSamples(50, 5.1, 0.4, 82),
];

const GRID = linspace(2.0, 6.6, 181);
const BANDWIDTHS = [
  { key: "bw = 0.08 · too spiky", h: 0.08 },
  { key: "bw = 0.30 · about right", h: 0.3 },
  { key: "bw = 0.90 · too smooth", h: 0.9 },
];

const kernel = (u) => Math.exp(-0.5 * u * u) / Math.sqrt(2 * Math.PI);

/** Gaussian KDE, the same estimator seaborn draws. */
function density(x, h) {
  return SAMPLE.reduce((s, v) => s + kernel((x - v) / h), 0) / (SAMPLE.length * h);
}

const curves = BANDWIDTHS.flatMap((b) =>
  GRID.map((x) => ({ panel: b.key, x, y: density(x, b.h) })),
);

const rug = BANDWIDTHS.flatMap((b) => SAMPLE.map((v) => ({ panel: b.key, v })));

const YMAX = Math.max(...curves.map((d) => d.y));

export function render() {
  return plot({
    height: 290,
    marginTop: 30,
    marginLeft: 50,
    marginBottom: 46,
    ariaLabel: title,
    fx: { label: null, domain: BANDWIDTHS.map((b) => b.key) },
    x: { label: "Value", labelAnchor: "center", domain: [2.0, 6.6], ticks: 4 },
    // Headroom for the callouts, which sit above the tallest spike in the
    // narrow-bandwidth panel rather than on top of it.
    y: { label: "Density", domain: [0, YMAX * 1.34], ticks: 4 },
    marks: [
      Plot.areaY(curves, {
        x: "x",
        y: "y",
        fx: "panel",
        fill: PRIMARY,
        fillOpacity: 0.18,
        curve: "basis",
      }),
      Plot.line(curves, {
        x: "x",
        y: "y",
        fx: "panel",
        stroke: PRIMARY,
        strokeWidth: 2,
        curve: "basis",
      }),
      // The rug: the same observations under every panel, so the reader can
      // see that only the smoothing changed.
      Plot.ruleX(rug, {
        x: "v",
        fx: "panel",
        y1: 0,
        y2: YMAX * 0.05,
        stroke: MUTED,
        strokeOpacity: 0.5,
      }),
      Plot.text([{ panel: BANDWIDTHS[0].key }], {
        x: 2.15,
        y: YMAX * 1.26,
        fx: "panel",
        text: () => "peaks that are\nsingle observations",
        fill: ACCENT,
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.3,
        textAnchor: "start",
        ...HALO,
      }),
      Plot.text([{ panel: BANDWIDTHS[2].key }], {
        x: 6.45,
        y: YMAX * 1.26,
        fx: "panel",
        text: () => "both clusters gone",
        fill: ACCENT,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "end",
        ...HALO,
      }),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
