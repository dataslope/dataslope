/**
 * The linear half of the pair: two series whose sizes differ by two orders of
 * magnitude, drawn on one linear axis.
 *
 * This is the chart most dashboards produce, and it can be read for exactly
 * one thing: which series is bigger. The smaller one is a flat line along the
 * bottom, and its growth rate, which is six times the other's, is not visible
 * at all. `log-scale-percent-change-log` is the same numbers on a log axis and
 * belongs immediately after this one.
 *
 * Two charts rather than facets: the axis type is the variable, and Plot facets
 * share every scale.
 */
import { Plot, plot, HALO, MUTED } from "./_theme.mjs";
import { PERIODS, rows, ends, SMALL, BIG } from "./_growth.mjs";

export const title =
  "Two series over twelve periods on a linear axis. The larger one climbs steeply; the smaller one is a flat line along the bottom, despite growing far faster in percentage terms.";

export const caption =
  `A linear axis answers one question: which is bigger. ${SMALL.key} is growing ${(SMALL.growth * 100).toFixed(0)}% a period against ${BIG.key}'s ${(BIG.growth * 100).toFixed(0)}%, and nothing on this chart shows it. The next chart is the same numbers on a log axis.`;

export function render() {
  return plot({
    height: 310,
    marginTop: 30,
    marginLeft: 66,
    marginRight: 94,
    marginBottom: 46,
    ariaLabel: title,
    x: { label: "Period", labelAnchor: "center", domain: [0, PERIODS], ticks: 4 },
    y: {
      label: "Value (linear)",
      domain: [0, 20000],
      ticks: 5,
      tickFormat: (d) => `${d / 1000}k`,
    },
    marks: [
      Plot.line(rows, { x: "t", y: "value", stroke: "color", strokeWidth: 2, clip: true }),
      Plot.text(ends, {
        x: PERIODS,
        y: "value",
        text: "key",
        fill: "color",
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "start",
        dx: 8,
        ...HALO,
      }),
      Plot.text([{}], {
        x: 0.3,
        y: 19000,
        text: () => "linear axis: only levels are readable",
        fill: MUTED,
        fontSize: 11,
        fontWeight: 600,
        textAnchor: "start",
        ...HALO,
      }),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
