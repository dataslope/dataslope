/**
 * Decomposition read forwards: trend, then trend plus season, then the series
 * you actually observed.
 *
 * The four-panel output of `seasonal_decompose` shows the pieces *after* they
 * have been pulled apart, each on its own axis, which quietly hides how small
 * the residual is next to the trend and makes the seasonal wave look as
 * important as the climb. Drawn additively on one shared axis, in the order
 * they are added, "additive model" stops being a keyword argument and becomes
 * a picture: each line is the one below it plus one more component.
 *
 * The series is the lesson's own construction — 96 monthly points, trend
 * 50 + 0.8t, a 12-month sine of amplitude 12, and normal noise with σ = 3 —
 * so the reader is looking at the same data the code block builds.
 */
import { Plot, plot, normalSamples, HALO, MUTED, SERIES } from "./_theme.mjs";

export const title =
  "Three lines over eight years of monthly data on one axis. A straight rising trend, the same trend with a yearly wave added, and the observed series with noise on top of both.";

export const caption =
  "The same series, built up one component at a time. An additive model means exactly this: observed is trend plus season plus what is left, and decomposition is that sum run backwards.";

const N = 96;
const TS = Array.from({ length: N }, (_, i) => i);

const trend = (t) => 50 + 0.8 * t;
const seasonal = (t) => 12 * Math.sin((2 * Math.PI * t) / 12);
const NOISE = normalSamples(N, 0, 3, 2024);

const LAYERS = [
  // `labelDy` separates the three right-margin labels, which would otherwise
  // print on top of each other: two of the layers end within a few units.
  { key: "Trend", color: SERIES[2], f: (t) => trend(t), width: 2, labelDy: -8 },
  {
    key: "Trend + season",
    color: SERIES[0],
    f: (t) => trend(t) + seasonal(t),
    width: 1.75,
    labelDy: 12,
  },
  {
    key: "Observed",
    color: SERIES[1],
    f: (t) => trend(t) + seasonal(t) + NOISE[t],
    width: 1.5,
    labelDy: 34,
  },
];

const lines = LAYERS.flatMap((l) =>
  TS.map((t) => ({ key: l.key, color: l.color, width: l.width, t, y: l.f(t) })),
);

export function render() {
  return plot({
    height: 340,
    marginTop: 26,
    marginLeft: 46,
    marginRight: 118,
    ariaLabel: title,
    x: {
      label: "Month",
      labelAnchor: "center",
      domain: [0, N - 1],
      ticks: [0, 24, 48, 72, 95],
      tickFormat: (t) => `year ${Math.floor(t / 12) + 1}`,
    },
    y: { label: "Value", domain: [30, 154], ticks: 5 },
    marks: [
      // Three marks rather than one z-grouped mark, because the stroke width
      // steps down as each layer is added and strokeWidth would have to vary
      // per row for that (it is a channel on lines, but the layers read more
      // clearly written out).
      ...LAYERS.map((l) =>
        Plot.lineY(lines.filter((d) => d.key === l.key), {
          x: "t",
          y: "y",
          stroke: l.color,
          strokeWidth: l.width,
          strokeOpacity: l.key === "Observed" ? 0.75 : 1,
        }),
      ),
      // Named at the right edge, in the margin kept clear for them, so the
      // labels never sit on a line.
      ...LAYERS.map((l) =>
        Plot.text([l], {
          x: N - 1,
          y: (d) => d.f(N - 1),
          text: "key",
          fill: l.color,
          fontSize: 12,
          fontWeight: 600,
          textAnchor: "start",
          dx: 10,
          dy: l.labelDy,
        }),
      ),
      Plot.text([{}], {
        x: 4,
        y: 148,
        text: () => "observed = trend + season + residual",
        fill: MUTED,
        fontSize: 12,
        fontWeight: 600,
        textAnchor: "start",
        ...HALO,
      }),
    ],
  });
}
