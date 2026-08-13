/**
 * Why a paired test can find an effect that an unpaired test on the same
 * numbers cannot see.
 *
 * The left panel is what an independent-samples test looks at: two piles of
 * measurements, before and after, overlapping so heavily that no reasonable
 * person would claim a difference. The right panel is the *same measurements*,
 * subtracted subject by subject.
 *
 * The difference between the panels is not statistical trickery. It is that
 * the two piles are not independent, and pretending they are throws away the
 * fact that the same person appears in both.
 *
 * Look at what is actually varying on the left. Subjects differ enormously
 * from each other: some people's resting values are twenty units above other
 * people's, and that between-subject spread swamps the treatment effect
 * completely. But a subject's own before and after are strongly related,
 * because a high person stays high, so *within* a subject the treatment effect
 * is the only thing left moving.
 *
 * Subtracting is what removes the nuisance. Every subject's personal level
 * cancels, the between-subject variance goes with it, and what remains is the
 * effect plus measurement noise.
 *
 * The rule this leads to: **pair whenever the design lets you**, because a
 * paired design buys the same power for a fraction of the sample. And the
 * warning that comes with it: the pairing must be real. Pairing rows that
 * merely arrived in the same order, or matching on something unrelated to the
 * outcome, gives you the paired test's smaller degrees of freedom for none of
 * its variance reduction, which is strictly worse than not pairing at all.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, PRIMARY, mean, normalSamples } from "./_theme.mjs";
import { panel, panelAxis, panelSpace, panelTitle } from "./_panels.mjs";

export const title =
  "The same measurements twice. As two independent groups, before and after overlap so heavily that no difference is visible; as one difference per subject, the whole distribution sits clear of zero.";

const N = 24;
/** Each subject has a personal level with a big spread, plus a small, real
 *  treatment effect and a little measurement noise. */
const LEVEL = normalSamples(N, 68, 11, 5_281);
const EFFECT = 4.2;
const NOISE_A = normalSamples(N, 0, 1.8, 7_711);
const NOISE_B = normalSamples(N, 0, 1.8, 3_119);

const SUBJECTS = LEVEL.map((level, i) => ({
  i,
  before: level + NOISE_A[i],
  after: level + EFFECT + NOISE_B[i],
})).map((d) => ({ ...d, diff: d.after - d.before }));

const sd = (xs) => {
  const m = mean(xs);
  return Math.sqrt(xs.reduce((s, v) => s + (v - m) ** 2, 0) / (xs.length - 1));
};

const BEFORE = SUBJECTS.map((d) => d.before);
const AFTER = SUBJECTS.map((d) => d.after);
const DIFFS = SUBJECTS.map((d) => d.diff);

const POOLED_SD = Math.sqrt((sd(BEFORE) ** 2 + sd(AFTER) ** 2) / 2);
const UNPAIRED_T = (mean(AFTER) - mean(BEFORE)) / (POOLED_SD * Math.sqrt(2 / N));
const PAIRED_T = mean(DIFFS) / (sd(DIFFS) / Math.sqrt(N));

const RAW = panel(0, { x: [0, 1], y: [35, 105] });
const PAIRED = panel(1, { x: [0, 1], y: [-4, 12] });

const COL = { before: 0.3, after: 0.7 };
const rawPoints = SUBJECTS.flatMap((d) => [
  { ...d, arm: "before", x: RAW.px(COL.before), y: RAW.py(d.before) },
  { ...d, arm: "after", x: RAW.px(COL.after), y: RAW.py(d.after) },
]);

/** Difference points, dodged sideways so twenty-four of them can be counted. */
const diffPoints = SUBJECTS.map((d, i) => ({
  ...d,
  x: PAIRED.px(0.5 + ((i % 8) - 3.5) * 0.05),
  y: PAIRED.py(d.diff),
}));

const positive = DIFFS.filter((v) => v > 0).length;

export const caption = `The same measurements as two independent groups and as one difference per subject. The unpaired t is ${UNPAIRED_T.toFixed(2)} and the paired t is ${PAIRED_T.toFixed(1)}, with ${positive} of the ${N} differences positive.`;

export function render() {
  return plot({
    height: 340,
    marginTop: 26,
    marginLeft: 42,
    marginRight: 18,
    marginBottom: 44,
    ariaLabel: title,
    ...panelSpace(2),
    marks: [
      ...panelAxis(RAW, { ticks: [40, 60, 80, 100] }),
      ...panelAxis(PAIRED, { ticks: [-4, 0, 4, 8, 12] }),
      panelTitle(RAW, "As two independent groups", { fill: ACCENT }),
      panelTitle(PAIRED, "As one difference per subject", { fill: PRIMARY }),

      // Every subject's own pair, joined: the structure the left panel is
      // discarding is drawn here so it can be seen being discarded.
      Plot.link(SUBJECTS, {
        x1: RAW.px(COL.before),
        x2: RAW.px(COL.after),
        y1: (d) => RAW.py(d.before),
        y2: (d) => RAW.py(d.after),
        stroke: MUTED,
        strokeOpacity: 0.3,
        strokeWidth: 1,
      }),
      Plot.dot(rawPoints, {
        x: "x",
        y: "y",
        r: 3.6,
        fill: (d) => (d.arm === "after" ? PRIMARY : MUTED),
        fillOpacity: 0.8,
      }),
      Plot.text(
        [
          { at: RAW.px(COL.before), label: "before" },
          { at: RAW.px(COL.after), label: "after" },
        ],
        {
          x: "at",
          y: RAW.bottom,
          text: "label",
          fill: MUTED,
          fontSize: 10.5,
          fontWeight: 600,
          textAnchor: "middle",
          dy: 14,
        },
      ),
      Plot.text([{}], {
        x: RAW.px(0.5),
        y: RAW.py(102),
        text: () => `t = ${UNPAIRED_T.toFixed(2)}`,
        fill: ACCENT,
        fontSize: 11.5,
        fontWeight: 700,
        textAnchor: "middle",
        ...HALO,
      }),

      Plot.link([{}], {
        x1: PAIRED.left,
        x2: PAIRED.right,
        y1: PAIRED.py(0),
        y2: PAIRED.py(0),
        stroke: GUIDE,
        strokeWidth: 1.4,
        strokeDasharray: "4,3",
      }),
      Plot.dot(diffPoints, { x: "x", y: "y", r: 3.6, fill: PRIMARY, fillOpacity: 0.8 }),
      Plot.link([{}], {
        x1: PAIRED.px(0.16),
        x2: PAIRED.px(0.84),
        y1: PAIRED.py(mean(DIFFS)),
        y2: PAIRED.py(mean(DIFFS)),
        stroke: PRIMARY,
        strokeWidth: 2,
      }),
      Plot.text([{}], {
        x: PAIRED.px(0.86),
        y: PAIRED.py(mean(DIFFS)),
        text: () => `mean ${mean(DIFFS).toFixed(1)}`,
        fill: PRIMARY,
        fontSize: 10,
        fontWeight: 700,
        textAnchor: "start",
        ...HALO,
      }),
      Plot.text([{}], {
        // Inside the panel rather than hanging off its left edge, where an
        // end-anchored label runs back into the tick labels in the margin.
        x: PAIRED.px(0.06),
        y: PAIRED.py(0),
        text: () => "no change",
        fill: MUTED,
        fontSize: 10,
        fontWeight: 600,
        textAnchor: "start",
        ...HALO,
      }),
      Plot.text([{}], {
        x: PAIRED.px(0.5),
        y: PAIRED.py(11),
        text: () => `t = ${PAIRED_T.toFixed(1)}`,
        fill: PRIMARY,
        fontSize: 11.5,
        fontWeight: 700,
        textAnchor: "middle",
        ...HALO,
      }),
      Plot.text([{}], {
        x: (RAW.left + RAW.right) / 2,
        y: RAW.bottom,
        text: () => "the spread here is people, not treatment",
        fill: ACCENT,
        fontSize: 10,
        fontWeight: 700,
        textAnchor: "middle",
        dy: 32,
        ...HALO,
      }),
      Plot.text([{}], {
        x: (PAIRED.left + PAIRED.right) / 2,
        y: PAIRED.bottom,
        text: () => `${positive} of ${N} subjects went up`,
        fill: PRIMARY,
        fontSize: 10,
        fontWeight: 700,
        textAnchor: "middle",
        dy: 32,
        ...HALO,
      }),
    ],
  });
}
