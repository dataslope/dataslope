/**
 * What a line says that a set of points does not, and when saying it is a lie.
 *
 * A line between two marks is a claim: that the quantity existed at every
 * moment in between, and moved through those values to get there. On a time
 * series that is usually true, which is why the line is the right default and
 * why the eye reads slope off it so easily.
 *
 * The same mark over categories claims something that has no meaning. There is
 * no value "between" Chrome and Safari, no path from one to the other, and no
 * ordering to slope against: reorder the axis and the shape changes completely
 * while the data does not. The line is drawing a trend through a variable that
 * cannot have one.
 *
 * Both panels are the same six numbers, which is the point. The mark is not a
 * style preference; it is an assertion about the x-axis, and it is either true
 * of that axis or it is not.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "The same six values drawn twice: as a line over six consecutive months, where the connection between points is meaningful, and as a line over six browsers, where it is not.";

const VALUES = [31, 38, 36, 44, 51, 58];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
const BROWSERS = ["Chrome", "Safari", "Edge", "Firefox", "Opera", "Brave"];

const TIME = "Over months: the line is a claim, and it is true";
const CATEGORY = "Over browsers: the same line claims nothing";

const rows = VALUES.flatMap((v, i) => [
  { panel: TIME, i, label: MONTHS[i], value: v },
  { panel: CATEGORY, i, label: BROWSERS[i], value: v },
]);

const time = rows.filter((d) => d.panel === TIME);
const category = rows.filter((d) => d.panel === CATEGORY);

export const caption =
  "The same six numbers. A line between two points asserts that the quantity existed at every moment in between and passed through those values on the way, which is true of months and meaningless for browsers: there is no value between Chrome and Safari, no path from one to the other, and no ordering to take a slope against. Sort the categories differently and the shape changes while the data does not. Bars for categories, lines for time, and the reason is not taste: the mark is an assertion about the x-axis.";

export function render() {
  return plot({
    height: 300,
    marginTop: 34,
    marginLeft: 52,
    marginRight: 20,
    marginBottom: 44,
    ariaLabel: title,
    fx: { label: null, domain: [TIME, CATEGORY] },
    // No tick labels: the x scale is shared and *positional*, and the two
    // panels name those positions differently, so one set of ticks would be
    // wrong in one panel. Each panel labels its own below.
    x: { label: null, domain: [-0.4, VALUES.length - 0.6], ticks: [] },
    y: { label: "Sessions (thousands)", domain: [0, 70], ticks: 4 },
    marks: [
      // Time: the line is the mark, because the connection is real.
      Plot.line(time, { fx: "panel", x: "i", y: "value", stroke: PRIMARY, strokeWidth: 2.2 }),
      Plot.dot(time, { fx: "panel", x: "i", y: "value", fill: PRIMARY, r: 3.2 }),

      // Categories: bars are what the data supports, with the same line drawn
      // over them in the accent so the mistake is visible rather than merely
      // described.
      Plot.rect(category, {
        fx: "panel",
        x1: (d) => d.i - 0.33,
        x2: (d) => d.i + 0.33,
        y1: 0,
        y2: "value",
        fill: MUTED,
        fillOpacity: 0.35,
      }),
      Plot.line(category, {
        fx: "panel",
        x: "i",
        y: "value",
        stroke: ACCENT,
        strokeWidth: 2.2,
        strokeDasharray: "5 4",
      }),
      Plot.dot(category, { fx: "panel", x: "i", y: "value", fill: ACCENT, r: 3.2 }),

      // Each panel's own axis labels, horizontal in both: rotated browser names
      // under a chart about how to read an axis would be one distraction too
      // many, and six of them fit at this size.
      Plot.text(rows, {
        fx: "panel",
        x: "i",
        y: 0,
        text: "label",
        fill: MUTED,
        fontSize: 10,
        dy: 15,
      }),
      Plot.text([{ panel: CATEGORY }], {
        fx: "panel",
        x: (VALUES.length - 1) / 2,
        y: 66,
        text: () => "no order, no path, no slope",
        fill: ACCENT,
        fontSize: 11,
        fontWeight: 600,
        ...HALO,
      }),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
