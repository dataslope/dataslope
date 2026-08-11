/**
 * Where each integer type stops, and what it does when it gets there.
 *
 * One shared diagonal is what a program *intends* as a counter climbs, and
 * every fixed-width type follows it exactly, right up to its own ceiling. At
 * the ceiling the next increment does not produce a larger number: it produces
 * the most negative number the type can hold. That is the behaviour that turns
 * a counter into a negative number, a length into a huge allocation, and a
 * bounds check into a hole.
 *
 * ── Why it is drawn this way ────────────────────────────────────────────────
 *
 * The previous version plotted "stored value as a fraction of the type's
 * range" against intended value, with the y axis ticked `min / 0 / max`. It
 * was chosen for a real reason: raw, int8 and int16 are a flat line next to
 * int32's two billion, so the wrap that bites soonest is the one you cannot
 * see. But normalising cost more than it bought. A reader had to hold "these
 * are fractions, and each is a fraction of a *different* range" in their head
 * before any of the three lines meant anything, and the answer they came for,
 * *what number do I actually get*, was the one quantity the chart had removed.
 * The three normalised drops also looked identical, which is exactly the thing
 * that is not true about them.
 *
 * A symmetric-log y axis solves the original problem without that trade: it
 * spans nine orders of magnitude and crosses zero, so the raw stored value can
 * be plotted directly and all three wraps are visible at their real sizes.
 *
 * The tracking segments are drawn once rather than per type. Every type stores
 * the intended value identically until its own ceiling, so three separate
 * "tracking" lines would be three coincident strokes pretending to be
 * information. What differs per type is only the cliff, so only the cliff is
 * drawn per type.
 *
 * The wrap points come from the bit widths rather than a table, so they are
 * the arithmetic rather than a transcription of it.
 */
import { linspace, Plot, plot, HALO, MUTED, sidedText, SERIES } from "./_theme.mjs";

export const title =
  "Stored value against intended value for signed 8, 16 and 32-bit integers, on axes that span nine orders of magnitude and cross zero. One shared diagonal shows every type storing exactly what was intended, until each reaches its own ceiling and drops vertically to its most negative value: 127 to -128, 32,767 to -32,768, and 2,147,483,647 to -2,147,483,648.";

const WIDTHS = [8, 16, 32];
const TYPES = WIDTHS.map((bits, i) => ({
  bits,
  key: `int${bits}`,
  color: SERIES[i % SERIES.length],
  max: 2 ** (bits - 1) - 1,
  min: -(2 ** (bits - 1)),
}));

const X_MIN = 64;
const X_MAX = 4e9;

/** What the program meant: stored === intended. Sampled rather than drawn as
 *  two endpoints because a straight line in data space is a curve once x is
 *  logarithmic and y is symmetric-log. */
const intent = linspace(Math.log(X_MIN), Math.log(X_MAX), 140)
  .map(Math.exp)
  .map((v) => ({ intended: v, stored: v }));

const SMALL = TYPES[1];

/** Labels hang left of the cliff for the wide types and right for the narrow
 *  one, which sits against the left edge of the frame. */
const side = (d) => (d.max > 1e6 ? "end" : "start");
const OFFSETS = { start: { dx: 9 }, end: { dx: -9 } };

const fmt = (n) => n.toLocaleString("en-US");

export const caption = `Every one of these types stores exactly what you asked for, which is the shared diagonal, and then stops. There is no error and no rounding: a signed ${SMALL.bits}-bit counter is finished at ${fmt(SMALL.max)} and its very next increment is ${fmt(SMALL.min)}. That is how a length becomes negative, an allocation becomes enormous, and a bounds check passes a value that should have failed it. Note where the cliffs sit on the horizontal scale: ${fmt(TYPES[0].max)} and ${fmt(SMALL.max)} are numbers a real workload passes on its first day, while ${fmt(TYPES[2].max)} is the one most people picture when they hear "integer overflow".`;

export function render() {
  return plot({
    height: 340,
    marginTop: 30,
    marginLeft: 66,
    marginRight: 24,
    marginBottom: 48,
    ariaLabel: title,
    x: {
      type: "log",
      label: "The value the program meant to store",
      labelAnchor: "center",
      domain: [X_MIN, X_MAX],
      ticks: [1e2, 1e4, 1e6, 1e8],
      tickFormat: (d) => (d >= 1e6 ? `${d / 1e6}M` : d >= 1e3 ? `${d / 1e3}k` : String(d)),
    },
    y: {
      // Symmetric-log: linear near zero, logarithmic outside it, so nine orders
      // of magnitude and a sign change fit on one axis. A plain log scale
      // cannot hold the negative half at all, which is the half this is about.
      type: "symlog",
      label: "The value actually stored",
      // Headroom past int32's own ±2.1 billion. At a domain of exactly ±4e9
      // that pair of dots sits 4px from the frame edge, and the labels hung
      // off them were clipped away entirely: the largest type, the one the
      // figure is named after, arrived unlabelled.
      domain: [-5e10, 5e10],
      ticks: [-1e9, -1e6, -1e3, 0, 1e3, 1e6, 1e9],
      tickFormat: (d) => {
        if (d === 0) return "0";
        const m = Math.abs(d);
        const unit = m >= 1e9 ? `${m / 1e9}B` : m >= 1e6 ? `${m / 1e6}M` : `${m / 1e3}k`;
        return d < 0 ? `−${unit}` : unit;
      },
    },
    marks: [
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
      Plot.line(intent, {
        x: "intended",
        y: "stored",
        stroke: MUTED,
        strokeWidth: 2,
        strokeDasharray: "5 3",
      }),
      Plot.text([{}], {
        frameAnchor: "top-left",
        text: () =>
          "The dashed line is what the program meant to store.\nEvery type follows it exactly, until its own ceiling.",
        fill: MUTED,
        fontSize: 11,
        fontWeight: 600,
        lineHeight: 1.4,
        textAnchor: "start",
        dx: 6,
        dy: 8,
        ...HALO,
      }),
      // The cliff: one vertical drop per type, at the increment that overflows.
      Plot.ruleX(TYPES, {
        x: (d) => d.max + 1,
        y1: "max",
        y2: "min",
        stroke: "color",
        strokeWidth: 2.5,
        clip: true,
      }),
      Plot.dot(TYPES, { x: "max", y: "max", fill: "color", r: 4.5, clip: true }),
      Plot.dot(TYPES, { x: (d) => d.max + 1, y: "min", fill: "color", r: 4.5, clip: true }),
      ...sidedText(
        TYPES,
        {
          side,
          x: "max",
          y: "max",
          // One line, not two. A two-line label needs about 14px of clearance
          // above its anchor, which int32's ceiling does not have at any y
          // domain that still leaves the small types readable.
          text: (d) => `${d.key} stops at ${fmt(d.max)}`,
          fill: "color",
          fontSize: 10.5,
          fontWeight: 600,
          dy: -12,
          clip: true,
          ...HALO,
        },
        OFFSETS,
      ),
      ...sidedText(
        TYPES,
        {
          side,
          x: (d) => d.max + 1,
          y: "min",
          text: (d) => `one more, and it is ${fmt(d.min)}`,
          fill: "color",
          fontSize: 10.5,
          fontWeight: 600,
          dy: 12,
          clip: true,
          ...HALO,
        },
        OFFSETS,
      ),
    ],
  });
}
