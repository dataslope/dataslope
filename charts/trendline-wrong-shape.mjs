/**
 * A straight trendline through a curved relationship, and the pattern it
 * leaves behind.
 *
 * `trendline="ols"` is one keyword and it always succeeds. It will fit a line
 * to a curve, to a step, to two clusters with a gap between them, and report a
 * respectable r-squared while doing it, because r-squared measures how much
 * variance the line explains and not whether a line was the right shape. The
 * fit here explains most of the variance and is wrong everywhere in a way that
 * matters: too high at both ends, too low in the middle, which is the exact
 * signature of fitting a line to something that saturates.
 *
 * The consequence is not cosmetic. A straight fit through a saturating curve
 * says every extra unit of spend buys the same lift, which is the opposite of
 * what the data says, and it is the reading that gets carried into the budget
 * meeting.
 *
 * The check costs nothing: look at where the points sit relative to the line.
 * If the misses form a shape rather than a scatter, the model is wrong, and
 * `trendline="lowess"` or a transformed x is the fix.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, PRIMARY, rng } from "./_theme.mjs";

export const title =
  "A saturating relationship with a straight least-squares line drawn through it. The line runs above the points at both ends and below them in the middle, which is the signature of the wrong shape rather than of noise.";

const N = 90;
const u = rng(3391);

const XMAX = 100;
/** Diminishing returns: the shape of nearly every spend-versus-outcome curve
 *  anyone has ever fitted a straight line to. */
const truth = (x) => 18 + 62 * (1 - Math.exp(-x / 26));

const points = Array.from({ length: N }, () => {
  const x = u() * XMAX;
  return { x, y: truth(x) + (u() + u() + u() - 1.5) * 8 };
});

/** Ordinary least squares, written out so the line in the picture is the line
 *  the maths gives and not one placed by eye. */
const n = points.length;
const mx = points.reduce((s, d) => s + d.x, 0) / n;
const my = points.reduce((s, d) => s + d.y, 0) / n;
const slope =
  points.reduce((s, d) => s + (d.x - mx) * (d.y - my), 0) /
  points.reduce((s, d) => s + (d.x - mx) ** 2, 0);
const intercept = my - slope * mx;
const fit = (x) => intercept + slope * x;

const ssTot = points.reduce((s, d) => s + (d.y - my) ** 2, 0);
const ssRes = points.reduce((s, d) => s + (d.y - fit(d.x)) ** 2, 0);
const R2 = 1 - ssRes / ssTot;

const curve = Array.from({ length: 121 }, (_, i) => {
  const x = (i / 120) * XMAX;
  return { x, y: truth(x) };
});

/** Where the line is systematically wrong, measured rather than asserted. */
const band = (lo, hi) => {
  const inside = points.filter((d) => d.x >= lo && d.x < hi);
  const bias = inside.reduce((s, d) => s + (d.y - fit(d.x)), 0) / inside.length;
  return { lo, hi, bias, mid: (lo + hi) / 2 };
};
const BANDS = [band(0, 20), band(38, 62), band(80, 100)];

export const caption = `An OLS trendline is one keyword and it always succeeds. It will fit a straight line to a curve, to a step, or to two clusters with a gap between them, and report a respectable r-squared while doing it, because r-squared measures how much variance the line explains and not whether a line was the right shape. This fit reaches ${R2.toFixed(2)} and is wrong everywhere it matters: about ${Math.abs(BANDS[0].bias).toFixed(0)} too high at the left, ${Math.abs(BANDS[1].bias).toFixed(0)} too low in the middle, ${Math.abs(BANDS[2].bias).toFixed(0)} too high at the right. That is not noise, it is a shape, and it is the signature of a line fitted to something that saturates. The reading it produces, "every extra unit of spend buys the same lift", is the opposite of what the data says and the one that reaches the budget meeting. The check costs nothing: if the misses form a pattern rather than a scatter, switch to a lowess fit or transform x.`;

export function render() {
  return plot({
    height: 330,
    marginTop: 24,
    marginLeft: 50,
    marginRight: 26,
    marginBottom: 46,
    ariaLabel: title,
    x: { label: "Spend (thousands)", labelAnchor: "center", domain: [0, XMAX], ticks: 5 },
    y: { label: "Conversions", domain: [0, 105], ticks: 4 },
    marks: [
      // The bands where the residuals share a sign.
      Plot.rect(BANDS, {
        x1: "lo",
        x2: "hi",
        y1: 0,
        y2: 105,
        fill: ACCENT,
        fillOpacity: 0.07,
      }),
      Plot.dot(points, { x: "x", y: "y", r: 3.2, fill: PRIMARY, fillOpacity: 0.55 }),
      Plot.line(curve, {
        x: "x",
        y: "y",
        stroke: GUIDE,
        strokeWidth: 1.6,
        strokeDasharray: "5 4",
      }),
      Plot.link([{}], {
        x1: 0,
        x2: XMAX,
        y1: fit(0),
        y2: fit(XMAX),
        stroke: ACCENT,
        strokeWidth: 2.1,
      }),
      Plot.text(BANDS, {
        x: "mid",
        y: 8,
        text: (d) => (d.bias > 0 ? `line ${d.bias.toFixed(0)} low` : `line ${(-d.bias).toFixed(0)} high`),
        fill: ACCENT,
        fontSize: 10,
        fontWeight: 600,
        textAnchor: "middle",
        ...HALO,
      }),
      // A two-line key in the empty top-left corner. The line and the curve
      // converge on the right, so a label on either one lands on the other.
      // Two marks, not one: strokeDasharray is a constant option rather than a
      // channel, so it cannot vary per row.
      Plot.link([{}], {
        x1: 2,
        x2: 9,
        y1: 100,
        y2: 100,
        stroke: ACCENT,
        strokeWidth: 2,
      }),
      Plot.link([{}], {
        x1: 2,
        x2: 9,
        y1: 92,
        y2: 92,
        stroke: GUIDE,
        strokeWidth: 2,
        strokeDasharray: "5 4",
      }),
      Plot.text([{}], {
        x: 11,
        y: 100,
        text: () => `straight fit, r² = ${R2.toFixed(2)}`,
        fill: ACCENT,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "start",
        ...HALO,
      }),
      Plot.text([{}], {
        x: 11,
        y: 92,
        text: () => "what the points actually do",
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
