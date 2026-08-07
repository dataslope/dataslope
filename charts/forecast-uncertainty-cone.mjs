/**
 * Why a forecast is a cone rather than a line: uncertainty compounds with the
 * horizon, and the interval widens as its square root.
 *
 * History on the left, forecast on the right, with 50% and 90% intervals
 * drawn. One step out the band is narrow enough that the point forecast is
 * nearly the whole answer. Twelve steps out it spans a range wide enough that
 * "up" and "down" are both inside it, and the single line through the middle
 * has stopped carrying useful information on its own.
 *
 * The widths come from the random-walk result, σ√h, so the cone really is
 * the shape the arithmetic gives rather than a drawn flourish. The ratio in
 * the caption is computed from the drawn band.
 */
import { Plot, plot, rng, ACCENT, GUIDE, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "A series of twenty-four historical points followed by a twelve-step forecast drawn as a widening cone, with the fifty and ninety percent intervals shaded; the band at the last step is several times the width of the first.";

const HISTORY = 24;
const HORIZON = 12;
const SIGMA = 4.2;

const next = rng(31415);
const gauss = () => {
  const a = Math.max(next(), Number.EPSILON);
  return Math.sqrt(-2 * Math.log(a)) * Math.cos(2 * Math.PI * next());
};

let level = 100;
const history = Array.from({ length: HISTORY }, (_, t) => {
  level += 0.8 + gauss() * SIGMA;
  return { t, value: level };
});

const LAST = history.at(-1);
const DRIFT = 0.8;

/** Interval half-width h steps out: σ√h, the random-walk result. */
const band = (h, z) => z * SIGMA * Math.sqrt(h);

const forecast = Array.from({ length: HORIZON + 1 }, (_, h) => ({
  t: HISTORY - 1 + h,
  mid: LAST.value + DRIFT * h,
  lo50: LAST.value + DRIFT * h - band(h, 0.674),
  hi50: LAST.value + DRIFT * h + band(h, 0.674),
  lo90: LAST.value + DRIFT * h - band(h, 1.645),
  hi90: LAST.value + DRIFT * h + band(h, 1.645),
}));

const FIRST = forecast[1];
const FINAL = forecast.at(-1);
const RATIO = (FINAL.hi90 - FINAL.lo90) / (FIRST.hi90 - FIRST.lo90);

export const caption =
  `The line is one number per step; the shading is what the model actually claims. The 90% band is ${(FINAL.hi90 - FINAL.lo90).toFixed(0)} units wide at step ${HORIZON} against ${(FIRST.hi90 - FIRST.lo90).toFixed(0)} at step one, a factor of ${RATIO.toFixed(1)}, because uncertainty accumulates as the square root of the horizon. Reporting the line without the cone is reporting the least informative part of the forecast.`;

export function render() {
  return plot({
    height: 340,
    marginTop: 32,
    marginLeft: 56,
    marginRight: 30,
    marginBottom: 48,
    ariaLabel: title,
    x: { label: "Step", labelAnchor: "center", domain: [0, HISTORY + HORIZON - 1], ticks: 6 },
    y: { label: "Value", ticks: 5 },
    marks: [
      Plot.areaY(forecast, { x: "t", y1: "lo90", y2: "hi90", fill: ACCENT, fillOpacity: 0.13 }),
      Plot.areaY(forecast, { x: "t", y1: "lo50", y2: "hi50", fill: ACCENT, fillOpacity: 0.22 }),
      Plot.ruleX([HISTORY - 1], { stroke: GUIDE, strokeWidth: 1.5, strokeDasharray: "4,3" }),
      Plot.line(history, { x: "t", y: "value", stroke: PRIMARY, strokeWidth: 2 }),
      Plot.line(forecast, {
        x: "t",
        y: "mid",
        stroke: ACCENT,
        strokeWidth: 2,
        strokeDasharray: "5,3",
      }),
      Plot.text([{}], {
        x: HISTORY - 1,
        y: FINAL.hi90,
        text: () => "forecast starts here",
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "end",
        dx: -8,
        ...HALO,
      }),
      Plot.text([FINAL], {
        x: "t",
        y: "hi90",
        text: () => "90%",
        fill: ACCENT,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "end",
        dy: -8,
        ...HALO,
      }),
      Plot.text([FINAL], {
        x: "t",
        y: "hi50",
        text: () => "50%",
        fill: ACCENT,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "end",
        dy: -8,
        ...HALO,
      }),
    ],
  });
}
