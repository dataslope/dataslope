/**
 * Three series with very different sizes and very different growth rates, on
 * a logarithmic axis.
 *
 * A linear axis answers "how much?", and on one the 8,000-user series would
 * dominate while the other two lay flat against the floor. A log axis answers
 * "how fast?": a constant growth rate is a straight line whatever the starting
 * size, so the slopes are directly comparable and the *smallest* series is
 * visibly climbing quickest.
 *
 * Only the log version is drawn, because the two cannot share a figure. Facets
 * share every scale, which is exactly the thing that differs here, so a
 * side-by-side would need two separate charts; the lesson's own code block
 * shows the linear one immediately above.
 */
import { Plot, plot, linspace, HALO, MUTED, SERIES } from "./_theme.mjs";

export const title =
  "Three growing series on a logarithmic vertical axis, spanning sixty to twenty thousand users. All three are near-straight lines, and the series that starts smallest has the steepest slope.";

export const caption =
  "A linear axis answers how much; this one answers how fast. A constant growth rate is a straight line on a log scale whatever the starting size, which is the only way to see that the smallest series here is growing quickest.";

const MONTHS = 24;
const TS = linspace(0, MONTHS - 1, MONTHS);

const SERIES_DEFS = [
  { key: "Established", start: 8000, rate: 0.03, color: SERIES[0] },
  { key: "Growing", start: 900, rate: 0.09, color: SERIES[1] },
  { key: "New", start: 60, rate: 0.19, color: SERIES[2] },
];

const rows = SERIES_DEFS.flatMap((s) =>
  TS.map((t) => ({ key: s.key, color: s.color, t, value: s.start * Math.pow(1 + s.rate, t) })),
);

const MAX = Math.max(...rows.map((d) => d.value));

export function render() {
  return plot({
    height: 340,
    marginTop: 26,
    marginLeft: 58,
    marginRight: 96,
    ariaLabel: title,
    x: { label: "Month", labelAnchor: "center", domain: [0, MONTHS - 1], ticks: 5 },
    y: {
      label: "Users",
      type: "log",
      domain: [40, MAX * 1.3],
      ticks: [100, 1000, 10000],
      tickFormat: (d) => (d >= 1000 ? `${d / 1000}k` : String(d)),
    },
    marks: [
      Plot.lineY(rows, {
        x: "t",
        y: "value",
        z: "key",
        stroke: (d) => d.color,
        strokeWidth: 2,
      }),
      Plot.text(
        SERIES_DEFS.map((s) => ({
          ...s,
          value: s.start * Math.pow(1 + s.rate, MONTHS - 1),
        })),
        {
          x: MONTHS - 1,
          y: "value",
          text: (d) => `${d.key}\n+${Math.round(d.rate * 100)}%/mo`,
          fill: (d) => d.color,
          fontSize: 12,
          fontWeight: 600,
          lineHeight: 1.3,
          textAnchor: "start",
          dx: 10,
        },
      ),
      Plot.text([{}], {
        x: 1,
        y: MAX * 1.05,
        text: () => "on a log axis, steeper means faster, not bigger",
        fill: MUTED,
        fontSize: 11.5,
        fontWeight: 600,
        textAnchor: "start",
        ...HALO,
      }),
    ],
  });
}
