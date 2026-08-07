/**
 * The log half of the pair: the same two series, same periods, log axis.
 *
 * Equal ratios now occupy equal distance, so a constant growth rate is a
 * straight line and the slope *is* the rate. The small series is visibly the
 * steeper of the two, which is the fact the linear chart could not show and
 * the one a reader usually needs.
 *
 * Both charts read their numbers from `_growth.mjs`, so the rates quoted in the
 * captions are the rates drawn in both.
 */
import { Plot, plot, HALO, MUTED } from "./_theme.mjs";
import { PERIODS, rows, ends, SMALL, BIG } from "./_growth.mjs";

export const title =
  "The same two series on a logarithmic axis, where both are straight lines and the smaller series is clearly the steeper of the two.";

export const caption =
  `The same numbers. On a log axis a constant growth rate is a straight line and the slope is the rate, so ${SMALL.key} at ${(SMALL.growth * 100).toFixed(0)}% a period is visibly steeper than ${BIG.key} at ${(BIG.growth * 100).toFixed(0)}%. Nothing changed but the axis, and the chart now answers a different question.`;

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
      type: "log",
      label: "Value (log)",
      domain: [20, 20000],
      ticks: [100, 1000, 10000],
      tickFormat: (d) => (d >= 1000 ? `${d / 1000}k` : String(d)),
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
        y: 15000,
        text: () => "log axis: steeper line = faster growth",
        fill: MUTED,
        fontSize: 11,
        fontWeight: 600,
        textAnchor: "start",
        ...HALO,
      }),
    ],
  });
}
