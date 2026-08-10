/**
 * Two ways to correct for multiple testing, and what each costs.
 *
 * Bonferroni divides α by the number of tests, so the threshold collapses:
 * at a hundred tests you need p below 0.0005 to call anything, and real effects
 * disappear along with the false ones. Benjamini-Hochberg instead ranks the
 * p-values and allows the k-th smallest up to k·α/m, which is a rising line
 * rather than a floor, so it keeps far more power while still controlling the
 * share of discoveries that are false.
 *
 * Drawn against rank rather than against the number of tests, because that is
 * the comparison that shows the difference in kind: Bonferroni is a horizontal
 * line and BH is a diagonal, and every p-value between them is a finding one
 * method keeps and the other throws away.
 *
 * The counts in the caption come from scoring a fixed set of p-values against
 * both rules, so "keeps four rather than one" is the arithmetic.
 */
import { Plot, plot, rng, ACCENT, GUIDE, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Sorted p-values from a hundred tests against their rank, with the Bonferroni threshold as a flat line near zero and the Benjamini-Hochberg threshold as a rising diagonal; several p-values fall between the two.";

const M = 100;
const ALPHA = 0.05;
const next = rng(777);

// Ninety nulls and ten real effects: the mixture every correction is designed
// for, and the reason the two rules disagree.
const pvalues = [
  ...Array.from({ length: 90 }, () => next()),
  // Real effects have to be genuinely small for either rule to keep them: at
  // m = 100 the BH line only reaches 0.005 by rank 10, so effects drawn up to
  // 0.02 leave both rules rejecting nothing and the figure making no point.
  ...Array.from({ length: 10 }, () => next() * 0.003),
].sort((a, b) => a - b);

const rows = pvalues.map((p, i) => ({ rank: i + 1, p }));

const BONF = ALPHA / M;
const bhLine = rows.map((r) => ({ rank: r.rank, t: (r.rank * ALPHA) / M }));

/** BH rejects everything up to the largest rank whose p is under its own line. */
const BH_CUT = rows.reduce((best, r) => (r.p <= (r.rank * ALPHA) / M ? r.rank : best), 0);
const BONF_COUNT = rows.filter((r) => r.p <= BONF).length;

export const caption =
  `A hundred tests, ten of them real. Bonferroni divides α by ${M}, giving a flat threshold of ${BONF.toFixed(4)} and ${BONF_COUNT} ${BONF_COUNT === 1 ? "discovery" : "discoveries"}. Benjamini-Hochberg lets the k-th smallest p-value go as high as k·α/${M}, a rising line, and keeps ${BH_CUT}. Both control an error rate; they control different ones, and the cost of controlling the stricter one is the findings in between.`;

export function render() {
  return plot({
    height: 330,
    marginTop: 32,
    marginLeft: 62,
    marginRight: 40,
    marginBottom: 48,
    ariaLabel: title,
    x: { label: "Rank of the p-value", labelAnchor: "center", domain: [0, 30], ticks: 5 },
    y: { label: "p-value", domain: [0, 0.05], ticks: 5 },
    marks: [
      Plot.ruleY([BONF], { stroke: ACCENT, strokeWidth: 2 }),
      // `clip` because the line is built for all 100 ranks and the x domain
      // shows 30: without it Plot draws the remaining 70 straight out of the
      // frame and across whatever the page has beside the chart.
      Plot.line(bhLine, { x: "rank", y: "t", stroke: PRIMARY, strokeWidth: 2, clip: true }),
      Plot.dot(rows, { x: "rank", y: "p", fill: MUTED, fillOpacity: 0.65, r: 3.5, clip: true }),
      Plot.dot(
        rows.filter((r) => r.rank <= BH_CUT),
        { x: "rank", y: "p", fill: PRIMARY, r: 4, clip: true },
      ),
      Plot.ruleX([BH_CUT], { stroke: GUIDE, strokeWidth: 1.5, strokeDasharray: "4,3" }),
      Plot.text([{}], {
        x: 29,
        y: BONF,
        text: () => `Bonferroni: ${BONF.toFixed(4)}, keeps ${BONF_COUNT}`,
        fill: ACCENT,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "end",
        dy: -9,
        ...HALO,
      }),
      Plot.text([{}], {
        x: 29,
        y: (29 * ALPHA) / M,
        text: () => `Benjamini-Hochberg: keeps ${BH_CUT}`,
        fill: PRIMARY,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "end",
        dy: -9,
        ...HALO,
      }),
      Plot.text([{}], {
        x: BH_CUT,
        y: 0.045,
        text: () => "everything between the\ntwo lines is a finding\none rule keeps",
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.3,
        textAnchor: "start",
        dx: 10,
        ...HALO,
      }),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
