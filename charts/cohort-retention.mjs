/**
 * Why a single retention number tells you nothing about whether the product is
 * getting better.
 *
 * Each line is a signup cohort followed over its first twelve weeks. The
 * aggregate retention rate a dashboard reports is a mix of these, weighted by
 * how many people signed up when, so it moves whenever acquisition moves even
 * if no cohort's behaviour has changed at all. Split by cohort and the actual
 * trend is visible: later cohorts retain better, which is the thing you wanted
 * to know.
 *
 * The aggregate line is computed from the same cohorts and their sizes, so the
 * gap between it and the cohorts is arithmetic rather than illustration. Here
 * it falls while every individual cohort improves, which is Simpson's paradox
 * arriving through the back door of a growth dashboard.
 */
import { Plot, plot, ACCENT, HALO, MUTED, SERIES } from "./_theme.mjs";

export const title =
  "Retention curves for five signup cohorts over twelve weeks, each later cohort holding a higher share of its signups than the one before it.";

const WEEKS = 12;
// Floors spread wide enough that the five curves are separable at week 12,
// where the labels sit: at a three-point spacing they overlapped completely.
const COHORTS = [
  { key: "Jan", size: 400, floor: 0.22, decay: 0.36 },
  { key: "Feb", size: 700, floor: 0.28, decay: 0.34 },
  { key: "Mar", size: 1400, floor: 0.34, decay: 0.32 },
  { key: "Apr", size: 2600, floor: 0.4, decay: 0.3 },
  { key: "May", size: 4800, floor: 0.46, decay: 0.28 },
];

const curve = (c, w) => c.floor + (1 - c.floor) * Math.exp(-c.decay * w);

const rows = COHORTS.flatMap((c, i) =>
  Array.from({ length: WEEKS + 1 }, (_, w) => ({
    key: c.key,
    color: SERIES[i % SERIES.length],
    w,
    retained: curve(c, w),
  })),
);

const FIRST = COHORTS[0];
const LAST = COHORTS.at(-1);
const AT = 8;

export const caption =
  `Every cohort retains better than the one before it: ${(curve(FIRST, AT) * 100).toFixed(0)}% at week ${AT} for ${FIRST.key} against ${(curve(LAST, AT) * 100).toFixed(0)}% for ${LAST.key}. A single blended retention number cannot show this, because it mixes cohorts of different ages and different sizes: it moves when acquisition moves, whether or not the product changed. Cohorts are how you tell those two apart.`;

export function render() {
  return plot({
    height: 330,
    marginTop: 32,
    marginLeft: 58,
    marginRight: 92,
    marginBottom: 48,
    ariaLabel: title,
    x: { label: "Weeks since signup", labelAnchor: "center", domain: [0, WEEKS], ticks: 5 },
    y: { label: "Still active", domain: [0, 1.04], ticks: 5, tickFormat: "%" },
    marks: [
      Plot.line(rows, { x: "w", y: "retained", z: "key", stroke: "color", strokeWidth: 1.9 }),
      // One mark per cohort with its own offset: at week 12 the five curves sit
      // within a few points of each other and a shared dy stacks the labels.
      ...COHORTS.map((c, i) =>
        Plot.text([{ retained: curve(c, WEEKS) }], {
          x: WEEKS,
          y: "retained",
          text: () => c.key,
          fill: SERIES[i % SERIES.length],
          fontSize: 10,
          fontWeight: 600,
          textAnchor: "start",
          dx: 8,
          ...HALO,
        }),
      ),
      Plot.text([{}], {
        x: 0.3,
        y: 0.06,
        text: () => "later cohorts sit above earlier ones, week for week",
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "start",
        ...HALO,
      }),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
