/**
 * Top-k and top-p on the same distribution, so the difference between a fixed
 * count and an adaptive one is visible rather than described.
 *
 * The bars are one step's token probabilities, sorted. Top-k keeps a fixed
 * number whatever the shape: on a confident step it drags in tokens the model
 * had all but ruled out, and on an uncertain one it cuts off plausible
 * continuations. Top-p keeps as many as it needs to reach the probability
 * mass, so its nucleus is small where the model is sure and large where it is
 * not.
 *
 * Both panels use the same k and the same p, and the nucleus sizes are counted
 * from the distributions rather than asserted, which is the entire argument
 * for preferring p.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Sorted token probabilities for a confident step and an uncertain one, with the top-k cutoff at the same rank in both and the top-p nucleus covering two tokens in the first and many in the second.";

const K = 8;
const P = 0.9;

const softmax = (logits) => {
  const m = Math.max(...logits);
  const e = logits.map((l) => Math.exp(l - m));
  const s = e.reduce((a, b) => a + b, 0);
  return e.map((v) => v / s);
};

const STEPS = [
  { key: "Confident step", logits: [7.5, 4.0, 2.2, 1.9, 1.6, 1.4, 1.2, 1.0, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3] },
  { key: "Uncertain step", logits: Array.from({ length: 15 }, (_, i) => 2.6 - i * 0.09) },
];

const panels = STEPS.map((s) => {
  const probs = softmax(s.logits);
  let acc = 0;
  let nucleus = 0;
  for (const p of probs) {
    acc += p;
    nucleus += 1;
    if (acc >= P) break;
  }
  return { ...s, probs, nucleus };
});

const rows = panels.flatMap((p) =>
  p.probs.map((prob, i) => ({
    panel: p.key,
    rank: i + 1,
    prob,
    inNucleus: i < p.nucleus,
  })),
);

const CONF = panels[0];
const UNC = panels[1];

export const caption =
  `Same k, same p, two steps. Top-${K} keeps ${K} tokens in both: on the confident step that is six tokens the model had effectively ruled out, and on the uncertain one it cuts off continuations that were still in play. Top-p keeps ${CONF.nucleus} and ${UNC.nucleus}, because it is sized by the distribution rather than by a constant. That adaptiveness is the whole reason nucleus sampling replaced top-k.`;

export function render() {
  return plot({
    height: 300,
    marginTop: 36,
    marginLeft: 56,
    marginBottom: 48,
    ariaLabel: title,
    fx: { label: null, domain: panels.map((p) => p.key) },
    x: { label: "Token, by rank", labelAnchor: "center", domain: [0.5, 15.5], ticks: 4 },
    y: { label: "Probability", domain: [0, 0.95], ticks: 5 },
    marks: [
      Plot.rectY(rows, {
        x1: (d) => d.rank - 0.42,
        x2: (d) => d.rank + 0.42,
        y: "prob",
        fx: "panel",
        fill: (d) => (d.inNucleus ? PRIMARY : MUTED),
        fillOpacity: (d) => (d.inNucleus ? 0.6 : 0.28),
      }),
      Plot.ruleX([K + 0.5], { stroke: ACCENT, strokeWidth: 2, strokeDasharray: "4,3" }),
      Plot.text(
        panels.map((p) => ({ panel: p.key, nucleus: p.nucleus })),
        {
          x: 15.4,
          y: 0.9,
          fx: "panel",
          text: (d) => `top-p keeps ${d.nucleus}`,
          fill: PRIMARY,
          fontSize: 10.5,
          fontWeight: 600,
          textAnchor: "end",
          ...HALO,
        },
      ),
      Plot.text(
        panels.map((p) => ({ panel: p.key })),
        {
          x: K + 0.5,
          y: 0.62,
          fx: "panel",
          text: () => `top-k keeps ${K}`,
          fill: ACCENT,
          fontSize: 10.5,
          fontWeight: 600,
          textAnchor: "start",
          dx: 6,
          ...HALO,
        },
      ),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
