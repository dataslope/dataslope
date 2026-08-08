/**
 * Four columns with the same mean, median and standard deviation, and four
 * completely different shapes.
 *
 * Anscombe's quartet makes the same argument about *pairs* of variables: same
 * regression, same correlation, four different scatters. It is the famous one,
 * and it is the wrong one to lead with here, because the summary a reader
 * actually types first is `df.describe()` on a single column. This is that
 * case: one variable, the three numbers `describe()` puts at the top, and four
 * distributions those numbers cannot tell apart.
 *
 * The four are the shapes that matter in practice rather than a spread of
 * mathematical curiosities: a normal, a bimodal mixture that is really two
 * populations, a uniform slab, and a spike with a long tail. Each one implies a
 * different next step, and the summary implies none of them.
 *
 * The moments are matched by construction and then verified: each sample is
 * shifted and scaled to hit the target mean and standard deviation exactly, and
 * the caption prints what the four actually came out at, so the claim in the
 * title is checkable against the figure rather than asserted by it.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, PRIMARY, rng } from "./_theme.mjs";

export const title =
  "Four distributions drawn as stacked strips of points on a shared axis: a single hump, two separated humps, a flat slab, and a spike with a long right tail. All four have the same mean, the same median and the same standard deviation.";

const TARGET_MEAN = 50;
const TARGET_SD = 12;
const N = 220;

const u = rng(60613);
function gauss() {
  const a = Math.max(u(), Number.EPSILON);
  const b = u();
  return Math.sqrt(-2 * Math.log(a)) * Math.cos(2 * Math.PI * b);
}

/** Shift and scale a sample onto the target mean and sd, so every row's first
 *  two moments agree exactly and only the shape is free to differ. */
function normalise(xs) {
  const m = xs.reduce((s, x) => s + x, 0) / xs.length;
  const sd = Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / xs.length);
  return xs.map((x) => TARGET_MEAN + ((x - m) / sd) * TARGET_SD);
}

/** A symmetric shape keeps the median where the mean is; the skewed one is
 *  mirrored around its own centre in half the draws for the same reason, so the
 *  row differs in tail and peak rather than in a third summary the chart is not
 *  about. */
const SHAPES = [
  {
    key: "One hump",
    note: "a plain normal",
    raw: () => Array.from({ length: N }, () => gauss()),
  },
  {
    key: "Two humps",
    note: "two populations",
    raw: () => Array.from({ length: N }, (_, i) => (i % 2 ? -1 : 1) * 1.5 + gauss() * 0.34),
  },
  {
    key: "A flat slab",
    note: "every value equally likely",
    raw: () => Array.from({ length: N }, () => u() * 2 - 1),
  },
  {
    key: "A spike and two tails",
    note: "most values identical",
    raw: () =>
      Array.from({ length: N }, (_, i) => {
        const far = i % 11 === 0;
        return (i % 2 ? -1 : 1) * (far ? 2.6 + Math.abs(gauss()) * 0.8 : Math.abs(gauss()) * 0.14);
      }),
  },
];

const ROWS = SHAPES.flatMap((s) => {
  const vals = normalise(s.raw());
  // Jitter is vertical only, so the horizontal position is the value and
  // nothing else, and 220 points on one strip stay countable.
  return vals.map((v) => ({ key: s.key, v, j: (u() - 0.5) * 0.62 }));
});

const ORDER = SHAPES.map((s) => s.key);

const stats = (key) => {
  const vals = ROWS.filter((r) => r.key === key).map((r) => r.v);
  const m = vals.reduce((s, x) => s + x, 0) / vals.length;
  const sorted = [...vals].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const med = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  const sd = Math.sqrt(vals.reduce((s, x) => s + (x - m) ** 2, 0) / vals.length);
  return { m, med, sd };
};

const ALL = ORDER.map(stats);
const MEAN_RANGE = Math.max(...ALL.map((s) => s.m)) - Math.min(...ALL.map((s) => s.m));
const SD_RANGE = Math.max(...ALL.map((s) => s.sd)) - Math.min(...ALL.map((s) => s.sd));
const MED_RANGE = Math.max(...ALL.map((s) => s.med)) - Math.min(...ALL.map((s) => s.med));

export const caption = `Four columns you might meet in one table. Their means agree to within ${MEAN_RANGE.toFixed(2)}, their standard deviations to within ${SD_RANGE.toFixed(2)}, and their medians to within ${MED_RANGE.toFixed(1)}, which is to say \`describe()\` reports the same column four times. The shapes are not remotely the same, and each one asks for something different: the second is two populations that want splitting before anything else is computed, the third has no typical value to report, and the fourth has an average almost none of its rows are near. A summary is a lossy compression, and the part it drops is the part that decides what to do next.`;

export function render() {
  return plot({
    height: 380,
    marginTop: 22,
    marginLeft: 44,
    marginRight: 176,
    marginBottom: 46,
    ariaLabel: title,
    x: { label: "Value", labelAnchor: "center", domain: [0, 100], ticks: 6 },
    y: { label: null, domain: [-0.5, 0.5], ticks: [], grid: false },
    fy: { domain: ORDER, label: null, axis: null },
    marks: [
      // The shared mean, drawn through every row: it is the same number in all
      // four, which is the claim, so it has to be visible as one line.
      Plot.ruleX(
        SHAPES.map((s) => ({ key: s.key, v: TARGET_MEAN })),
        { x: "v", fy: "key", stroke: GUIDE, strokeWidth: 1, strokeDasharray: "3,3" },
      ),
      Plot.dot(ROWS, {
        x: "v",
        y: "j",
        fy: "key",
        r: 2.2,
        fill: (d) => (d.key === "One hump" ? PRIMARY : ACCENT),
        fillOpacity: 0.6,
      }),
      Plot.text(SHAPES, {
        x: () => 100,
        y: () => 0,
        fy: "key",
        text: (d) => `${d.key}\n${d.note}`,
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.35,
        textAnchor: "start",
        dx: 10,
        ...HALO,
      }),
      Plot.text([{ key: ORDER[0] }], {
        x: () => TARGET_MEAN,
        y: () => 0.5,
        fy: "key",
        text: () => `same mean, median and SD in all four`,
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "middle",
        dy: -2,
        ...HALO,
      }),
    ],
  });
}
