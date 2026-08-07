/**
 * Where each integer type stops, and what it does when it gets there.
 *
 * The line is the value a program *intends* as a counter climbs; the steps are
 * what an 8-, 16- and 32-bit signed integer actually holds. Each one tracks the
 * intent exactly until its maximum and then jumps to its most negative value,
 * which is the behaviour that turns a counter into a negative number, a length
 * into a huge allocation, and a bounds check into a hole.
 *
 * Drawn on a log x axis because the three limits are five orders of magnitude
 * apart, and the point is how *early* the small ones arrive: a signed 16-bit
 * counter is done at 32,767, which any real workload reaches on the first day.
 *
 * The y axis is each value as a fraction of its own type's range, not the raw
 * number. Raw, int8 and int16 are a flat line on the axis next to int32's two
 * billion and the wrap that matters most is the one you cannot see. Normalised,
 * every type makes the same +1 to -1 drop, which is what actually happens to
 * each of them.
 *
 * The wrap points come from the bit widths rather than a table, so they are the
 * arithmetic rather than a transcription of it.
 */
import { Plot, plot, ACCENT, HALO, MUTED, SERIES } from "./_theme.mjs";

export const title =
  "Stored value as a fraction of each type's range, against intended value on a log axis. Signed 8, 16 and 32-bit integers each hold at their maximum and then drop to their most negative value, five orders of magnitude apart.";

const WIDTHS = [8, 16, 32];
const TYPES = WIDTHS.map((bits, i) => ({
  bits,
  key: `int${bits}`,
  color: SERIES[i % SERIES.length],
  max: 2 ** (bits - 1) - 1,
  min: -(2 ** (bits - 1)),
}));

/** Two points per type: the last good value, and the wrapped one just past it.
 *  A continuous curve would imply intermediate states that do not exist. */
const steps = TYPES.flatMap((t) => [
  { ...t, intended: Math.max(t.max / 8, 100), stored: 1 },
  { ...t, intended: t.max, stored: 1 },
  { ...t, intended: t.max + 1, stored: -1 },
]);

const SMALL = TYPES[1];

export const caption =
  `Each type follows the intent exactly, and then does not. A signed ${SMALL.bits}-bit counter is finished at ${SMALL.max.toLocaleString()} and its next increment is ${SMALL.min.toLocaleString()}, which is how a length becomes negative, an allocation becomes enormous, and a bounds check passes on a value that should have failed it. Nothing raises; the number simply changes sign.`;

export function render() {
  return plot({
    height: 320,
    marginTop: 32,
    marginLeft: 78,
    marginRight: 84,
    marginBottom: 48,
    ariaLabel: title,
    x: {
      type: "log",
      label: "Intended value",
      labelAnchor: "center",
      domain: [100, 4e9],
      ticks: [1e2, 1e4, 1e6, 1e8],
      tickFormat: (d) => `1e${Math.round(Math.log10(d))}`,
    },
    y: {
      label: "Stored, as a fraction of the type's range",
      domain: [-1.35, 1.35],
      ticks: [-1, 0, 1],
      tickFormat: (d) => (d === 1 ? "max" : d === -1 ? "min" : "0"),
    },
    marks: [
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
      // The wrap itself: a vertical drop from max to min at the same value.
      Plot.line(steps, {
        x: "intended",
        y: "stored",
        z: "key",
        stroke: "color",
        strokeWidth: 2,
      }),
      Plot.dot(steps, { x: "intended", y: "stored", fill: "color", r: 4 }),
      Plot.text(
        // `stored` is normalised now, so the label has to sit at 1 rather than
        // at the type's raw maximum, which is off the top of the scale.
        TYPES.map((t) => ({ ...t, intended: t.max, stored: 1 })),
        {
          x: "intended",
          y: "stored",
          text: (d) => `${d.key} stops at\n${d.max.toLocaleString()}`,
          fill: "color",
          fontSize: 10.5,
          fontWeight: 600,
          lineHeight: 1.3,
          textAnchor: "end",
          dx: -10,
          dy: -16,
          ...HALO,
        },
      ),
      Plot.text([{}], {
        x: 3.5e9,
        y: -1.1,
        text: () => "one more increment,\nand it is negative",
        fill: ACCENT,
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.3,
        textAnchor: "end",
        ...HALO,
      }),
    ],
  });
}
