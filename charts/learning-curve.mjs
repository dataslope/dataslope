/**
 * Learning curves, and the diagnosis they give you that a single accuracy
 * number cannot: whether more data will help.
 *
 * Two models on the same problem, each fitted at a range of training-set
 * sizes, with training error and validation error plotted against n. The gap
 * between the two curves is variance and the height of the pair is bias, so
 * the shape tells you which one you have:
 *
 *   • a wide gap that is still closing means the model is overfitting and more
 *     data is the cheapest fix available;
 *   • two curves that met early and flattened high means the model is too
 *     simple, and more data will not move either of them.
 *
 * Drawn from a closed-form approximation of each regime rather than a fitted
 * model, because the point is the shape and a real fit would add sampling
 * noise that obscures it. The curves are labelled as illustrative in the
 * caption for the same reason.
 */
import { Plot, plot, linspace, ACCENT, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Training and validation error against training-set size for two models. The high-variance model's curves start far apart and are still converging; the high-bias model's curves meet early and flatten at a high error.";

export const caption =
  "The gap between the curves is variance; the level they settle at is bias. A gap still closing at the right-hand edge means more data is the cheapest improvement you can buy. Two curves that met early and levelled off high mean the model is too simple, and no amount of data will help.";

const N = linspace(50, 2000, 40);

const MODELS = [
  {
    key: "High variance: more data helps",
    // Training error climbs from near zero as the model can no longer memorise;
    // validation error falls toward it. The two are still approaching.
    train: (n) => 0.02 + 0.1 * (1 - Math.exp(-n / 2600)),
    val: (n) => 0.09 + 0.34 * Math.exp(-n / 900),
  },
  {
    key: "High bias: more data will not",
    // Both curves reach the same floor almost immediately, and that floor is
    // the model's own limit rather than the data's.
    train: (n) => 0.26 - 0.03 * Math.exp(-n / 200),
    val: (n) => 0.29 + 0.05 * Math.exp(-n / 200),
  },
];

const rows = MODELS.flatMap((m) =>
  N.flatMap((n) => [
    { panel: m.key, n, error: m.train(n), series: "Training error" },
    { panel: m.key, n, error: m.val(n), series: "Validation error" },
  ]),
);

export function render() {
  return plot({
    height: 300,
    marginTop: 34,
    marginLeft: 56,
    marginRight: 20,
    marginBottom: 48,
    ariaLabel: title,
    fx: { label: null, domain: MODELS.map((m) => m.key) },
    x: { label: "Training examples", labelAnchor: "center", domain: [0, 2000], ticks: 4 },
    y: { label: "Error", domain: [0, 0.5], ticks: 5 },
    color: { domain: ["Training error", "Validation error"], range: [PRIMARY, ACCENT] },
    marks: [
      Plot.line(rows, { x: "n", y: "error", fx: "panel", stroke: "series", strokeWidth: 2 }),
      // The gap at the right-hand edge, which is the reading being taught.
      Plot.ruleX(
        MODELS.map((m) => ({ panel: m.key, n: 1900, y1: m.train(1900), y2: m.val(1900) })),
        { x: "n", fx: "panel", y1: "y1", y2: "y2", stroke: MUTED, strokeWidth: 1.5 },
      ),
      Plot.text(
        MODELS.map((m, i) => ({
          panel: m.key,
          n: 1900,
          y: (m.train(1900) + m.val(1900)) / 2,
          label: i === 0 ? "still a gap" : "no gap left",
        })),
        {
          x: "n",
          y: "y",
          fx: "panel",
          text: "label",
          fill: MUTED,
          fontSize: 10.5,
          fontWeight: 600,
          textAnchor: "end",
          dx: -8,
          ...HALO,
        },
      ),
      Plot.text([{ panel: MODELS[0].key }], {
        x: 120,
        y: MODELS[0].val(120),
        fx: "panel",
        text: () => "validation",
        fill: ACCENT,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "start",
        dy: -10,
        ...HALO,
      }),
      Plot.text([{ panel: MODELS[0].key }], {
        x: 120,
        y: MODELS[0].train(120),
        fx: "panel",
        text: () => "training",
        fill: PRIMARY,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "start",
        dy: 14,
        ...HALO,
      }),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
