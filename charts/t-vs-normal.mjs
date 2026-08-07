/**
 * Why the t-table has more than one row: with σ estimated from a small sample,
 * the test statistic has heavier tails than the normal, so the bar for
 * "significant" moves further out.
 *
 * The four densities are nearly indistinguishable near the peak, which is why
 * the *critical values* are the subject rather than the curves. Each vertical
 * mark is the two-sided 95% cutoff for its distribution, and reading them left
 * to right is the whole lesson: 1.96 for the normal, essentially the same at
 * 30 degrees of freedom, and more than double that at 2.
 *
 * Originally drawn as two facets, a full view and a magnified tail. That does
 * not work: Plot facets share every scale, so the "magnified" panel was the
 * same tail at the same size, just moved right. See the note on plot() in
 * _theme.mjs.
 */
import { Plot, plot, linspace, sidedText, HALO, MUTED, SERIES } from "./_theme.mjs";

export const title =
  "Three t-distributions with 2, 5 and 30 degrees of freedom drawn over the standard normal, with each distribution's two-sided 95% critical value marked. The cutoff is 1.96 for the normal, 2.04 at 30 degrees of freedom, 2.57 at 5, and 4.30 at 2.";

export const caption =
  "The t-distribution is a normal that does not quite trust its own estimate of σ. With few degrees of freedom the tails thicken and the bar for significance moves out; by df = 30 it has all but caught up with 1.96.";

// Γ via Lanczos, which is all `tPdf` needs and keeps this file dependency-free.
const G = [
  676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
  12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
];
function gamma(z) {
  if (z < 0.5) return Math.PI / (Math.sin(Math.PI * z) * gamma(1 - z));
  z -= 1;
  let x = 0.99999999999980993;
  for (let i = 0; i < G.length; i++) x += G[i] / (z + i + 1);
  const t = z + G.length - 0.5;
  return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
}

const tPdf = (x, df) =>
  (gamma((df + 1) / 2) / (Math.sqrt(df * Math.PI) * gamma(df / 2))) *
  Math.pow(1 + (x * x) / df, -(df + 1) / 2);

const normalPdfLocal = (x) => Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);

const DOMAIN = [-5, 5];
const XS = linspace(DOMAIN[0], DOMAIN[1], 201);

// Two-sided 95% cutoffs. Table values, quoted rather than computed: inverting
// the t CDF would be forty lines of numerics for four constants.
const CURVES = [
  { label: "df = 2", df: 2, crit: 4.303, color: SERIES[5], row: 3 },
  { label: "df = 5", df: 5, crit: 2.571, color: SERIES[1], row: 2 },
  { label: "df = 30", df: 30, crit: 2.042, color: SERIES[0], row: 1 },
  { label: "normal", df: null, crit: 1.96, color: MUTED, row: 0 },
];

const PEAK = normalPdfLocal(0);
/** Height of the i-th critical-value mark, as a multiple of the peak. The
 *  four cutoffs are labelled on separate rows because 1.96 and 2.04 are 2% of
 *  the axis apart and would otherwise print on top of each other. */
const rowY = (row) => PEAK * (0.30 + row * 0.16);

const density = (c) =>
  XS.map((x) => ({ label: c.label, x, y: c.df === null ? normalPdfLocal(x) : tPdf(x, c.df) }));

const curves = CURVES.flatMap(density);
const COLOR = Object.fromEntries(CURVES.map((c) => [c.label, c.color]));

export function render() {
  return plot({
    height: 350,
    marginTop: 26,
    marginLeft: 30,
    ariaLabel: title,
    x: { label: "Test statistic", labelAnchor: "center", domain: DOMAIN, ticks: 6 },
    y: { label: null, ticks: [], grid: false, domain: [0, PEAK * 1.1] },
    marks: [
      // Two marks, because `strokeDasharray` is a constant option rather than
      // a channel: the reference normal is dashed, the three t curves solid.
      Plot.lineY(curves.filter((d) => d.label !== "normal"), {
        x: "x",
        y: "y",
        z: "label",
        stroke: (d) => COLOR[d.label],
        strokeWidth: 2,
      }),
      Plot.lineY(curves.filter((d) => d.label === "normal"), {
        x: "x",
        y: "y",
        stroke: MUTED,
        strokeWidth: 1.75,
        strokeDasharray: "4,3",
      }),

      // The cutoffs. Drawn on the right tail only; the left is its mirror and
      // repeating it would double the ink for no extra information.
      Plot.ruleX(CURVES, {
        x: "crit",
        y1: 0,
        y2: (d) => rowY(d.row),
        stroke: (d) => d.color,
        strokeWidth: 1.5,
      }),
      Plot.dot(CURVES, {
        x: "crit",
        y: (d) => rowY(d.row),
        r: 3,
        fill: (d) => d.color,
        stroke: null,
      }),
      // df = 2's cutoff sits close to the right edge, so its label turns
      // inward rather than running off the frame.
      ...sidedText(
        CURVES,
        {
          side: (d) => (d.crit > 3.5 ? "end" : "start"),
          x: "crit",
          y: (d) => rowY(d.row),
          text: (d) => `${d.label}   t* = ${d.crit.toFixed(2)}`,
          fill: (d) => d.color,
          fontSize: 12.5,
          fontWeight: 600,
          ...HALO,
        },
        { start: { dx: 10 }, end: { dx: -10 } },
      ),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
