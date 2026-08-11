/**
 * The point that ruins a regression is rarely the one that looks wrong.
 *
 * A scatter with a fitted line makes *residuals* visible: a point far from the
 * line is obvious, and everyone spots it. It does not make *leverage* visible,
 * and leverage is the dangerous half.
 *
 * Leverage is a fact about x alone. A point sitting far out along the x axis
 * pulls harder on the slope than a point in the middle, in the literal sense
 * that moving it a unit vertically moves the fitted line further. A point out
 * there with a *small* residual is not innocent: it has a small residual
 * because the line went to meet it.
 *
 * Cook's distance combines the two, and this chart plots the two against each
 * other so the combination can be read off:
 *
 *   • **Big residual, low leverage** is an outlier in the ordinary sense. It
 *     is visible, it inflates the residual standard error, and it moves the
 *     fit hardly at all.
 *   • **Small residual, high leverage** is invisible on the scatter and moves
 *     the fit a lot. This is the one to fear.
 *   • **Both** is the point that changes the story on its own, and it is the
 *     one whose deletion the reader is entitled to hear about.
 *
 * The practical habit is not "delete influential points". It is to fit twice,
 * with and without, and to say so if the two fits disagree. A point that
 * changes the conclusion is a finding about the data, not a nuisance to be
 * cleaned out of it.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, PRIMARY, linspace, normalSamples, rng } from "./_theme.mjs";

export const title =
  "Standardised residual against leverage for a fitted regression, with Cook's distance contours. Points at the top of the plot are visible on a scatter; points at the right of it move the fitted line, and can sit close to it precisely because they moved it.";

const N = 30;
const u = rng(8_812);
const E = normalSamples(N, 0, 2.6, 4_405);

const line = (x) => 12 + 1.9 * x;

/** An ordinary sample, plus three points chosen to sit in three different
 *  corners of the diagnostic. */
const BASE = Array.from({ length: N }, (_, i) => {
  const x = 3 + u() * 10;
  return { id: `p${i}`, x, y: line(x) + E[i] };
});
const SPECIALS = [
  { id: "outlier", x: 8.2, y: line(8.2) + 8.6, label: "big residual,\nlow leverage" },
  { id: "hidden", x: 19, y: line(19) + 3.6, label: "small residual,\nhigh leverage" },
  { id: "both", x: 17.5, y: line(17.5) - 8, label: "both: this one\nchanges the story" },
];
const ROWS = [...BASE, ...SPECIALS];

/** Simple-regression leverage and standardised residuals, straight from the
 *  definitions, so nothing here has to be taken on trust. */
const DIAG = (() => {
  const n = ROWS.length;
  const mx = ROWS.reduce((s, d) => s + d.x, 0) / n;
  const my = ROWS.reduce((s, d) => s + d.y, 0) / n;
  const sxx = ROWS.reduce((s, d) => s + (d.x - mx) ** 2, 0);
  const b = ROWS.reduce((s, d) => s + (d.x - mx) * (d.y - my), 0) / sxx;
  const a = my - b * mx;
  const resid = ROWS.map((d) => d.y - (a + b * d.x));
  const h = ROWS.map((d) => 1 / n + (d.x - mx) ** 2 / sxx);
  const sigma = Math.sqrt(resid.reduce((s, r) => s + r * r, 0) / (n - 2));
  return ROWS.map((d, i) => {
    const std = resid[i] / (sigma * Math.sqrt(1 - h[i]));
    return {
      ...d,
      h: h[i],
      std,
      // Cook's distance for a two-parameter fit.
      cook: (std * std * h[i]) / (2 * (1 - h[i])),
    };
  });
})();

const H_MAX = 0.34;
const S_MAX = 4.2;

/** Contours of constant Cook's distance, solved for the residual at each
 *  leverage: D = std² h / (p(1 - h)), so std = ±√(D p (1 - h) / h). */
const contour = (D, sign) =>
  linspace(0.035, H_MAX, 90)
    .map((h) => ({ h, std: sign * Math.sqrt((D * 2 * (1 - h)) / h) }))
    .filter((d) => Math.abs(d.std) <= S_MAX);

const LEVELS = [0.5, 1];
const named = (id) => DIAG.find((d) => d.id === id);
const HIDDEN = named("hidden");
const OUTLIER = named("outlier");
const BOTH = named("both");
const LEV_RATIO = (HIDDEN.h / OUTLIER.h).toFixed(0);
const INFLUENCE_RATIO = (HIDDEN.cook / OUTLIER.cook).toFixed(0);

export const caption = `A scatter with a fitted line makes residuals visible and leverage invisible, and leverage is the dangerous half. Leverage is a fact about x alone: a point far out along the x axis pulls harder on the slope, in the literal sense that moving it one unit vertically moves the line further. So a far-out point with a *small* residual is not innocent, it has a small residual because the line went to meet it. Plotting the two against each other separates three cases. The point at the top left has a standardised residual of ${OUTLIER.std.toFixed(1)} and leverage of ${OUTLIER.h.toFixed(2)}: an outlier in the ordinary sense, obvious on any scatter, inflating the residual standard error and moving the fit almost not at all, with Cook's distance ${OUTLIER.cook.toFixed(2)}. The point on the right has a smaller residual, ${HIDDEN.std.toFixed(1)}, and ${LEV_RATIO} times the leverage, which puts its Cook's distance at ${HIDDEN.cook.toFixed(2)}: it moves the fitted line about ${INFLUENCE_RATIO} times as much as the obvious outlier does, and it is the one nobody would circle on a scatter. The third has both, a Cook's distance of ${BOTH.cook.toFixed(1)}, and is capable of changing the conclusion by itself. The habit that follows is not "delete influential points". It is to fit twice, with and without, and to report it when the two fits disagree, because a point that changes the conclusion is a finding about the data rather than a nuisance to be cleaned out of it.`;

export function render() {
  return plot({
    height: 340,
    marginTop: 30,
    marginLeft: 56,
    marginRight: 96,
    marginBottom: 52,
    ariaLabel: title,
    x: {
      label: "Leverage",
      labelAnchor: "center",
      domain: [0, H_MAX],
      ticks: [0, 0.1, 0.2, 0.3],
    },
    y: {
      label: "Standardised residual",
      domain: [-S_MAX, S_MAX],
      ticks: [-4, -2, 0, 2, 4],
    },
    marks: [
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
      ...LEVELS.flatMap((D) =>
        [1, -1].map((sign) =>
          Plot.line(contour(D, sign), {
            x: "h",
            y: "std",
            stroke: GUIDE,
            strokeWidth: 1.2,
            strokeDasharray: D === 1 ? "5,3" : "2,3",
            clip: true,
          }),
        ),
      ),
      ...LEVELS.map((D) =>
        Plot.text([{ h: H_MAX, std: Math.sqrt((D * 2 * (1 - H_MAX)) / H_MAX) }], {
          x: "h",
          y: "std",
          text: () => `Cook's D = ${D}`,
          fill: GUIDE,
          fontSize: 10,
          fontWeight: 700,
          textAnchor: "start",
          dx: 6,
          ...HALO,
        }),
      ),

      Plot.dot(
        DIAG.filter((d) => !d.label),
        { x: "h", y: "std", r: 3.2, fill: MUTED, fillOpacity: 0.6, clip: true },
      ),
      Plot.dot(
        DIAG.filter((d) => d.label),
        { x: "h", y: "std", r: 5.4, fill: ACCENT, fillOpacity: 0.9 },
      ),
      Plot.text([OUTLIER], {
        x: "h",
        y: "std",
        text: "label",
        fill: ACCENT,
        fontSize: 10,
        fontWeight: 700,
        lineHeight: 1.35,
        textAnchor: "start",
        dx: 10,
        ...HALO,
      }),
      Plot.text([HIDDEN], {
        x: "h",
        y: "std",
        text: "label",
        fill: ACCENT,
        fontSize: 10,
        fontWeight: 700,
        lineHeight: 1.35,
        textAnchor: "middle",
        dy: -22,
        ...HALO,
      }),
      Plot.text([BOTH], {
        x: "h",
        y: "std",
        text: "label",
        fill: ACCENT,
        fontSize: 10,
        fontWeight: 700,
        lineHeight: 1.35,
        textAnchor: "middle",
        dy: -24,
        ...HALO,
      }),

      Plot.text([{}], {
        x: 0.012,
        y: 3.9,
        text: () => "visible on a scatter",
        fill: MUTED,
        fontSize: 10,
        fontWeight: 700,
        textAnchor: "start",
        ...HALO,
      }),
      Plot.text([{}], {
        x: H_MAX - 0.005,
        y: -3.9,
        text: () => "moves the fitted line",
        fill: PRIMARY,
        fontSize: 10,
        fontWeight: 700,
        textAnchor: "end",
        ...HALO,
      }),
    ],
  });
}
