/**
 * How little a size channel can actually say.
 *
 * `bubble-area-vs-radius` (in *Bubble Charts*) answers the scaling question:
 * encode on the radius and every ratio comes out squared, so encode on the
 * area. Get that right and the channel is *correct*. This is the separate
 * question of how much it can carry once it is correct, and the answer is
 * surprisingly little.
 *
 * A ramp of areas, correctly scaled, spanning a wide range, with the band where
 * the marks are actually usable marked across it. Both ends fail, for different
 * reasons, and both failures are visible in the figure rather than asserted by
 * the caption.
 *
 * The small end is obvious: below a couple of pixels a dot is indistinguishable
 * from every other small dot and from a rendering artefact. The large end is
 * the square root biting back. Area scaling is *correct*, and correctness is
 * exactly what compresses the top of the range: the last two circles differ by
 * 60% in value and by 26% in radius, because that is what the square root does,
 * so a reader looking at the marks cannot recover the gap between them.
 *
 * Drawn as one row of circles rather than as a scatter, because the claim is
 * about the marks themselves and a scatter would add position, which is a
 * stronger channel and would do the reader's work for them.
 *
 * The radii come from the areas by construction, so the ramp is the honest
 * square-root scaling the sibling chart argues for; nothing here is a straw
 * man built on the wrong mapping.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "A row of circles whose areas are proportional to values spanning four hundred to one. The smallest are indistinguishable specks; the largest two differ by sixty percent in value but only twenty-six percent in radius, so they look nearly identical. A marked band across the middle covers the span where the circles are both visible and separable, and it is only about thirteen to one wide.";

/** Values on a geometric ramp: the case a size channel is usually asked to
 *  carry, and the one it handles worst. */
const VALUES = [1, 2, 4, 7, 12, 20, 34, 56, 90, 150, 250, 400];

/** Area-proportional radii, which is the correct mapping. `K` is chosen so the
 *  largest circle is about as big as a chart of this height can hold. */
const K = 13 / Math.sqrt(VALUES[VALUES.length - 1]);
const r = (v) => K * Math.sqrt(v);

/** The usable band, in radius rather than in value, because the lower limit is
 *  perceptual and lives in pixels: below ~2.5px a dot reads as noise. The upper
 *  limit is where the square root has flattened the ramp enough that adjacent
 *  steps stop being separable by eye. */
const R_MIN = 2.5;
const R_MAX = 11;

const ROWS = VALUES.map((v, i) => ({
  v,
  i,
  r: r(v),
  usable: r(v) >= R_MIN && r(v) <= R_MAX,
}));

const USABLE = ROWS.filter((d) => d.usable);
const SPAN = USABLE.length
  ? Math.round(USABLE[USABLE.length - 1].v / USABLE[0].v)
  : 0;
const FULL_SPAN = Math.round(VALUES[VALUES.length - 1] / VALUES[0]);

/** The compression at the top, as the two numbers the annotation quotes: how
 *  much the last step gains in value against how little it gains in radius. */
const LAST = VALUES[VALUES.length - 1];
const PENULTIMATE = VALUES[VALUES.length - 2];
const TOP_VALUE_JUMP = Math.round((LAST / PENULTIMATE - 1) * 100);
const TOP_RADIUS_JUMP = Math.round((r(LAST) / r(PENULTIMATE) - 1) * 100);

export const caption = `Twelve values spanning ${FULL_SPAN}:1, encoded on area exactly as they should be. Scaling is not the problem here; range is. At the bottom the circles are specks a reader cannot tell apart or from a rendering artefact. At the top the square root has flattened the ramp: the last two differ by ${TOP_VALUE_JUMP}% in value and only ${TOP_RADIUS_JUMP}% in radius, so the gap between them is not recoverable by eye. What survives in between is a span of about ${SPAN}:1. That is the working range of a size channel, and it is why size is a good way to say "big, medium, small" alongside a position encoding and a poor way to carry a number on its own. If the values span more than about an order of magnitude, put them on an axis.`;

export function render() {
  return plot({
    height: 210,
    marginTop: 46,
    marginLeft: 26,
    marginRight: 26,
    marginBottom: 56,
    ariaLabel: title,
    x: {
      label: "Value",
      labelAnchor: "center",
      domain: [-0.7, VALUES.length - 0.3],
      ticks: ROWS.map((d) => d.i),
      tickFormat: (i) => String(VALUES[i]),
    },
    y: { label: null, domain: [0, 1], ticks: [], grid: false },
    marks: [
      // The band, drawn behind everything as the region it is.
      Plot.rect(
        [
          {
            x1: USABLE[0].i - 0.5,
            x2: USABLE[USABLE.length - 1].i + 0.5,
          },
        ],
        { x1: "x1", x2: "x2", y1: 0, y2: 1, fill: GUIDE, fillOpacity: 0.16 },
      ),
      Plot.text([{}], {
        x: (USABLE[0].i + USABLE[USABLE.length - 1].i) / 2,
        y: 1,
        text: () => `usable band: about ${SPAN}:1`,
        fill: MUTED,
        fontSize: 11,
        fontWeight: 600,
        textAnchor: "middle",
        dy: -8,
        ...HALO,
      }),

      Plot.dot(ROWS, {
        x: "i",
        y: () => 0.5,
        r: "r",
        fill: (d) => (d.usable ? PRIMARY : ACCENT),
        fillOpacity: 0.85,
      }),

      Plot.text([{}], {
        x: 0,
        y: 0.5,
        text: () => "too small to tell apart",
        fill: ACCENT,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "start",
        dy: 26,
        ...HALO,
      }),
      Plot.text([{}], {
        x: VALUES.length - 1.5,
        y: 0.5,
        text: () => `+${TOP_VALUE_JUMP}% in value,\n+${TOP_RADIUS_JUMP}% in radius`,
        fill: ACCENT,
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.3,
        textAnchor: "middle",
        dy: 32,
        ...HALO,
      }),
    ],
  });
}
