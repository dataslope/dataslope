/**
 * Three scatters and two coefficients, and the disagreement tells you the
 * shape.
 *
 * Pearson's r measures how close the points are to a *straight line*.
 * Spearman's rho replaces every value by its rank and measures Pearson's r on
 * the ranks, so it measures how close the relationship is to *monotone*: does
 * y always go the same way as x, whether or not it does so at a constant rate.
 *
 * Reading the two together is more useful than reading either alone, because
 * the gap between them is diagnostic:
 *
 *   • **rho much higher than r**: the relationship is real and *curved*. Every
 *     point is in the right order and the line is the wrong shape. Fit a curve,
 *     or transform a variable, and do not report "weak correlation";
 *   • **r much higher than rho**: something is inflating the linear fit that
 *     the ranks do not see, and it is almost always one or two extreme points.
 *     Ranks cannot be extreme, which is exactly why rho ignores them;
 *   • **both high, both similar**: linear and monotone, which is the case
 *     everybody assumes they are in.
 *
 * The middle panel is the one that catches people. A single point in the
 * far corner takes Pearson's r from near zero to respectable, and nothing else
 * in the cloud has changed. That point is not evidence of a relationship, it is
 * evidence of a point.
 *
 * Neither coefficient says anything about the *slope*, and neither says
 * anything about cause. Both are unitless numbers between minus one and one
 * describing how tidy a pattern is.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY, mean, normalSamples, rng } from "./_theme.mjs";
import { panel, panelAxis, panelSpace, panelTitle } from "./_panels.mjs";

export const title =
  "Three scatters with Pearson's r and Spearman's rho on each: a curved but perfectly ordered relationship where rho is far higher, a flat cloud with one extreme point where r is far higher, and a clean linear one where they agree.";

const N = 90;
const u = rng(2_909);
const NOISE = normalSamples(N, 0, 1, 5_105);

/** Exponential rather than saturating: the points hug the floor until the far
 *  right and then climb steeply, which is monotone and about as far from
 *  linear as a clean relationship gets. */
const CURVED = Array.from({ length: N }, (_, i) => {
  const x = 4 + u() * 88;
  const raw = (Math.exp(0.055 * x) - 1) / (Math.exp(0.055 * 92) - 1);
  return { x, y: 3 + 94 * raw + NOISE[i] * 2.4 };
});

const OUTLIER = (() => {
  const v = Array.from({ length: N - 1 }, (_, i) => ({ x: 4 + u() * 46, y: 20 + NOISE[i] * 7 }));
  return [...v, { x: 90, y: 92 }];
})();

const CLEAN = Array.from({ length: N }, (_, i) => {
  const x = 4 + u() * 88;
  return { x, y: 8 + 0.86 * x + NOISE[i] * 7 };
});

const pearson = (rows) => {
  const mx = mean(rows.map((d) => d.x));
  const my = mean(rows.map((d) => d.y));
  let n = 0;
  let dx = 0;
  let dy = 0;
  for (const d of rows) {
    n += (d.x - mx) * (d.y - my);
    dx += (d.x - mx) ** 2;
    dy += (d.y - my) ** 2;
  }
  return n / Math.sqrt(dx * dy);
};
const ranks = (values) => {
  const order = values.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
  const out = new Array(values.length);
  order.forEach((d, r) => {
    out[d.i] = r + 1;
  });
  return out;
};
const spearman = (rows) => {
  const rx = ranks(rows.map((d) => d.x));
  const ry = ranks(rows.map((d) => d.y));
  return pearson(rx.map((x, i) => ({ x, y: ry[i] })));
};

const CASES = [
  { key: "Curved but ordered", rows: CURVED, color: PRIMARY },
  { key: "Flat, plus one point", rows: OUTLIER, color: ACCENT },
  { key: "Linear and clean", rows: CLEAN, color: PRIMARY },
].map((c) => ({ ...c, r: pearson(c.rows), rho: spearman(c.rows) }));

const D = [0, 100];
const PANELS = CASES.map((_, k) => panel(k, { x: D, y: D }));

const OUT_CASE = CASES[1];
const WITHOUT = pearson(OUTLIER.slice(0, -1));

export const caption = `Three scatters with both coefficients. The first is curved and monotone (rho ${CASES[0].rho.toFixed(2)} against r ${CASES[0].r.toFixed(2)}); the second has r ${OUT_CASE.r.toFixed(2)} against rho ${OUT_CASE.rho.toFixed(2)}, and removing its one corner point takes r to ${WITHOUT.toFixed(2)}.`;

export function render() {
  return plot({
    height: 300,
    marginTop: 26,
    marginLeft: 38,
    marginRight: 20,
    marginBottom: 52,
    ariaLabel: title,
    ...panelSpace(3),
    marks: [
      ...CASES.flatMap((c, k) => {
        const p = PANELS[k];
        return [
          panelTitle(p, c.key, { fill: c.color, fontSize: 11 }),
          ...panelAxis(p, { ticks: [0, 50, 100], rules: false }),
          Plot.dot(
            c.rows.map((d) => ({ ...d, px: p.px(d.x), py: p.py(d.y) })),
            {
              x: "px",
              y: "py",
              r: 2.8,
              fill: c.color,
              fillOpacity: 0.55,
              clip: true,
            },
          ),
          Plot.text([{}], {
            x: (p.left + p.right) / 2,
            y: p.bottom,
            text: () => `r = ${c.r.toFixed(2)}\nrho = ${c.rho.toFixed(2)}`,
            fill: c.color,
            fontSize: 11.5,
            fontWeight: 700,
            lineHeight: 1.45,
            textAnchor: "middle",
            dy: 24,
            ...HALO,
          }),
        ];
      }),
      Plot.dot([{}], {
        x: PANELS[1].px(90),
        y: PANELS[1].py(92),
        r: 7,
        fill: "none",
        stroke: ACCENT,
        strokeWidth: 1.8,
      }),
      Plot.text([{}], {
        x: PANELS[1].px(90),
        y: PANELS[1].py(92),
        text: () => `remove this one\nand r is ${WITHOUT.toFixed(2)}`,
        fill: ACCENT,
        fontSize: 10,
        fontWeight: 700,
        lineHeight: 1.35,
        textAnchor: "end",
        dx: -10,
        ...HALO,
      }),
    ],
  });
}
