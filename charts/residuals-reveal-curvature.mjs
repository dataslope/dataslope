/**
 * A straight fit through a saturating curve, with every residual drawn as a
 * dropped line and coloured by its sign.
 *
 * The lesson's point is that a line fitted to a curve is not merely imprecise,
 * it is wrong in a *patterned* way, and the pattern is what gives it away. A
 * plain scatter with a line through it hides that: the points are close to the
 * line, the correlation is high, and at the width a chart is actually read the
 * bend sits inside the scatter's own noise.
 *
 * Drawing the misses is what surfaces it. Every point gets a segment down to
 * the line it was fitted with, and the segment takes one of two colours by
 * whether the point sits above or below. The colours then arrive in blocks:
 * below at the left, above through the middle, below again at the right. A
 * correct model leaves those two colours interleaved at random, so blocks are
 * the signature, and no smoother or second panel is needed to see them.
 *
 * One panel rather than the textbook's fit-over-residuals pair, because a
 * residual axis is a different quantity in different units from the response,
 * and `build-charts.mjs` records one width per figure: two stacked plots is two
 * charts, not one. Encoding the residual as a mark on the fit keeps both halves
 * of the argument on one pair of axes.
 */
import { Plot, plot, ACCENT, HALO, SERIES, rng } from "./_theme.mjs";

export const title =
  "Advertising spend against sales, with a straight line fitted through a relationship that flattens out. Each point is joined to the line by a short vertical segment, coloured by whether the point sits above or below it. The colours arrive in blocks: below the line at both ends of the axis and above it through the middle.";

/** A saturating response: each extra unit of spend buys less than the last.
 *  Diminishing returns is the commonest curve in a business scatter, and the
 *  commonest one to have a straight line put through it. */
const trueMean = (x) => 62 * (1 - Math.exp(-x / 34));

const u = rng(4471);
function gauss() {
  const a = Math.max(u(), Number.EPSILON);
  const b = u();
  return Math.sqrt(-2 * Math.log(a)) * Math.cos(2 * Math.PI * b);
}

const X_MIN = 4;
const X_MAX = 120;
/** Spread evenly rather than drawn uniformly at random, so the blocks of colour
 *  are a property of the curve and not of where the sample happened to clump. */
const POINTS = Array.from({ length: 56 }, (_, i) => {
  const x = X_MIN + ((X_MAX - X_MIN) * (i + 0.5)) / 56 + gauss() * 1.4;
  return { x, y: trueMean(x) + gauss() * 2.4 };
});

function fit(rows) {
  const n = rows.length;
  const mx = rows.reduce((s, r) => s + r.x, 0) / n;
  const my = rows.reduce((s, r) => s + r.y, 0) / n;
  const slope =
    rows.reduce((s, r) => s + (r.x - mx) * (r.y - my), 0) /
    rows.reduce((s, r) => s + (r.x - mx) ** 2, 0);
  return { slope, intercept: my - slope * mx };
}

const LINE = fit(POINTS);
const predict = (x) => LINE.intercept + LINE.slope * x;
const FIT_LINE = [X_MIN, X_MAX].map((x) => ({ x, y: predict(x) }));

const ABOVE = SERIES[2];
const BELOW = SERIES[3];
const ROWS = POINTS.map((p) => {
  const r = p.y - predict(p.x);
  return { ...p, r, fitted: predict(p.x), color: r >= 0 ? ABOVE : BELOW };
});

/** How lopsided the misses are, as a number the caption can quote: the share of
 *  points in the middle third of the axis that land above the line. */
const third = (X_MAX - X_MIN) / 3;
const MIDDLE = ROWS.filter((d) => d.x > X_MIN + third && d.x < X_MAX - third);
const MIDDLE_ABOVE = Math.round((MIDDLE.filter((d) => d.r >= 0).length / MIDDLE.length) * 100);

export const caption = `A line fitted to a curve is not just imprecise, it is wrong in a *pattern*, and the pattern is the tell. Here ${MIDDLE_ABOVE}% of the points in the middle third of the axis sit above the line while both ends sit below it, which is the exact signature of fitting a straight line to something that saturates. A correct model scatters the two colours at random; blocks of one colour mean the relationship has a shape the model does not. r-squared will not tell you this, because it measures how much variance the line explains and not whether a line was the right shape. Reach for \`lowess=True\`, or transform x, rather than for a better line.`;

export function render() {
  return plot({
    height: 360,
    marginTop: 34,
    marginLeft: 56,
    marginRight: 26,
    marginBottom: 48,
    ariaLabel: title,
    x: {
      label: "Advertising spend (£k)",
      labelAnchor: "center",
      domain: [X_MIN - 4, X_MAX + 4],
      ticks: 6,
    },
    // Explicit floor so the "below" annotation has clear air under the
    // left-hand drop lines instead of landing on the x axis.
    y: { label: "Sales (£k)", domain: [0, 70], ticks: 5 },
    marks: [
      // The residual itself, as the distance it actually is on the y axis.
      Plot.ruleX(ROWS, {
        x: "x",
        y1: "fitted",
        y2: "y",
        stroke: (d) => d.color,
        strokeWidth: 1.6,
        strokeOpacity: 0.75,
      }),
      Plot.line(FIT_LINE, { x: "x", y: "y", stroke: ACCENT, strokeWidth: 2.4 }),
      Plot.dot(ROWS, { x: "x", y: "y", r: 3.1, fill: (d) => d.color }),

      Plot.text([{}], {
        x: X_MAX,
        y: predict(X_MAX),
        text: () => "the straight fit",
        fill: ACCENT,
        fontSize: 11,
        fontWeight: 600,
        textAnchor: "end",
        dy: 18,
        ...HALO,
      }),
      Plot.text([{}], {
        x: (X_MIN + X_MAX) / 2,
        y: Math.max(...MIDDLE.map((d) => d.y)),
        text: () => "the middle sits above",
        fill: ABOVE,
        fontSize: 11,
        fontWeight: 600,
        textAnchor: "middle",
        dy: -14,
        ...HALO,
      }),
      Plot.text([{}], {
        x: X_MIN + third * 0.55,
        y: 6,
        text: () => "both ends sit below",
        fill: BELOW,
        fontSize: 11,
        fontWeight: 600,
        textAnchor: "start",
        ...HALO,
      }),
    ],
  });
}
