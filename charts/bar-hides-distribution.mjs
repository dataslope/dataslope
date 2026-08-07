/**
 * The bar-of-means trap: four groups with the same mean and nothing else in
 * common.
 *
 * Every bar is 50 high because every group's mean is exactly 50, arranged by
 * construction rather than by luck. Behind the bars are the observations those
 * means were computed from: one tight cluster, one four times as wide, one with
 * two clumps and nobody near the middle, and one right-skewed group whose mean
 * sits above most of its own points. A reader shown only the bars
 * would report "no difference between these groups", which is wrong about
 * three of the four.
 *
 * The x scale is linear rather than a band, because the points need a jitter
 * and a jitter has to be arithmetic on the x value. Plot's `dx` is a *constant*
 * channel — hand it a function and Plot stringifies the function into the
 * attribute, where it renders as nothing at all.
 */
import { Plot, plot, rng, ACCENT, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Four groups drawn as bars of their means, which are identical, with the raw observations plotted over them, which are not: one tight cluster, one wide spread, one with two clumps and a hole in the middle, and one right-skewed group whose mean sits above most of its data.";

const TARGET = 50;
const N = 44;
const next = rng(915);
const gauss = () => {
  const a = Math.max(next(), Number.EPSILON);
  return Math.sqrt(-2 * Math.log(a)) * Math.cos(2 * Math.PI * next());
};

/** Shift a group onto the target mean exactly. Sampled means land near 50, and
 *  "near" is not the claim: the bars have to be identical. */
function centered(values) {
  const m = values.reduce((s, v) => s + v, 0) / values.length;
  return values.map((v) => v - m + TARGET);
}

const GROUPS = [
  { key: "Tight", values: centered(Array.from({ length: N }, () => gauss() * 4)) },
  { key: "Wide", values: centered(Array.from({ length: N }, () => gauss() * 16)) },
  {
    key: "Two clumps",
    values: centered(Array.from({ length: N }, (_, i) => (i % 2 ? -20 : 20) + gauss() * 3.5)),
  },
  {
    // Right-skewed: most values low, a thin tail pulling the mean up past them.
    key: "Skewed",
    values: centered(Array.from({ length: N }, () => Math.exp(gauss() * 0.75) * 18)),
  },
];

const CENTERS = GROUPS.map((_, i) => i + 1);
const HALF = 0.34; // half-width of a bar, in x units

const points = GROUPS.flatMap((g, gi) =>
  g.values.map((v, i) => ({
    group: g.key,
    v,
    // Deterministic jitter: evenly spread across the bar, so ties stay
    // countable and the figure is identical on every build.
    x: CENTERS[gi] + ((i / (g.values.length - 1)) - 0.5) * HALF * 1.5,
  })),
);

const bars = GROUPS.map((g, i) => ({ group: g.key, x1: CENTERS[i] - HALF, x2: CENTERS[i] + HALF }));

/** Quoted in the annotation rather than typed, so it cannot drift. */
const skewed = GROUPS[3].values;
const BELOW_MEAN = Math.round((skewed.filter((v) => v < TARGET).length / skewed.length) * 100);

export const caption =
  `Every bar is the same height because every group has the same mean. Behind them, one group is tight, one is four times wider, one has two clumps with nobody in the middle, and one is skewed enough that ${BELOW_MEAN}% of it falls below its own mean. The bars are true and tell you almost nothing.`;

export function render() {
  return plot({
    height: 360,
    marginTop: 34,
    marginLeft: 56,
    marginRight: 24,
    marginBottom: 48,
    ariaLabel: title,
    x: {
      label: null,
      domain: [0.4, GROUPS.length + 0.6],
      ticks: CENTERS,
      tickFormat: (d) => GROUPS[d - 1].key,
    },
    y: { label: "Value", domain: [0, 120], ticks: 5 },
    marks: [
      Plot.rect(bars, { x1: "x1", x2: "x2", y1: 0, y2: TARGET, fill: MUTED, fillOpacity: 0.26 }),
      Plot.ruleY([TARGET], { stroke: MUTED, strokeWidth: 1.5, strokeDasharray: "4,3" }),
      Plot.text([{}], {
        x: 0.5,
        y: 114,
        text: () => `every bar is the mean; every mean is ${TARGET}`,
        fill: MUTED,
        fontSize: 11,
        fontWeight: 600,
        textAnchor: "start",
        ...HALO,
      }),

      Plot.dot(points, { x: "x", y: "v", fill: PRIMARY, fillOpacity: 0.55, r: 2.8, clip: true }),

      Plot.text([{}], {
        x: CENTERS[2],
        y: TARGET,
        text: () => "nobody near\nthe mean",
        fill: ACCENT,
        fontSize: 11,
        fontWeight: 600,
        lineHeight: 1.3,
        textAnchor: "middle",
        ...HALO,
      }),
      Plot.text([{}], {
        x: CENTERS[3] + 0.5,
        y: 98,
        text: () => `${BELOW_MEAN}% of this group\nfalls below its own mean`,
        fill: ACCENT,
        fontSize: 11,
        fontWeight: 600,
        lineHeight: 1.3,
        textAnchor: "end",
        ...HALO,
      }),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
