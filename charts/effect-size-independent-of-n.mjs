/**
 * One true difference, one sweep of the sample size, and two numbers that
 * behave completely differently.
 *
 * The population here never changes: two groups whose means differ by a fifth
 * of a standard deviation, which is a small but real effect. The only thing
 * being varied is how many observations we collect.
 *
 * The p-value falls off a cliff. At n = 20 the study is hopeless; by n = 2,000
 * the same effect is significant at any threshold you like; by n = 10,000 the
 * p-value is too small to plot. Nothing about the world changed. What changed
 * is how confidently we can rule out "exactly zero", and "exactly zero" was
 * never a serious hypothesis about two real groups.
 *
 * Cohen's d does not move. It is the difference in units of the spread, so it
 * describes the *populations* rather than the study, and collecting more data
 * makes the estimate of it less noisy without shifting where it sits.
 *
 * This is the whole reason effect sizes are reported. A p-value answers "could
 * this be nothing?", which stops being interesting at large n, because at large
 * n almost nothing is exactly nothing. An effect size answers "how big is it?",
 * which is the question that decides whether anybody should act. The two are
 * routinely confused because both come out of the same test, and the confusion
 * runs in one direction: a significant result at large n is reported as though
 * it were an important one.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, PRIMARY } from "./_theme.mjs";
import { panel, panelAxis, panelBaseline, panelSpace, panelTitle } from "./_panels.mjs";

export const title =
  "One fixed population difference of 0.2 standard deviations, with the sample size swept from 10 to 2,000. The p-value collapses from about 0.6 to one in a billion while Cohen's d stays flat at 0.2.";

const D = 0.2;
// Stops at 2,000 because past that the p-value leaves the bottom of any
// axis worth drawing, and a run of points pinned to the floor reads as a
// plateau rather than as a collapse.
const SIZES = [10, 20, 50, 100, 200, 500, 1000, 2000];

/** Normal-approximation p-value for a two-sample z at effect size d and equal
 *  group sizes n, which is exact enough at every n on this axis. */
const normalTail = (z) => {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const poly = t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI) * poly;
};
const ROWS = SIZES.map((n) => {
  const z = D * Math.sqrt(n / 2);
  return { n, p: Math.max(2 * normalTail(z), 1e-10), d: D };
});

const CROSS = ROWS.find((r) => r.p < 0.05);

const P = panel(0, { x: [10, 2000], y: [1e-10, 1], xType: "log", yType: "log" });
const DP = panel(1, { x: [10, 2000], y: [0, 0.4], xType: "log" });

const pRow = ROWS.map((r) => ({ ...r, x: P.px(r.n), y: P.py(r.p) }));
const dRow = ROWS.map((r) => ({ ...r, x: DP.px(r.n), y: DP.py(r.d) }));
const N_TICKS = [10, 100, 1000];

export const caption = `One population, two groups whose means differ by 0.2 of a standard deviation, and nothing varied but the sample size. The p-value crosses 0.05 at about n = ${CROSS.n} per group and reaches one in a billion by two thousand; Cohen's d sits at ${D} throughout.`;

export function render() {
  return plot({
    height: 320,
    marginTop: 26,
    marginLeft: 52,
    marginRight: 18,
    marginBottom: 48,
    ariaLabel: title,
    ...panelSpace(2),
    marks: [
      ...panelAxis(P, {
        ticks: [1e-9, 1e-6, 1e-3, 1],
        format: (v) => (v === 1 ? "1" : `10${{ 3: "⁻³", 6: "⁻⁶", 9: "⁻⁹" }[Math.round(-Math.log10(v))]}`),
      }),
      ...panelAxis(DP, { ticks: [0, 0.1, 0.2, 0.3, 0.4], format: (v) => v.toFixed(1) }),
      panelTitle(P, "p-value", { fill: ACCENT }),
      panelTitle(DP, "Cohen's d", { fill: PRIMARY }),
      panelBaseline(DP),

      Plot.link([{}], {
        x1: P.left,
        x2: P.right,
        y1: P.py(0.05),
        y2: P.py(0.05),
        stroke: GUIDE,
        strokeWidth: 1.3,
        strokeDasharray: "4,3",
      }),
      Plot.text([{}], {
        x: P.left,
        y: P.py(0.05),
        text: () => "0.05",
        fill: MUTED,
        fontSize: 10,
        fontWeight: 600,
        textAnchor: "start",
        dx: 4,
        dy: -7,
        ...HALO,
      }),
      Plot.line(pRow, { x: "x", y: "y", stroke: ACCENT, strokeWidth: 2.2 }),
      Plot.dot(pRow, { x: "x", y: "y", r: 3.2, fill: ACCENT }),
      Plot.line(dRow, { x: "x", y: "y", stroke: PRIMARY, strokeWidth: 2.2 }),
      Plot.dot(dRow, { x: "x", y: "y", r: 3.2, fill: PRIMARY }),

      ...[P, DP].map((p) =>
        Plot.text(
          N_TICKS.map((n) => ({ n, x: p.px(n) })),
          {
            x: "x",
            y: p.bottom,
            text: (d) => (d.n >= 1000 ? `${d.n / 1000}k` : String(d.n)),
            fill: "currentColor",
            fillOpacity: 0.55,
            fontSize: 10,
            textAnchor: "middle",
            dy: 14,
          },
        ),
      ),
      ...[P, DP].map((p) =>
        Plot.text([{}], {
          x: (p.left + p.right) / 2,
          y: p.bottom,
          text: () => "observations per group (log)",
          fill: MUTED,
          fontSize: 10,
          fontWeight: 600,
          textAnchor: "middle",
          dy: 32,
          ...HALO,
        }),
      ),
      Plot.text([{}], {
        x: DP.px(300),
        y: DP.py(D),
        text: () => "the effect never changed",
        fill: PRIMARY,
        fontSize: 10.5,
        fontWeight: 700,
        textAnchor: "middle",
        dy: -12,
        ...HALO,
      }),
    ],
  });
}
