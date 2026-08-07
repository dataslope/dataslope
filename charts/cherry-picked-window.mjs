/**
 * Ten years of a metric that goes nowhere, with the window a motivated author
 * would show you marked on it.
 *
 * The series is a mean-reverting random walk: no trend, and enough local slope
 * that some stretch of it is always rising sharply. The shaded band is the
 * steepest four-month run in the decade, found by searching rather than chosen
 * by eye, and `cherry-picked-window-zoom` is that band drawn on its own.
 *
 * The pair has to be two charts. The zoom's whole point is a different x
 * domain, and Plot facets share every scale (see the note on plot() in
 * _theme.mjs), so a single figure cannot hold both.
 *
 * Every number in the captions is computed from the same series, so the "up a
 * quarter in four months, flat over ten years" claim cannot drift from what is
 * drawn.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY } from "./_theme.mjs";
import { SERIES, WINDOW, WINDOW_LENGTH, WINDOW_PCT, DECADE_PCT } from "./_wander.mjs";

export const title =
  "Ten years of a monthly metric wandering up and down around the same level, with a four-month stretch shaded to show the window a cherry-picked chart would report.";

export const caption =
  `The whole decade: ${DECADE_PCT === 0 ? "no net change at all" : `${DECADE_PCT}% end to end`}, and no trend to speak of. The shaded band is the steepest ${WINDOW_LENGTH} months in it, up ${WINDOW_PCT}%. The next chart is that band on its own, which is a true chart of a real subset and tells you the opposite of this one.`;

const YEARS = (m) => m / 12;

export function render() {
  return plot({
    height: 320,
    marginTop: 34,
    marginLeft: 54,
    marginBottom: 46,
    ariaLabel: title,
    x: { label: "Years", labelAnchor: "center", domain: [0, YEARS(SERIES.length - 1)], ticks: 6 },
    y: { label: "Metric", ticks: 5 },
    marks: [
      // The window, drawn under the line so the series stays readable across it.
      Plot.rectY([{}], {
        x1: YEARS(WINDOW.start),
        x2: YEARS(WINDOW.end),
        fill: ACCENT,
        fillOpacity: 0.22,
      }),
      Plot.line(SERIES, {
        x: (d) => YEARS(d.month),
        y: "value",
        stroke: PRIMARY,
        strokeWidth: 1.75,
      }),
      Plot.line(SERIES.slice(WINDOW.start, WINDOW.end + 1), {
        x: (d) => YEARS(d.month),
        y: "value",
        stroke: ACCENT,
        strokeWidth: 3,
      }),
      // Leader down into the empty lower half: at the band's own height the
      // label ran straight through the series and the reference line.
      Plot.ruleX([{}], {
        x: YEARS(WINDOW.end),
        y1: SERIES[WINDOW.start].value,
        y2: 46,
        stroke: ACCENT,
        strokeOpacity: 0.6,
        strokeWidth: 1.5,
      }),
      Plot.text([{}], {
        x: YEARS(WINDOW.end),
        y: 46,
        text: () => `the ${WINDOW_LENGTH} months\nsomeone would show you`,
        fill: ACCENT,
        fontSize: 11,
        fontWeight: 600,
        lineHeight: 1.3,
        textAnchor: "start",
        dx: 8,
        dy: -6,
        ...HALO,
      }),
      Plot.ruleY([SERIES[0].value], {
        stroke: MUTED,
        strokeWidth: 1.5,
        strokeDasharray: "4,3",
      }),
      Plot.text([{}], {
        x: YEARS(SERIES.length - 1),
        y: SERIES[0].value,
        text: () => "where it started, and\nroughly where it ends",
        fill: MUTED,
        fontSize: 11,
        fontWeight: 600,
        lineHeight: 1.3,
        textAnchor: "end",
        dy: 30,
        ...HALO,
      }),
    ],
  });
}
