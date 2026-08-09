/**
 * The integer widths, drawn against the quantities people actually count with
 * them, so "which type?" stops being a style question.
 *
 * Every fixed-width integer has a ceiling, and the interesting fact is not the
 * ceiling itself but which real quantities sit above and below it. A signed
 * 32-bit integer holds about 2.1 billion, which is comfortably more than the
 * rows in most tables and comfortably less than the milliseconds in a century,
 * the population of the planet, or the bytes in a large file. Every one of
 * those has caused a production incident somewhere.
 *
 * Log axis, because the types are three orders of magnitude apart and the
 * comparison is entirely about orders of magnitude. The markers are the point:
 * a type is big enough or it is not, and the way to know is to put the number
 * you are counting on the same axis.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Maximum value of five integer widths on a logarithmic scale, with real quantities marked alongside them: the world population and the milliseconds in a century sit above the 32-bit ceiling, while seconds in a year and a large row count sit below it.";

const TYPES = [
  { key: "8-bit signed", max: 127 },
  { key: "16-bit signed", max: 32_767 },
  { key: "32-bit signed", max: 2_147_483_647 },
  { key: "64-bit signed", max: 9.223372036854776e18 },
];

const QUANTITIES = [
  { key: "Seconds in a year", value: 31_536_000 },
  { key: "Rows in a large table", value: 500_000_000 },
  { key: "People on Earth", value: 8_200_000_000 },
  { key: "Milliseconds in a century", value: 3_155_760_000_000 },
];

const INT32 = TYPES[2].max;
const OVER = QUANTITIES.filter((q) => q.value > INT32).length;

export const caption = `A signed 32-bit integer stops at ${INT32.toLocaleString()}, which is comfortably more than the rows in most tables and comfortably less than the population of the planet. ${OVER} of the four quantities marked here are above that line, and each one has caused a production incident somewhere: an id column that ran out, a millisecond timestamp that wrapped, a byte count that went negative. The way to choose a width is to put the number you are counting on the same axis as the ceiling.`;

export function render() {
  return plot({
    height: 320,
    marginTop: 34,
    marginLeft: 98,
    marginRight: 172,
    marginBottom: 46,
    ariaLabel: title,
    x: {
      label: "Largest representable value",
      labelAnchor: "center",
      type: "log",
      domain: [50, 5e19],
      ticks: [100, 1e6, 1e12, 1e18],
      tickFormat: (d) => `10^${Math.round(Math.log10(d))}`,
    },
    y: { label: null, domain: TYPES.map((t) => t.key), padding: 0.4, grid: false },
    marks: [
      Plot.barX(TYPES, {
        y: "key",
        x1: 50,
        x2: "max",
        fill: (d) => (d.max === INT32 ? ACCENT : PRIMARY),
        fillOpacity: 0.55,
      }),
      Plot.text(TYPES, {
        y: "key",
        x: "max",
        text: (d) => (d.max > 1e17 ? "9.2 × 10^18" : d.max.toLocaleString()),
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "start",
        dx: 8,
        ...HALO,
      }),
      // The real quantities, as verticals across every bar: the comparison
      // that matters is "is this number left or right of that ceiling?".
      Plot.ruleX(QUANTITIES, {
        x: "value",
        stroke: MUTED,
        strokeWidth: 1.2,
        strokeDasharray: "4 3",
      }),
      // One label per rule, each parked on a different bar's row: at the top
      // of the frame all four sit on one line and overprint each other.
      Plot.text(QUANTITIES, {
        x: "value",
        y: (d, i) => TYPES[i].key,
        text: "key",
        fill: MUTED,
        fontSize: 10,
        fontWeight: 600,
        textAnchor: "start",
        dx: 5,
        dy: -13,
        ...HALO,
      }),
    ],
  });
}
