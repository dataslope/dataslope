/**
 * Which test wins depends on the shape of the population, not on a rule.
 *
 * The folk version of this comparison is "use the t-test for normal data and
 * Mann-Whitney otherwise", which is true but not useful, because it stops
 * exactly where the interesting part starts: *how much* does it cost to pick
 * the wrong one, and in which direction?
 *
 * Three populations, one shifted against itself by the same amount in each,
 * and the power of both tests estimated by simulation:
 *
 *   • **Normal.** The t-test is the optimal test here and Mann-Whitney is
 *     not, and the gap is about three percentage points. That is the price of
 *     insuring against a shape you did not have, and it is small.
 *   • **Heavy-tailed.** A few extreme values inflate the sample standard
 *     deviation, the t statistic's denominator grows, and its power collapses.
 *     Mann-Whitney only ever sees ranks, so an outlier at 400 counts exactly as
 *     much as one at 40: it is the largest, and that is all it is.
 *   • **Skewed.** Ranks win by a wider margin still, because most of the mass
 *     sits in a narrow range where a shift swaps a great many pairs around
 *     while the long tail dominates the mean. There is a catch worth stating
 *     here: Mann-Whitney is not a test of medians unless the two
 *     distributions have the same shape. What it actually tests is whether a
 *     random value from one group tends to exceed a random value from the
 *     other, which is a perfectly good question and is not the same question.
 *
 * The asymmetry is the whole argument. Choosing Mann-Whitney when the data was
 * normal costs a few points of power. Choosing the t-test when the data was
 * heavy-tailed costs most of it.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY, rng } from "./_theme.mjs";
import { panel, panelAxis, panelBaseline, panelCategories, panelSpace, panelTitle } from "./_panels.mjs";

export const title =
  "Power of the t-test and of Mann-Whitney U for the same shift, estimated by simulation on a normal, a heavy-tailed and a right-skewed population. On normal data the t-test wins narrowly; on heavy-tailed data it loses badly.";

const N = 22;
const REPS = 3_000;
const SHIFT = 0.62;

/** Standard normal draws from a seeded uniform stream, so every population is
 *  built from the same generator and the build stays deterministic. */
function normalPair(u) {
  const a = Math.max(u(), Number.EPSILON);
  const b = u();
  const r = Math.sqrt(-2 * Math.log(a));
  return [r * Math.cos(2 * Math.PI * b), r * Math.sin(2 * Math.PI * b)];
}

const POPULATIONS = [
  {
    key: "Normal",
    note: "the t-test's home ground",
    draw: (u) => normalPair(u)[0],
  },
  {
    key: "Heavy-tailed",
    note: "one draw in twenty is ten times as wide",
    // A normal contaminated with a wide component: the classic model for
    // "mostly well behaved, with occasional wild values".
    draw: (u) => normalPair(u)[0] * (u() < 0.05 ? 10 : 1),
  },
  {
    key: "Right-skewed",
    note: "a lognormal, rescaled to the same spread",
    draw: (u) => (Math.exp(normalPair(u)[0]) - Math.exp(0.5)) / 2.16,
  },
];

/** Two-sample t statistic, pooled. */
function tStat(a, b) {
  const m = (xs) => xs.reduce((s, v) => s + v, 0) / xs.length;
  const ma = m(a);
  const mb = m(b);
  const ss = (xs, mu) => xs.reduce((s, v) => s + (v - mu) ** 2, 0);
  const sp2 = (ss(a, ma) + ss(b, mb)) / (a.length + b.length - 2);
  return (mb - ma) / Math.sqrt(sp2 * (1 / a.length + 1 / b.length));
}

/** Mann-Whitney U, as a normal deviate with the usual tie-free variance. */
function uStat(a, b) {
  const all = [...a.map((v) => ({ v, g: 0 })), ...b.map((v) => ({ v, g: 1 }))].sort(
    (p, q) => p.v - q.v,
  );
  let rankSumB = 0;
  all.forEach((d, i) => {
    if (d.g === 1) rankSumB += i + 1;
  });
  const nb = b.length;
  const na = a.length;
  const U = rankSumB - (nb * (nb + 1)) / 2;
  const mu = (na * nb) / 2;
  const sd = Math.sqrt((na * nb * (na + nb + 1)) / 12);
  return (U - mu) / sd;
}

/** Two-sided 5% critical values at these degrees of freedom. */
const T_CRIT = 2.0195; // df = 42
const Z_CRIT = 1.96;

const RESULTS = POPULATIONS.map((pop, k) => {
  const u = rng(20_204 + k * 977);
  let tWins = 0;
  let uWins = 0;
  for (let r = 0; r < REPS; r++) {
    const a = Array.from({ length: N }, () => pop.draw(u));
    const b = Array.from({ length: N }, () => pop.draw(u) + SHIFT);
    if (Math.abs(tStat(a, b)) > T_CRIT) tWins += 1;
    if (Math.abs(uStat(a, b)) > Z_CRIT) uWins += 1;
  }
  return { ...pop, t: tWins / REPS, u: uWins / REPS };
});

const NORMAL = RESULTS[0];
const HEAVY = RESULTS[1];
const SKEW = RESULTS[2];
/** Gaps taken between the *rounded* percentages, so the label on a bar and the
 *  difference quoted beside it can never disagree by a point. */
const pct = (v) => Math.round(v * 100);
const COST_NORMAL = pct(NORMAL.t) - pct(NORMAL.u);
const COST_HEAVY = pct(HEAVY.u) - pct(HEAVY.t);
const COST_SKEW = pct(SKEW.u) - pct(SKEW.t);

const PANELS = RESULTS.map((_, k) => panel(k, { y: [0, 1] }));
const BAR = 0.34;

const bars = RESULTS.flatMap((d, k) => {
  const p = PANELS[k];
  return [
    { ...d, test: "t-test", value: d.t, slot: 0 },
    { ...d, test: "Mann-Whitney", value: d.u, slot: 1 },
  ].map((row) => ({
    ...row,
    x1: p.band(row.slot, 2) - (p.bandWidth(2) * BAR) / 2,
    x2: p.band(row.slot, 2) + (p.bandWidth(2) * BAR) / 2,
    xm: p.band(row.slot, 2),
    y: p.py(row.value),
    y0: p.py(0),
  }));
});

export const caption = `Power of both tests against the same shift, ${REPS.toLocaleString("en-GB")} runs per panel. On normal data the t-test wins by ${COST_NORMAL} percentage points; on heavy-tailed data its power falls to ${pct(HEAVY.t)}% while Mann-Whitney holds ${pct(HEAVY.u)}%, and on the skewed population the gap is ${COST_SKEW} points.`;

export function render() {
  return plot({
    height: 330,
    marginTop: 30,
    marginLeft: 42,
    marginRight: 18,
    marginBottom: 62,
    ariaLabel: title,
    ...panelSpace(3),
    marks: [
      ...PANELS.flatMap((p, k) => [
        ...panelAxis(p, {
          ticks: [0, 0.25, 0.5, 0.75, 1],
          format: (v) => `${Math.round(v * 100)}%`,
        }),
        panelTitle(p, RESULTS[k].key, { fill: k === 1 ? ACCENT : MUTED }),
        panelBaseline(p),
        panelCategories(p, ["t-test", "ranks"]),
      ]),

      Plot.rect(bars, {
        x1: "x1",
        x2: "x2",
        y1: "y0",
        y2: "y",
        fill: (d) => (d.slot === 0 ? MUTED : PRIMARY),
        fillOpacity: (d) => (d.slot === 0 ? 0.55 : 0.75),
      }),
      Plot.text(bars, {
        x: "xm",
        y: "y",
        text: (d) => `${Math.round(d.value * 100)}%`,
        fill: (d) => (d.slot === 0 ? MUTED : PRIMARY),
        fontSize: 10.5,
        fontWeight: 700,
        textAnchor: "middle",
        dy: -8,
        ...HALO,
      }),

      ...RESULTS.map((d, k) =>
        Plot.text([{}], {
          x: (PANELS[k].left + PANELS[k].right) / 2,
          y: PANELS[k].py(0),
          text: () => d.note,
          fill: "currentColor",
          fillOpacity: 0.6,
          fontSize: 10,
          fontWeight: 600,
          lineHeight: 1.3,
          textAnchor: "middle",
          dy: 30,
          ...HALO,
        }),
      ),
      Plot.text([{}], {
        x: (PANELS[0].left + PANELS[0].right) / 2,
        y: PANELS[0].py(0.85),
        text: () => `ranks cost you\n${COST_NORMAL} points here`,
        fill: MUTED,
        fontSize: 10,
        fontWeight: 700,
        lineHeight: 1.35,
        textAnchor: "middle",
        ...HALO,
      }),
      Plot.text([{}], {
        x: (PANELS[1].left + PANELS[1].right) / 2,
        y: PANELS[1].py(0.62),
        text: () => `and save you\n${COST_HEAVY} points here`,
        fill: ACCENT,
        fontSize: 10,
        fontWeight: 700,
        lineHeight: 1.35,
        textAnchor: "middle",
        ...HALO,
      }),
      Plot.text([{}], {
        x: 1.5,
        y: 0.15,
        text: () => `power against the same shift of ${SHIFT} standard deviations, n = ${N} per group, ${REPS.toLocaleString("en-GB")} runs`,
        fill: "currentColor",
        fillOpacity: 0.55,
        fontSize: 10,
        textAnchor: "middle",
        dy: 48,
      }),
    ],
  });
}
