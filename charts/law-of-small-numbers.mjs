/**
 * The funnel, and why the best and worst places are always small ones.
 *
 * Eighteen hundred simulated counties, all with *exactly the same* true rate.
 * There is no real variation here at all: every county was generated from the
 * same underlying probability, and the only thing that differs is how many
 * people live in it.
 *
 * The shape that comes out is a funnel, and it is the single most useful shape
 * in applied statistics. The observed rate in a county of two hundred wanders
 * by several points; the observed rate in a county of a hundred thousand barely
 * moves. That is `sqrt(p(1-p)/n)` drawn.
 *
 * Now do what a real analysis does and take the top twenty. Every one of them
 * is a small county, and so is every one of the bottom twenty, and both facts
 * follow from the funnel rather than from anything about the places. A map of
 * the highest-rate counties is a map of the smallest ones.
 *
 * This is not a hypothetical error. The best-known case is the US study of
 * school size and performance, which found that the highest-scoring schools
 * were disproportionately small and prompted a large programme of breaking up
 * large schools. The lowest-scoring schools were also disproportionately small,
 * which was in the same data and did not travel.
 *
 * The fix that actually works is to plot the funnel: rate against sample size,
 * with the expected variation drawn as bounds. A point outside the bounds is
 * interesting. A point at the top of a ranking is not, until you know how big
 * it is.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, PRIMARY, rng } from "./_theme.mjs";

export const title =
  "Eighteen hundred simulated counties, all with exactly the same true rate, plotted as observed rate against population. The result is a funnel, and both the highest and the lowest observed rates belong to the smallest counties.";

const TRUE_RATE = 0.05;
// 1,800 rather than the 3,000 the prose might suggest: every dot is a circle
// element in the inlined SVG, and the funnel is just as clear at this density
// for a third less weight on the page.
const N_COUNTIES = 1800;
const u = rng(7_741);

/** Population on a log-uniform spread from 200 to 200,000, then a binomial
 *  draw approximated by its normal limit, which is exact enough at every n
 *  here and keeps the build fast. */
const COUNTIES = Array.from({ length: N_COUNTIES }, () => {
  const pop = Math.round(200 * Math.pow(1000, u()));
  const se = Math.sqrt((TRUE_RATE * (1 - TRUE_RATE)) / pop);
  const a = Math.max(u(), Number.EPSILON);
  const b = u();
  const z = Math.sqrt(-2 * Math.log(a)) * Math.cos(2 * Math.PI * b);
  return { pop, rate: Math.max(0, TRUE_RATE + se * z) * 100 };
});

const TOP = [...COUNTIES].sort((a, b) => b.rate - a.rate).slice(0, 20);
const BOTTOM = [...COUNTIES].sort((a, b) => a.rate - b.rate).slice(0, 20);
const flagged = new Set([...TOP, ...BOTTOM]);

const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const MED_TOP = median(TOP.map((d) => d.pop));
const MED_ALL = median(COUNTIES.map((d) => d.pop));

/** The 95% funnel: the band an ordinary county should sit in, by population. */
const BOUNDS = Array.from({ length: 120 }, (_, i) => {
  const pop = 200 * Math.pow(1000, i / 119);
  const se = Math.sqrt((TRUE_RATE * (1 - TRUE_RATE)) / pop) * 100;
  return { pop, lo: TRUE_RATE * 100 - 1.96 * se, hi: TRUE_RATE * 100 + 1.96 * se };
});

export const caption = `${N_COUNTIES.toLocaleString()} counties generated from exactly the same true rate of ${(TRUE_RATE * 100).toFixed(0)}%. Nothing varies here but population, and the top twenty have a median population of ${MED_TOP.toLocaleString()} against ${MED_ALL.toLocaleString()} for the whole set.`;

export function render() {
  return plot({
    height: 340,
    marginTop: 26,
    marginLeft: 54,
    marginRight: 24,
    marginBottom: 52,
    ariaLabel: title,
    x: {
      label: "County population (log scale)",
      labelAnchor: "center",
      type: "log",
      domain: [180, 240_000],
      ticks: [200, 1000, 10_000, 100_000],
      tickFormat: (v) => (v >= 1000 ? `${v / 1000}k` : String(v)),
    },
    y: {
      label: "Observed rate (%)",
      domain: [0, 12],
      ticks: [0, 3, 6, 9, 12],
    },
    marks: [
      Plot.areaY(BOUNDS, {
        x: "pop",
        y1: "lo",
        y2: "hi",
        fill: GUIDE,
        fillOpacity: 0.16,
        clip: true,
      }),
      Plot.ruleY([TRUE_RATE * 100], { stroke: GUIDE, strokeWidth: 1.4 }),
      Plot.dot(COUNTIES, {
        x: "pop",
        y: "rate",
        r: 1.7,
        fill: (d) => (flagged.has(d) ? ACCENT : MUTED),
        fillOpacity: (d) => (flagged.has(d) ? 0.95 : 0.35),
        clip: true,
      }),
      Plot.text([{}], {
        x: 200_000,
        y: TRUE_RATE * 100,
        text: () => `the true rate, ${(TRUE_RATE * 100).toFixed(0)}%,\nin every single county`,
        fill: MUTED,
        fontSize: 10,
        fontWeight: 600,
        lineHeight: 1.35,
        textAnchor: "end",
        dy: -16,
        ...HALO,
      }),
      Plot.text([{}], {
        x: 240,
        y: 11.4,
        text: () => "top 20 and bottom 20, in red:\nall of them small counties",
        fill: ACCENT,
        fontSize: 10.5,
        fontWeight: 700,
        lineHeight: 1.35,
        textAnchor: "start",
        ...HALO,
      }),
      Plot.text([{}], {
        x: 60_000,
        y: 1.4,
        text: () => "nothing unusual ever happens\nto a large county",
        fill: MUTED,
        fontSize: 10,
        fontWeight: 600,
        lineHeight: 1.35,
        textAnchor: "middle",
        ...HALO,
      }),
    ],
  });
}
