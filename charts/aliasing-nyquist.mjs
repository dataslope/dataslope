/**
 * Aliasing: what a signal sampled too slowly turns into, which is not noise
 * but a different, entirely convincing signal.
 *
 * The true wave is drawn faintly at full resolution. The dots are the samples
 * a slow sampler takes, and the second line is the wave those dots imply.
 * Above the Nyquist rate the reconstruction is the original. Below it the dots
 * fit a much slower wave perfectly, and nothing in the sampled data reveals the
 * substitution: the aliased frequency is a real answer to the question "what
 * smooth wave passes through these points".
 *
 * The alias frequency is computed by folding the true frequency about the
 * sampling rate rather than typed, so the drawn reconstruction really is the
 * one those samples imply.
 */
import { Plot, plot, linspace, ACCENT, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "A nine-hertz wave sampled at two rates. At thirty samples a second the reconstruction matches it; at ten it matches a one-hertz wave instead, passing exactly through every sample.";

const F_TRUE = 9;
const DURATION = 1;
const PANELS = [
  { fs: 30, key: "30 samples/sec: above Nyquist" },
  { fs: 10, key: "10 samples/sec: below Nyquist" },
];

/** The frequency a sampler at `fs` actually reports for a true `f`: fold about
 *  multiples of fs, then about fs/2. */
function aliasOf(f, fs) {
  const folded = Math.abs(f - fs * Math.round(f / fs));
  return folded;
}

const fine = linspace(0, DURATION, 700);
const truth = PANELS.flatMap((p) =>
  fine.map((t) => ({ panel: p.key, t, y: Math.sin(2 * Math.PI * F_TRUE * t) })),
);

const samples = PANELS.flatMap((p) => {
  const n = Math.round(p.fs * DURATION);
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / p.fs;
    return { panel: p.key, t, y: Math.sin(2 * Math.PI * F_TRUE * t) };
  });
});

const reconstructed = PANELS.flatMap((p) => {
  const f = aliasOf(F_TRUE, p.fs);
  return fine.map((t) => ({
    panel: p.key,
    t,
    // Sign follows the fold: above Nyquist the alias is the signal itself.
    y: Math.sin(2 * Math.PI * f * t) * (F_TRUE - p.fs * Math.round(F_TRUE / p.fs) < 0 ? -1 : 1),
  }));
});

const ALIAS = aliasOf(F_TRUE, PANELS[1].fs);

export const caption =
  `The same ${F_TRUE} Hz wave, sampled twice. Above the Nyquist rate the samples pin it down. Below it they fit a ${ALIAS} Hz wave exactly as well, and that is the one you get: the fast wave has not been lost in noise, it has been replaced by a slow one that the data cannot distinguish it from.`;

export function render() {
  return plot({
    height: 300,
    marginTop: 34,
    marginLeft: 48,
    marginBottom: 48,
    ariaLabel: title,
    fx: { label: null, domain: PANELS.map((p) => p.key) },
    x: { label: "Seconds", labelAnchor: "center", domain: [0, DURATION], ticks: 3 },
    y: { label: null, domain: [-1.5, 1.5], ticks: 3 },
    marks: [
      Plot.line(truth, {
        x: "t",
        y: "y",
        fx: "panel",
        stroke: MUTED,
        strokeOpacity: 0.45,
        strokeWidth: 1.25,
      }),
      Plot.line(reconstructed, {
        x: "t",
        y: "y",
        fx: "panel",
        stroke: PRIMARY,
        strokeWidth: 2,
      }),
      Plot.dot(samples, { x: "t", y: "y", fx: "panel", fill: ACCENT, r: 3.5 }),
      Plot.text([{ panel: PANELS[1].key }], {
        x: DURATION / 2,
        y: 1.35,
        fx: "panel",
        text: () => `every sample sits on a ${ALIAS} Hz wave too`,
        fill: ACCENT,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "middle",
        ...HALO,
      }),
      Plot.text([{ panel: PANELS[0].key }], {
        x: DURATION / 2,
        y: 1.35,
        fx: "panel",
        text: () => "reconstruction matches the original",
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "middle",
        ...HALO,
      }),
    ],
  });
}
