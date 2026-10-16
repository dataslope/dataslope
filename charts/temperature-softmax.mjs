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
 * The tokens, logits and temperatures are the ones the temperature code block
 * in how-llms-work/sampling uses, so every bar is a number that block prints.
 * Change them together.
 *
 * Faceted legitimately: every panel is a probability over the same four tokens.
 */
import { Plot, plot, HALO, MUTED, PRIMARY, SERIES } from "./_theme.mjs";

export const title =
  "The scores for cat, dog, bird and rock turned into probabilities at four temperatures. At 0.2 cat takes almost all the mass; at 0.7 and 1.0 it still leads while the others keep a share; at 2.0 the distribution is flatter and even rock gets a real chance.";

export const caption =
  "The scores never change; temperature only changes how they are turned into probabilities. Low temperature magnifies the gaps until the top token wins nearly every time, and high temperature shrinks them so the long tail gets a real chance.";

const TOKENS = ["cat", "dog", "bird", "rock"];
const LOGITS = [3.2, 2.1, 1.5, -0.4];

const TEMPERATURES = [0.2, 0.7, 1.0, 2.0];

/** Softmax at a given temperature: exp(logit / T), normalised, with the
 *  maximum subtracted first exactly as the lesson's `softmax` does. */
function softmax(logits, t) {
  const scaled = logits.map((l) => l / t);
  const max = Math.max(...scaled);
  const exps = scaled.map((v) => Math.exp(v - max));
  const total = exps.reduce((s, v) => s + v, 0);
  return exps.map((v) => v / total);
}

const panel = (t) => `T = ${t.toFixed(1)}`;

const bars = TEMPERATURES.flatMap((t) => {
  const probs = softmax(LOGITS, t);
  return TOKENS.map((token, i) => ({
    panel: panel(t),
    token,
    p: probs[i],
    top: i === 0,
  }));
});

// Quoted in the annotations, so the numbers can never disagree with the bars.
const topShare = (t) => softmax(LOGITS, t)[0];

// 99.6% rounds to 100%, which would claim a certainty the bar does not have.
const percent = (p) => {
  const whole = Math.round(p * 100);
  return whole === 100 && p < 1 ? `${(p * 100).toFixed(1)}%` : `${whole}%`;
};

export function render() {
  return plot({
    height: 300,
    marginTop: 34,
    marginLeft: 50,
    marginBottom: 52,
    ariaLabel: title,
    fx: { label: null, domain: TEMPERATURES.map(panel) },
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
          panel: panel(t),
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
          // Start just clear of the top bar: at T = 0.2 it reaches 99.6%, so a
          // label anchored on its centre would sit on the bar itself.
          dx: 16,
          text: (d) => `top token: ${percent(d.share)}`,
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
