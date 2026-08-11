/**
 * One dataset, one hypothesis, and the tree of defensible choices.
 *
 * No test is run twice here. Every branch is a decision an honest analyst makes
 * once, in order, without ever thinking of it as a multiple comparison:
 *
 *   • trim the outliers, or keep them;
 *   • use the raw outcome, or the log;
 *   • include the covariate, or leave it out;
 *   • drop the first week as a warm-up, or keep it;
 *   • split at the median, or use the pre-registered cut.
 *
 * Five binary choices give thirty-two analyses, and the drawing colours in the
 * ones that land under p = 0.05. When the null is true, each branch has a 5%
 * chance on its own, but the branches share most of their data, so the chance
 * that *at least one* lands significant is far above 5% and far below the 80%
 * a Bonferroni-style calculation would suggest.
 *
 * The name is Gelman and Loken's *garden of forking paths*, and the reason it
 * needed a new name is that it is not p-hacking. Nobody ran thirty-two tests
 * and kept one. The analyst ran *one* test, having made five reasonable choices
 * along the way, each of which they would defend, and any of which they might
 * have made differently had the data looked different. The multiplicity is in
 * the counterfactual analyses, which is why it does not appear in the notebook
 * and cannot be corrected for afterwards.
 *
 * The only real defences are structural: pre-register the analysis so the path
 * is fixed before the data is seen, or report the whole tree, which is what a
 * multiverse or specification-curve analysis does.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, PRIMARY, rng } from "./_theme.mjs";

export const title =
  "Thirty-two analyses of one dataset, produced by five defensible binary choices, with the ones reaching p below 0.05 marked. No test was run twice: each branch is a decision an analyst makes once and would defend.";

const CHOICES = [
  ["keep outliers", "trim outliers"],
  ["raw outcome", "log outcome"],
  ["no covariate", "adjust for age"],
  ["all weeks", "drop week 1"],
  ["pre-registered cut", "median split"],
];
const N_PATHS = 2 ** CHOICES.length;

/**
 * A p-value per path. The paths share most of their data, so their p-values are
 * correlated: a common draw plus a per-path perturbation, which is what makes
 * the family-wise rate land well below the independent-test calculation.
 */
const u = rng(4_099);
const COMMON = u() * 0.55 + 0.12;
const PATHS = Array.from({ length: N_PATHS }, (_, i) => {
  const perturb = (u() - 0.5) * 0.52;
  const p = Math.min(0.98, Math.max(0.0008, COMMON + perturb));
  return {
    i,
    p,
    sig: p < 0.05,
    bits: CHOICES.map((_, b) => (i >> b) & 1),
  };
});

const HITS = PATHS.filter((d) => d.sig).length;
const INDEPENDENT = Math.round((1 - 0.95 ** N_PATHS) * 100);

const COLS = 8;
const ROWS = N_PATHS / COLS;
const tiles = PATHS.map((d) => ({
  ...d,
  col: d.i % COLS,
  row: Math.floor(d.i / COLS),
}));

export const caption = `No test is run twice here. Every branch is one decision an honest analyst makes, in order, without ever thinking of it as a multiple comparison: keep or trim the outliers, raw outcome or log, include the covariate or not, drop the warm-up week or not, median split or the pre-registered cut. Five binary choices give ${N_PATHS} analyses, and ${HITS} of them land under p = 0.05. Each branch has a 5% chance on its own when the null is true, so the chance that *at least one* of the paths you might have taken reaches significance sits far above 5%, and well below the ${INDEPENDENT}% that treating the ${N_PATHS} as independent tests would predict, because they share most of their data. Gelman and Loken called this the garden of forking paths, and it needed a new name because it is not p-hacking. Nobody ran ${N_PATHS} tests and kept one. The analyst ran *one* test, having made five reasonable choices on the way, each of which they would defend, and any of which they might have made differently had the data looked different. The multiplicity lives in the analyses that were never run, which is why it does not appear anywhere in the notebook and cannot be corrected for afterwards. The only real defences are structural: pre-register so the path is fixed before the data is seen, or report the whole tree, which is what a multiverse or specification-curve analysis does.`;

export function render() {
  return plot({
    height: 340,
    marginTop: 26,
    marginLeft: 44,
    marginRight: 22,
    marginBottom: 100,
    ariaLabel: title,
    x: { axis: null, domain: [-0.6, COLS - 0.4] },
    y: {
      label: "p-value",
      domain: [1, 0.0008],
      type: "log",
      ticks: [0.001, 0.01, 0.05, 0.2, 1],
      tickFormat: (v) => (v >= 0.05 ? String(v) : v.toFixed(3)),
    },
    marks: [
      Plot.ruleY([0.05], { stroke: GUIDE, strokeWidth: 1.5, strokeDasharray: "4,3" }),
      Plot.link(tiles, {
        x1: "col",
        x2: "col",
        y1: 1,
        y2: "p",
        stroke: (d) => (d.sig ? ACCENT : MUTED),
        strokeOpacity: (d) => (d.sig ? 0.6 : 0.22),
        strokeWidth: 1.2,
      }),
      Plot.dot(tiles, {
        x: (d) => d.col + (d.row - (ROWS - 1) / 2) * 0.14,
        y: "p",
        r: 4,
        fill: (d) => (d.sig ? ACCENT : MUTED),
        fillOpacity: (d) => (d.sig ? 0.9 : 0.4),
      }),
      Plot.text([{}], {
        x: COLS - 0.4,
        y: 0.05,
        text: () => "p = 0.05",
        fill: MUTED,
        fontSize: 10,
        fontWeight: 700,
        textAnchor: "end",
        dy: -8,
        ...HALO,
      }),
      Plot.text([{}], {
        x: (COLS - 1) / 2,
        y: 0.0018,
        text: () => `${HITS} of the ${N_PATHS} paths land under 0.05,\nand exactly one of them gets written up`,
        fill: ACCENT,
        fontSize: 10.5,
        fontWeight: 700,
        lineHeight: 1.4,
        textAnchor: "middle",
        ...HALO,
      }),
      // The five decisions, listed under the frame. Each one is a fork, and
      // naming them is the point: none of them looks like a hypothesis test.
      ...CHOICES.map((pair, i) =>
        Plot.text([{}], {
          x: (COLS - 1) / 2,
          y: 1,
          text: () => `${i + 1}. ${pair[0]} or ${pair[1]}`,
          fill: MUTED,
          fontSize: 10,
          fontWeight: 600,
          textAnchor: "middle",
          dy: 16 + i * 13,
          ...HALO,
        }),
      ),
    ],
  });
}
