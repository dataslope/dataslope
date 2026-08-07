/**
 * What temperature does to a softmax, on one set of scores.
 *
 * The model produces the same logits every time; temperature only changes how
 * they are turned into probabilities. Divide by a small number and the gaps
 * between scores are magnified, so the top token takes almost all the mass and
 * the output is near-deterministic. Divide by a large one and the gaps shrink
 * toward nothing, so the distribution flattens and unlikely tokens start
 * getting picked.
 *
 * At T = 0 the limit is a point mass on the argmax, which is why "temperature
 * zero" and "greedy decoding" are the same thing. At high T the limit is the
 * uniform distribution, which is why turning it up far enough produces noise
 * rather than creativity.
 *
 * Faceted legitimately: every panel is a probability over the same six tokens.
 */
import { Plot, plot, HALO, MUTED, PRIMARY, SERIES } from "./_theme.mjs";

export const title =
  "The same four token scores turned into probabilities at three temperatures. At 0.3 the top token takes almost all the mass; at 1.0 the distribution is uneven but spread; at 2.0 all four are close to equal.";

export const caption =
  "The scores never change; temperature only changes how they are turned into probabilities. Low temperature magnifies the gaps until the top token wins every time, and high temperature flattens them until the choice is nearly a coin toss.";

const TOKENS = ["the", "a", "this", "some"];
const LOGITS = [3.2, 2.4, 1.6, 0.5];

const TEMPERATURES = [0.3, 1.0, 2.0];

/** Softmax at a given temperature: exp(logit / T), normalised. */
function softmax(logits, t) {
  const scaled = logits.map((l) => Math.exp(l / t));
  const total = scaled.reduce((s, v) => s + v, 0);
  return scaled.map((v) => v / total);
}

const bars = TEMPERATURES.flatMap((t) => {
  const probs = softmax(LOGITS, t);
  return TOKENS.map((token, i) => ({
    panel: `T = ${t.toFixed(1)}`,
    token,
    p: probs[i],
    top: i === 0,
  }));
});

// Quoted in the annotations, so the numbers can never disagree with the bars.
const topShare = (t) => softmax(LOGITS, t)[0];

export function render() {
  return plot({
    height: 300,
    marginTop: 34,
    marginLeft: 50,
    marginBottom: 52,
    ariaLabel: title,
    fx: { label: null, domain: TEMPERATURES.map((t) => `T = ${t.toFixed(1)}`) },
    x: { label: null, domain: TOKENS, padding: 0.22 },
    y: { label: "Probability", domain: [0, 1], ticks: 4, tickFormat: "%" },
    marks: [
      Plot.barY(bars, {
        x: "token",
        y: "p",
        fx: "panel",
        fill: (d) => (d.top ? SERIES[1] : PRIMARY),
        fillOpacity: 0.55,
      }),
      Plot.text(
        TEMPERATURES.map((t) => ({
          panel: `T = ${t.toFixed(1)}`,
          share: topShare(t),
          // The band value has to be a field on the datum: a literal string in
          // `x` is read as a field name, resolves to undefined, and the mark
          // silently disappears.
          token: TOKENS[0],
        })),
        {
          x: "token",
          y: 0.95,
          fx: "panel",
          text: (d) => `top token: ${Math.round(d.share * 100)}%`,
          fill: MUTED,
          fontSize: 11.5,
          fontWeight: 600,
          textAnchor: "start",
          ...HALO,
        },
      ),
      Plot.ruleY([0], { fx: "panel", stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
