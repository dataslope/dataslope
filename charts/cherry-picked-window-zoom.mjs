/**
 * The companion to `cherry-picked-window`: the shaded band, drawn on its own.
 *
 * Nothing here is false. These are the real values for four real months, on an
 * axis that starts at zero, with no annotation doing any work. It is simply the
 * steepest stretch of a series that went nowhere, and shown alone it reads as a
 * breakout.
 *
 * That is the whole argument for showing enough history: the lie in a
 * cherry-picked chart is not in any mark on it, it is in the months that are
 * missing, and no amount of care about the chart itself can recover them.
 */
import { Plot, plot, ACCENT, HALO, MUTED } from "./_theme.mjs";
import { SERIES, WINDOW, WINDOW_LENGTH, WINDOW_PCT, WINDOW_ROWS } from "./_wander.mjs";

export const title =
  "The same metric over only the four months of the shaded window, rising steeply from the first month to the last, with nothing on the chart to indicate that the ten years around it are flat.";

export const caption =
  `The same data, cropped to the shaded months. Up ${WINDOW_PCT}% in ${WINDOW_LENGTH} months, drawn honestly from zero, every value real. The chart is not wrong; it is just missing the ${SERIES.length - WINDOW_LENGTH} other months, in which the same series did nothing.`;

const LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const rows = WINDOW_ROWS.map((d, i) => ({ ...d, label: LABELS[(WINDOW.start + i) % 12] }));

export function render() {
  return plot({
    height: 320,
    marginTop: 40,
    marginLeft: 54,
    marginRight: 30,
    marginBottom: 46,
    ariaLabel: title,
    x: { label: null, domain: rows.map((d) => d.label), padding: 0.35 },
    // From zero, because the point is that this chart does everything right
    // and still misleads.
    y: { label: "Metric", domain: [0, Math.max(...rows.map((d) => d.value)) * 1.18], ticks: 5 },
    marks: [
      Plot.barY(rows, { x: "label", y: "value", fill: ACCENT, fillOpacity: 0.5 }),
      Plot.text(rows, {
        x: "label",
        y: "value",
        text: (d) => d.value.toFixed(0),
        fill: MUTED,
        fontSize: 11.5,
        fontWeight: 600,
        dy: -10,
        ...HALO,
      }),
      Plot.text([{ label: rows[rows.length - 1].label }], {
        x: "label",
        y: rows[rows.length - 1].value,
        text: () => `up ${WINDOW_PCT}% in ${WINDOW_LENGTH} months`,
        fill: ACCENT,
        fontSize: 12,
        fontWeight: 600,
        textAnchor: "end",
        dy: -34,
        ...HALO,
      }),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
