/**
 * Four ways to fill one gap, and which of them you are allowed to use.
 *
 * A missing stretch in a time series has an obvious menu: carry the last value
 * forward, carry the next value backward, draw a straight line between them, or
 * drop the series mean in. On a static chart all four look equally reasonable,
 * and three of them are unusable in anything that will be scored against the
 * future.
 *
 * The test is not "is this accurate", it is **what did this value need to
 * exist**. A forward fill needs the last observation before the gap, which any
 * process standing at that moment already has. Backward fill needs the first
 * observation *after* the gap. Interpolation needs both ends. The series mean
 * needs the whole series, including every point that had not happened yet.
 *
 * That distinction has nothing to do with which fill is closest to the truth.
 * Interpolation is very often the most accurate of the four, and it is still
 * the wrong choice for a model whose job is to predict what it has not seen,
 * because it hands the training set a value that could only have been computed
 * afterwards. The model learns to lean on it, the cross-validation score
 * improves, and the production score does not.
 *
 * The rules that fall out:
 *
 *   • For **features a model will be scored on**, fill with the past only, and
 *     add a `was_missing` indicator so the model can tell a filled value from
 *     a measured one.
 *   • For **description, plotting and reporting** on a series that is already
 *     complete, interpolate freely; nothing is being predicted.
 *   • Never fill with a statistic of the whole series. It leaks the future into
 *     every row at once, which is the hardest kind of leakage to notice
 *     afterwards.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, PRIMARY, SERIES, mean, normalSamples } from "./_theme.mjs";

export const title =
  "One gap in a daily series filled four ways: forward fill, backward fill, linear interpolation and the series mean. Only the forward fill can be computed from information that existed before the gap; the other three read a value from after it.";

const N = 44;
const GAP_FROM = 19;
const GAP_TO = 28;
const NOISE = normalSamples(N, 0, 1.5, 5_507);

/** A series with a step up during the gap, so the four fills separate: the
 *  last value before is well below the first value after. */
const SERIES_DATA = Array.from({ length: N }, (_, t) => {
  const level = t < GAP_FROM ? 32 : t > GAP_TO ? 52 : 32 + ((52 - 32) * (t - GAP_FROM)) / (GAP_TO - GAP_FROM);
  return { t, value: level + NOISE[t], missing: t > GAP_FROM && t < GAP_TO };
});

const OBSERVED = SERIES_DATA.filter((d) => !d.missing);
const BEFORE = OBSERVED.filter((d) => d.t <= GAP_FROM);
const AFTER = OBSERVED.filter((d) => d.t >= GAP_TO);
const LAST = BEFORE.at(-1);
const NEXT = AFTER[0];
const SERIES_MEAN = mean(OBSERVED.map((d) => d.value));
const MISSING = SERIES_DATA.filter((d) => d.missing).length;

const FILLS = [
  {
    key: "forward fill",
    color: PRIMARY,
    safe: true,
    at: () => LAST.value,
    needs: "the last value before the gap",
  },
  {
    key: "backward fill",
    color: SERIES[3],
    safe: false,
    at: () => NEXT.value,
    needs: "the first value after the gap",
  },
  {
    key: "interpolation",
    color: SERIES[2],
    safe: false,
    at: (t) => LAST.value + ((NEXT.value - LAST.value) * (t - LAST.t)) / (NEXT.t - LAST.t),
    needs: "both ends of the gap",
  },
  {
    key: "series mean",
    color: SERIES[4],
    safe: false,
    at: () => SERIES_MEAN,
    needs: "every point in the series",
  },
];

/** Backward fill and interpolation arrive at the same point, so they cannot
 *  both be labelled at the right-hand end of the gap. */
const LABEL_SPOTS = {
  "forward fill": { labelT: NEXT.t, labelAnchor: "start", labelDx: 8, labelDy: 0 },
  "backward fill": { labelT: LAST.t, labelAnchor: "end", labelDx: -8, labelDy: 0 },
  interpolation: {
    labelT: (LAST.t + NEXT.t) / 2,
    labelAnchor: "middle",
    labelDx: 0,
    labelDy: -12,
  },
  "series mean": { labelT: NEXT.t, labelAnchor: "start", labelDx: 8, labelDy: 0 },
};

const paths = FILLS.map((f) => ({
  ...f,
  ...LABEL_SPOTS[f.key],
  path: [LAST.t, NEXT.t].map((t) => ({ t, value: f.at(t) })),
}));

const PEEKERS = FILLS.filter((f) => !f.safe).length;

export const caption = `A gap of ${MISSING} days has an obvious menu: carry the last value forward, carry the next one backward, draw a straight line between them, or drop the series mean in. All four look equally reasonable here, and ${PEEKERS} of them are unusable in anything that will be scored against the future. The test is not which is most accurate, it is what each value needed in order to exist. A forward fill needs the observation at day ${LAST.t}, which anything standing inside the gap already has. Backward fill needs day ${NEXT.t}. Interpolation needs both ends. The series mean needs every point, including the ones that had not happened yet. That has nothing to do with which fill is closest to the truth: interpolation is very often the most accurate of the four and it is still the wrong choice for a model whose job is to predict what it has not seen, because it hands the training set a number that could only be computed afterwards. The model leans on it, the cross-validation score improves, and the production score does not. So fill features with the past only and add a was-missing indicator so the model can tell a filled value from a measured one; interpolate freely when you are describing a series that is already complete and nothing is being predicted; and never fill with a statistic of the whole series, which leaks the future into every row at once and is the hardest kind to notice afterwards.`;

export function render() {
  return plot({
    height: 340,
    marginTop: 30,
    marginLeft: 46,
    marginRight: 122,
    marginBottom: 94,
    ariaLabel: title,
    x: { label: "Day", labelAnchor: "center", domain: [0, N - 1], ticks: [0, 10, 20, 30, 40] },
    y: { label: "Value", domain: [24, 60], ticks: [30, 40, 50, 60] },
    marks: [
      Plot.rect([{}], {
        x1: LAST.t,
        x2: NEXT.t,
        y1: 24,
        y2: 60,
        fill: "currentColor",
        fillOpacity: 0.04,
      }),
      Plot.line(BEFORE, { x: "t", y: "value", stroke: MUTED, strokeWidth: 1.6 }),
      Plot.line(AFTER, { x: "t", y: "value", stroke: MUTED, strokeWidth: 1.6 }),

      ...paths.map((f) =>
        Plot.line(f.path, {
          x: "t",
          y: "value",
          stroke: f.color,
          strokeWidth: 2.2,
          strokeDasharray: f.safe ? null : "5,3",
        }),
      ),
      ...paths.map((f) =>
        Plot.text([{ t: f.labelT, value: f.at(f.labelT) }], {
          x: "t",
          y: "value",
          text: () => f.key,
          fill: f.color,
          fontSize: 10.5,
          fontWeight: 700,
          textAnchor: f.labelAnchor,
          dx: f.labelDx,
          dy: f.labelDy,
          ...HALO,
        }),
      ),

      Plot.dot(OBSERVED, { x: "t", y: "value", r: 2.8, fill: MUTED, fillOpacity: 0.85 }),
      Plot.dot([LAST, NEXT], { x: "t", y: "value", r: 5, fill: ACCENT }),
      Plot.text([{ t: LAST.t, value: LAST.value }], {
        x: "t",
        y: "value",
        text: () => `day ${LAST.t}: the past`,
        fill: ACCENT,
        fontSize: 10,
        fontWeight: 700,
        textAnchor: "end",
        dx: -9,
        ...HALO,
      }),
      Plot.text([{ t: NEXT.t, value: NEXT.value }], {
        x: "t",
        y: "value",
        text: () => `day ${NEXT.t}: the future`,
        fill: ACCENT,
        fontSize: 10,
        fontWeight: 700,
        textAnchor: "middle",
        dy: -14,
        ...HALO,
      }),
      Plot.text([{}], {
        x: (LAST.t + NEXT.t) / 2,
        y: 25.6,
        text: () => `${MISSING} missing days`,
        fill: "currentColor",
        fillOpacity: 0.55,
        fontSize: 10,
        fontWeight: 600,
        textAnchor: "middle",
        ...HALO,
      }),

      // The rule, spelled out under the axis: which fills a process standing
      // inside the gap could actually have computed.
      Plot.text([{}], {
        x: 0,
        y: 24,
        text: () => "computable inside the gap: forward fill only",
        fill: PRIMARY,
        fontSize: 10.5,
        fontWeight: 700,
        textAnchor: "start",
        dy: 42,
      }),
      Plot.text([{}], {
        x: 0,
        y: 24,
        text: () =>
          `needs a value from after the gap: ${FILLS.filter((f) => !f.safe)
            .map((f) => f.key)
            .join(", ")}`,
        fill: GUIDE,
        fontSize: 10.5,
        fontWeight: 700,
        textAnchor: "start",
        dy: 58,
      }),
    ],
  });
}
