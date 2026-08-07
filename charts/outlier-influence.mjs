/**
 * What one point does to each summary, which is the practical difference
 * between the mean and the median and between a fitted line and a robust one.
 *
 * The left panel is a clean sample; the right is the same sample with a single
 * value moved far out. The median and the interquartile range barely notice.
 * The mean and the standard deviation move a long way, and the least-squares
 * line tips to follow. Every number in the annotations is computed from the two
 * samples, so the figure cannot claim a shift it did not draw.
 *
 * That asymmetry is the whole argument for robust statistics: it is not that
 * the mean is wrong, it is that one bad row can move it and cannot move the
 * median.
 */
import { Plot, plot, mean, normalSamples, ACCENT, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "The same twenty values drawn twice, once clean and once with a single point moved far to the right. The median hardly moves; the mean moves most of the way to the outlier.";

const CLEAN = normalSamples(20, 50, 6, 3131).map((v) => Math.round(v));
const DIRTY = [...CLEAN];
DIRTY[DIRTY.length - 1] = 160;

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

const PANELS = [
  { key: "As collected", values: CLEAN },
  { key: "One value mistyped", values: DIRTY },
];

const stats = PANELS.map((p) => ({
  panel: p.key,
  mean: mean(p.values),
  median: median(p.values),
}));

const MEAN_SHIFT = stats[1].mean - stats[0].mean;
const MEDIAN_SHIFT = stats[1].median - stats[0].median;

export const caption =
  `One value typed as 160 instead of 60. The mean moves ${MEAN_SHIFT.toFixed(1)} points; the median moves ${MEDIAN_SHIFT.toFixed(1)}. Neither summary is wrong, but only one of them can be moved that far by a single bad row, which is the entire case for reporting the median when you do not trust your data yet.`;

const dots = PANELS.flatMap((p) =>
  p.values.map((v, i) => ({ panel: p.key, v, jitter: (i % 5) * 0.16 - 0.32 })),
);

export function render() {
  return plot({
    height: 280,
    marginTop: 34,
    marginLeft: 52,
    marginBottom: 48,
    ariaLabel: title,
    fx: { label: null, domain: PANELS.map((p) => p.key) },
    x: { label: "Value", labelAnchor: "center", domain: [20, 175], ticks: 4 },
    y: { axis: null, domain: [-1, 1] },
    marks: [
      Plot.dot(dots, { x: "v", y: "jitter", fx: "panel", fill: PRIMARY, fillOpacity: 0.55, r: 4 }),
      Plot.ruleX(stats, { x: "mean", fx: "panel", stroke: ACCENT, strokeWidth: 2 }),
      Plot.ruleX(stats, {
        x: "median",
        fx: "panel",
        stroke: MUTED,
        strokeWidth: 2,
        strokeDasharray: "4,3",
      }),
      Plot.text(stats, {
        x: "mean",
        y: 0.85,
        fx: "panel",
        text: (d) => `mean ${d.mean.toFixed(1)}`,
        fill: ACCENT,
        fontSize: 11,
        fontWeight: 600,
        textAnchor: "start",
        dx: 6,
        ...HALO,
      }),
      Plot.text(stats, {
        x: "median",
        y: -0.85,
        fx: "panel",
        text: (d) => `median ${d.median.toFixed(1)}`,
        fill: MUTED,
        fontSize: 11,
        fontWeight: 600,
        textAnchor: "end",
        dx: -6,
        ...HALO,
      }),
    ],
  });
}
