/**
 * Simpson's paradox in a scatter: every group slopes down, the pooled line
 * slopes up.
 *
 * `simpsons-paradox` shows the reversal in *rates*, on the kidney-stone study,
 * where the quantity being compared is a proportion and the groups are two
 * treatments. This is the other face of the same arithmetic, and the one people
 * actually meet in a regression: a continuous x, a continuous y, and a
 * confounder that decides both. Neither picture implies the other on sight, so
 * a reader who has only seen the rates version tends to file the paradox under
 * "something that happens to percentages" and misses it in a scatter plot.
 *
 * The confounder is age band, drawn as the group color, and it is what makes
 * the reversal honest rather than constructed: older people in this population
 * both exercise more *and* have higher blood pressure, so the age bands sit on
 * a rising staircase. Within any one of them exercise helps. Pool them and the
 * staircase, not the exercise, is what the single line measures.
 *
 * The pooled line is drawn heavy and in the accent color, the group lines
 * light and in series colors, because the pooled line is the *wrong* answer
 * the chart exists to indict, and it has to be the thing the eye lands on.
 */
import { Plot, plot, ACCENT, HALO, MUTED, SERIES, rng } from "./_theme.mjs";

export const title =
  "A scatter of weekly exercise minutes against systolic blood pressure, colored by age band. Within each of the four age bands the trend falls: more exercise, lower blood pressure. The age bands themselves sit on a rising staircase, so the single line fitted to all the points together rises.";

/** Four age bands. Each exercises a little more than the last and starts from a
 *  higher baseline, which is the confounding the chart is about. The within-band
 *  slope is the same negative number for all four, so the reversal comes only
 *  from where the bands sit, never from bending any one of them. */
const BANDS = [
  { key: "30s", xMid: 55, base: 112, color: SERIES[0] },
  { key: "45s", xMid: 105, base: 121, color: SERIES[1] },
  { key: "60s", xMid: 155, base: 130, color: SERIES[2] },
  { key: "75s", xMid: 205, base: 139, color: SERIES[3] },
];

const WITHIN_SLOPE = -0.045; // mmHg per weekly minute, inside a band
const PER_BAND = 26;
const X_SPREAD = 34;

const u = rng(9021);
/** Box–Muller from the shared seeded uniform, so the cloud is reproducible and
 *  the generated module does not churn between builds. */
function gauss() {
  const a = Math.max(u(), Number.EPSILON);
  const b = u();
  return Math.sqrt(-2 * Math.log(a)) * Math.cos(2 * Math.PI * b);
}

const POINTS = BANDS.flatMap((band) =>
  Array.from({ length: PER_BAND }, () => {
    const x = band.xMid + gauss() * X_SPREAD;
    const y = band.base + WITHIN_SLOPE * (x - band.xMid) + gauss() * 3.2;
    return { key: band.key, color: band.color, x, y };
  }),
);

/** Ordinary least squares, used twice: once per band and once on everything. */
function fit(rows) {
  const n = rows.length;
  const mx = rows.reduce((s, r) => s + r.x, 0) / n;
  const my = rows.reduce((s, r) => s + r.y, 0) / n;
  const sxy = rows.reduce((s, r) => s + (r.x - mx) * (r.y - my), 0);
  const sxx = rows.reduce((s, r) => s + (r.x - mx) ** 2, 0);
  const slope = sxy / sxx;
  return { slope, intercept: my - slope * mx };
}

const segment = ({ slope, intercept }, x1, x2) => [
  { x: x1, y: intercept + slope * x1 },
  { x: x2, y: intercept + slope * x2 },
];

const BAND_FITS = BANDS.map((band) => {
  const rows = POINTS.filter((p) => p.key === band.key);
  const xs = rows.map((r) => r.x);
  const line = segment(fit(rows), Math.min(...xs), Math.max(...xs));
  return { band, line: line.map((p) => ({ ...p, key: band.key, color: band.color })) };
});

const X_MIN = Math.min(...POINTS.map((p) => p.x));
const X_MAX = Math.max(...POINTS.map((p) => p.x));
const POOLED = fit(POINTS);
const POOLED_LINE = segment(POOLED, X_MIN, X_MAX);

const WITHIN_PER_HOUR = (WITHIN_SLOPE * 60).toFixed(1);
const POOLED_PER_HOUR = (POOLED.slope * 60).toFixed(1);

export const caption = `Same rows, two fits, opposite signs. Inside every age band the line falls by about ${Math.abs(Number(WITHIN_PER_HOUR))} mmHg per extra hour of weekly exercise; fit one line to all of them and it *rises* by about ${POOLED_PER_HOUR}. Nothing is wrong with either calculation. Age drives both variables, so the pooled line is mostly measuring the staircase the bands sit on rather than the effect of exercise. A single slope over pooled groups is only a causal claim if you can rule out a variable that moves the groups apart, and here you cannot.`;

export function render() {
  return plot({
    height: 380,
    marginTop: 26,
    marginLeft: 56,
    marginRight: 66,
    marginBottom: 48,
    ariaLabel: title,
    x: {
      label: "Exercise (minutes per week)",
      labelAnchor: "center",
      domain: [X_MIN - 12, X_MAX + 12],
      ticks: 6,
    },
    y: { label: "Systolic blood pressure (mmHg)", ticks: 6, grid: true },
    marks: [
      Plot.dot(POINTS, {
        x: "x",
        y: "y",
        r: 2.9,
        fill: (d) => d.color,
        fillOpacity: 0.75,
      }),

      // Each band's own trend, drawn only across the range that band covers so
      // no line claims territory it has no data for.
      ...BAND_FITS.map(({ band, line }) =>
        Plot.line(line, { x: "x", y: "y", stroke: band.color, strokeWidth: 2 }),
      ),

      // The pooled fit: the wrong answer, and therefore the loud one.
      Plot.line(POOLED_LINE, {
        x: "x",
        y: "y",
        stroke: ACCENT,
        strokeWidth: 3,
        strokeDasharray: "7,4",
      }),
      Plot.text([{}], {
        x: POOLED_LINE[1].x,
        y: POOLED_LINE[1].y,
        text: () => "one line over everyone:\nrises",
        fill: ACCENT,
        fontSize: 11,
        fontWeight: 600,
        lineHeight: 1.3,
        textAnchor: "end",
        dx: -4,
        dy: -20,
        ...HALO,
      }),

      // Band labels hang off the right end of each band's own trend line, so
      // the color never has to be matched against a legend. The right ends are
      // staggered across the axis because the bands are, which is the point.
      ...BAND_FITS.map(({ band, line }) =>
        Plot.text([{}], {
          x: line[1].x,
          y: line[1].y,
          text: () => `age ${band.key}`,
          fill: band.color,
          fontSize: 10.5,
          fontWeight: 600,
          textAnchor: "start",
          dx: 7,
          dy: 4,
          ...HALO,
        }),
      ),

      // The staircase is the confounding, named once rather than drawn as an
      // arrow: an arrow across four bands crosses every one of them and their
      // points, and the fact is already visible in where the four lines sit.
      Plot.text([{}], {
        x: X_MIN,
        y: BANDS[3].base + 4,
        text: () => "older bands sit higher\nand exercise more",
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.3,
        textAnchor: "start",
        ...HALO,
      }),
    ],
  });
}
