/**
 * What a trailing moving average costs: it smooths, and it arrives late.
 *
 * The raw series turns at a known point. The 7-day trailing mean turns about
 * three days later and the 30-day one about a fortnight later, because a
 * trailing window is an average of the past and the past has not turned yet.
 * The wider the window, the smoother the line and the further behind it runs.
 *
 * This is the same tradeoff as histogram bin width, and it is why a moving
 * average is a description rather than a forecast: at the right-hand edge,
 * where a forecast would have to live, it is still reporting a fortnight ago.
 */
import { Plot, plot, rng, ACCENT, GUIDE, HALO, MUTED, PRIMARY, SERIES } from "./_theme.mjs";

export const title =
  "A noisy daily series with a clear peak, drawn with its 7-day and 30-day trailing means. Both smoothed lines peak after the raw series does, the 30-day one substantially later.";

export const caption =
  "A trailing mean averages the past, so it turns after the series turns, and the wider the window the later it turns. The smoothing is the point; the lag is the price, and at the right-hand edge it is all you are looking at.";

const N = 150;
const PEAK_AT = 70;
const next = rng(88);
const gauss = () => {
  const a = Math.max(next(), Number.EPSILON);
  return Math.sqrt(-2 * Math.log(a)) * Math.cos(2 * Math.PI * next());
};

// A single broad hump, so "where is the peak?" has one honest answer.
const signal = (t) => 50 + 38 * Math.exp(-((t - PEAK_AT) ** 2) / (2 * 26 ** 2));
const RAW = Array.from({ length: N }, (_, t) => signal(t) + gauss() * 5);

/** Trailing mean: only the past, which is why it lags. */
const trailing = (w) =>
  RAW.map((_, t) => (t < w - 1 ? null : RAW.slice(t - w + 1, t + 1).reduce((s, v) => s + v, 0) / w));

const WINDOWS = [
  { w: 7, key: "7-day mean", color: SERIES[1] },
  { w: 30, key: "30-day mean", color: ACCENT },
];

const smoothed = WINDOWS.map((s) => ({ ...s, values: trailing(s.w) }));

/** Where each line actually peaks, found from the values rather than assumed,
 *  so the annotated lag is measured. */
const peakOf = (values) => {
  let best = -Infinity;
  let at = 0;
  values.forEach((v, t) => {
    if (v !== null && v > best) {
      best = v;
      at = t;
    }
  });
  return at;
};

const PEAKS = smoothed.map((s) => ({ ...s, at: peakOf(s.values), value: Math.max(...s.values.filter((v) => v !== null)) }));

const lines = smoothed.flatMap((s) =>
  s.values.map((v, t) => (v === null ? null : { key: s.key, color: s.color, t, v })).filter(Boolean),
);

export function render() {
  return plot({
    height: 340,
    marginTop: 26,
    marginLeft: 50,
    marginRight: 108,
    marginBottom: 44,
    ariaLabel: title,
    x: { label: "Day", labelAnchor: "center", domain: [0, N - 1], ticks: 5 },
    y: { label: "Value", domain: [30, 100], ticks: 4 },
    marks: [
      Plot.lineY(
        RAW.map((v, t) => ({ t, v })),
        { x: "t", y: "v", stroke: PRIMARY, strokeOpacity: 0.32, strokeWidth: 1.25 },
      ),
      Plot.ruleX([PEAK_AT], { stroke: GUIDE, strokeWidth: 1.5, strokeDasharray: "4,3" }),
      Plot.lineY(lines, {
        x: "t",
        y: "v",
        z: "key",
        stroke: (d) => d.color,
        strokeWidth: 2,
      }),
      Plot.dot(PEAKS, { x: "at", y: "value", r: 4, fill: (d) => d.color, stroke: null }),
      // The two peaks sit within a few days of each other, so their labels
      // need separating vertically or they print on top of one another.
      ...PEAKS.map((peak, i) =>
        Plot.text([peak], {
          x: "at",
          y: "value",
          text: (d) => `${d.key}: ${d.at - PEAK_AT} days late`,
          fill: peak.color,
          fontSize: 11.5,
          fontWeight: 600,
          textAnchor: "start",
          dx: 9,
          dy: i === 0 ? -12 : 20,
          ...HALO,
        }),
      ),
      Plot.text([{}], {
        x: PEAK_AT,
        y: 34,
        text: () => "the real turn",
        fill: MUTED,
        fontSize: 11.5,
        fontWeight: 600,
        textAnchor: "end",
        dx: -8,
        ...HALO,
      }),
    ],
  });
}
