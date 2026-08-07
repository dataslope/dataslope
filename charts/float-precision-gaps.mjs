/**
 * Why floating point "loses precision on large numbers", made concrete: the
 * gap between one representable double and the next is not fixed, it doubles
 * every time the exponent does.
 *
 * A double carries 52 bits of mantissa, so between consecutive powers of two
 * it can represent 2^52 evenly spaced values. The *spacing* of those values is
 * therefore 2^(e-52) for a number of magnitude 2^e: about 2e-16 near 1, about
 * 2 near 2^53, and larger than 1 for everything past it. The last point is the
 * one that surprises people: above 2^53 the integers themselves start going
 * missing, which is why JSON parsers mangle large IDs.
 *
 * Both axes are logarithmic, which turns the doubling into the straight line
 * it is. The annotated crossing is computed rather than asserted: it is the
 * first magnitude at which the gap reaches 1.0.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "The gap between consecutive representable doubles against magnitude, on log axes: a straight line rising from about ten to the minus sixteen near one, crossing a gap of one at nine quadrillion, above which consecutive integers are no longer all representable.";

/** Spacing of doubles at a magnitude of 2^e: the mantissa has 52 bits. */
const MANTISSA_BITS = 52;
const EXPONENTS = Array.from({ length: 25 }, (_, i) => i * 3);
const rows = EXPONENTS.map((e) => ({
  magnitude: 2 ** e,
  gap: 2 ** (e - MANTISSA_BITS),
}));

/** Where consecutive integers stop being representable: gap = 1, at 2^53. */
const INTEGER_LIMIT = 2 ** (MANTISSA_BITS + 1);

export const caption =
  `A double has ${MANTISSA_BITS} bits of mantissa, so the gap between neighbouring values scales with the number itself: about 2e-16 near 1, and 1.0 by ${INTEGER_LIMIT.toExponential(1)}. Above that the integers themselves start going missing, which is why a 64-bit id arrives from JSON with its last digits changed.`;

export function render() {
  return plot({
    height: 340,
    marginTop: 32,
    marginLeft: 66,
    marginRight: 30,
    marginBottom: 48,
    ariaLabel: title,
    x: {
      type: "log",
      label: "Magnitude of the number",
      labelAnchor: "center",
      domain: [1, 2 ** 72],
      ticks: [1, 1e6, 1e12, 1e18, 1e21],
      tickFormat: (d) => (d === 1 ? "1" : `1e${Math.round(Math.log10(d))}`),
    },
    y: {
      type: "log",
      label: "Gap to the next double",
      domain: [1e-16, 1e6],
      ticks: [1e-16, 1e-10, 1e-4, 1, 1e6],
      tickFormat: (d) => (d === 1 ? "1" : `1e${Math.round(Math.log10(d))}`),
    },
    marks: [
      // Above this line the gap exceeds 1 and integers start disappearing.
      Plot.rectY([{}], { y1: 1, y2: 1e6, fill: ACCENT, fillOpacity: 0.1 }),
      Plot.ruleY([1], { stroke: ACCENT, strokeWidth: 1.5, strokeDasharray: "4,3" }),
      Plot.ruleX([INTEGER_LIMIT], { stroke: GUIDE, strokeWidth: 1.5, strokeDasharray: "3,3" }),

      Plot.line(rows, { x: "magnitude", y: "gap", stroke: PRIMARY, strokeWidth: 2, clip: true }),
      Plot.dot(rows.filter((_, i) => i % 4 === 0), {
        x: "magnitude",
        y: "gap",
        fill: PRIMARY,
        r: 3,
        clip: true,
      }),

      // Left half of the shaded band, where the line has not arrived yet.
      Plot.text([{}], {
        x: 1e12,
        y: 1e4,
        text: () => "above this line the gap exceeds 1:\nconsecutive integers stop existing",
        fill: ACCENT,
        fontSize: 11,
        fontWeight: 600,
        lineHeight: 1.3,
        textAnchor: "end",
        ...HALO,
      }),
      Plot.text([{}], {
        x: 1.4,
        y: 2 ** -MANTISSA_BITS,
        text: () => "near 1, the gap is about 2e-16",
        fill: MUTED,
        fontSize: 11,
        fontWeight: 600,
        textAnchor: "start",
        dy: -12,
        ...HALO,
      }),
      Plot.text([{}], {
        x: INTEGER_LIMIT,
        y: 1e-16,
        text: () => `2^${MANTISSA_BITS + 1}`,
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "middle",
        dy: -10,
        ...HALO,
      }),
    ],
  });
}
