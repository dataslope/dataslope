/**
 * When a seasonal model is worth fitting, and when the season is noise.
 *
 * Three series with the same trend and the same total variance, differing only
 * in how much of that variance is seasonal. The measure underneath each is the
 * standard strength-of-seasonality statistic: one minus the variance of the
 * remainder over the variance of the remainder plus the seasonal component. It
 * runs from zero to one, and it is the number to check before reaching for a
 * seasonal model.
 *
 * The middle panel is the interesting one. There is a real season in it, and
 * eyeballing the series will not reliably find it; the statistic will.
 *
 * Both the components and the strength are computed from the generated series
 * rather than asserted.
 */
import { Plot, plot, rng, ACCENT, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Three time series with the same trend and the same remainder variance but different seasonal amplitudes, with the strength-of-seasonality statistic printed on each: about 0.9, 0.5 and 0.1.";

const N = 96;
const PERIOD = 12;
const next = rng(1717);
const gauss = () => {
  const a = Math.max(next(), Number.EPSILON);
  return Math.sqrt(-2 * Math.log(a)) * Math.cos(2 * Math.PI * next());
};

/** Target strengths, and the seasonal amplitude each one implies against a
 *  fixed remainder. Setting the *share* instead and hoping produced a middle
 *  panel at 0.24 while the caption claimed a real season, so the parameter is
 *  now the statistic itself. */
const REMAINDER_SD = 5;
const TARGETS = [0.9, 0.5, 0.1];
const amplitudeFor = (target) => Math.sqrt((2 * target * REMAINDER_SD ** 2) / (1 - target));

const variance = (xs) => {
  const m = xs.reduce((s, v) => s + v, 0) / xs.length;
  return xs.reduce((s, v) => s + (v - m) ** 2, 0) / xs.length;
};

const panels = TARGETS.map((target) => {
  const amplitude = amplitudeFor(target);
  const seasonal = [];
  const remainder = [];
  const values = [];
  for (let t = 0; t < N; t++) {
    const trend = 50 + t * 0.28;
    const s = Math.sin((2 * Math.PI * t) / PERIOD) * amplitude;
    const r = gauss() * REMAINDER_SD;
    seasonal.push(s);
    remainder.push(r);
    values.push(trend + s + r);
  }
  // Strength of seasonality: 1 - Var(remainder) / Var(seasonal + remainder).
  const strength = Math.max(
    0,
    1 - variance(remainder) / variance(seasonal.map((s, i) => s + remainder[i])),
  );
  return { target, strength, values };
});

const rows = panels.flatMap((p) =>
  p.values.map((v, t) => ({ panel: `strength ${p.strength.toFixed(2)}`, t, v })),
);

const STRONG = panels[0];
const WEAK = panels.at(-1);

export const caption =
  `Same trend, same noise, different seasonal amplitude. The statistic is one minus the remainder's variance over the seasonal-plus-remainder variance, and it runs from zero to one: ${STRONG.strength.toFixed(2)} on the left, ${WEAK.strength.toFixed(2)} on the right. Check it before fitting a seasonal model. The middle panel has a real season in it that eyeballing the series will not reliably find.`;

export function render() {
  return plot({
    height: 290,
    marginTop: 32,
    marginLeft: 52,
    marginBottom: 48,
    ariaLabel: title,
    fx: { label: null, domain: panels.map((p) => `strength ${p.strength.toFixed(2)}`) },
    x: { label: "Period", labelAnchor: "center", domain: [0, N], ticks: 3 },
    y: { label: "Value", ticks: 5 },
    marks: [
      Plot.line(rows, { x: "t", y: "v", fx: "panel", stroke: PRIMARY, strokeWidth: 1.6 }),
      Plot.text(
        panels.map((p) => ({ panel: `strength ${p.strength.toFixed(2)}`, strength: p.strength })),
        {
          x: 2,
          frameAnchor: "top-left",
          fx: "panel",
          text: (d) =>
            d.strength > 0.6
              ? "fit a seasonal model"
              : d.strength > 0.3
                ? "real, and easy to miss"
                : "do not bother",
          fill: (d) => (d.strength > 0.3 ? ACCENT : MUTED),
          fontSize: 10.5,
          fontWeight: 600,
          textAnchor: "start",
          dx: 6,
          dy: 8,
          ...HALO,
        },
      ),
    ],
  });
}
