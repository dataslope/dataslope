/**
 * The same five series twice: once needing a legend round-trip to read, once
 * labelled where the lines actually are.
 *
 * A legend asks the reader to hold a colour in working memory, travel to a
 * swatch, match it, and travel back, once per series, every time they look. The
 * cost is invisible to whoever made the chart, because they already know which
 * line is which. It is not invisible to anyone whose colour discrimination is
 * worse than the author's, which is roughly one man in twelve, and it is not
 * invisible on a projector, a phone, or a printout.
 *
 * The fix is not a better palette. Palette work makes the swatches easier to
 * match; direct labelling deletes the matching step, and it keeps working when
 * the colours fail completely. That is why this belongs in an accessibility
 * section rather than a colour one: it is the mitigation that does not depend
 * on the reader's vision at all.
 *
 * The two panels are faceted rather than drawn as two charts because they are
 * the same five series in the same units, which is the one case a shared scale
 * is correct for: any difference between the panels is the labelling, because
 * nothing else can differ.
 *
 * The left panel deliberately keeps the house palette rather than a
 * deliberately-bad one. The point is not that these colours are hard to tell
 * apart, it is that *any* legend costs a round-trip, and stacking the deck
 * would let a reader conclude the fix is a nicer palette.
 */
import { Plot, plot, HALO, MUTED, SERIES } from "./_theme.mjs";

export const title =
  "The same five-line chart drawn twice side by side. On the left the lines are told apart only by a colour legend sitting off to one side; on the right each line carries its name at its right-hand end, and no legend is needed.";

const CHANNELS = [
  { key: "Organic", color: SERIES[0], start: 32, growth: 1.9 },
  { key: "Paid", color: SERIES[1], start: 26, growth: 1.15 },
  { key: "Email", color: SERIES[2], start: 20, growth: 0.30 },
  { key: "Social", color: SERIES[3], start: 15, growth: 1.42 },
  { key: "Referral", color: SERIES[4], start: 11, growth: 0.34 },
];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep"];

/** A gentle wobble so the lines read as data rather than as five straight rays,
 *  deterministic in the index so no seed is needed. */
const wobble = (i, phase) => 1.5 * Math.sin(i * 0.9 + phase);

const PANELS = ["Legend only", "Labelled in place"];

const ROWS = PANELS.flatMap((panel) =>
  CHANNELS.flatMap((c, ci) =>
    MONTHS.map((m, i) => ({
      panel,
      key: c.key,
      color: c.color,
      m,
      i,
      y: c.start + c.growth * i + wobble(i, ci),
    })),
  ),
);

const ENDS = CHANNELS.map((c, ci) => ({
  panel: PANELS[1],
  key: c.key,
  color: c.color,
  i: MONTHS.length - 1,
  y: c.start + c.growth * (MONTHS.length - 1) + wobble(MONTHS.length - 1, ci),
}));

/** The legend, drawn as marks rather than left to Plot's own swatch row, so it
 *  sits inside the left panel where a real one would and the round-trip it costs
 *  is visible as a distance on the page.
 *
 *  `i` has to be one of the x domain's own values: the domain is the nine month
 *  indices, so Plot treats the scale as ordinal and silently drops any mark at a
 *  position that is not in it. Hence the swatches sit on month boundaries and
 *  the spacing comes from the stride rather than from a fractional offset. */
const LEGEND = CHANNELS.map((c, ci) => ({
  panel: PANELS[0],
  key: c.key,
  color: c.color,
  i: ci * 2,
  y: 58,
}));

export const caption = `Both panels plot the same five series. The left one can only be read by matching a colour to a swatch and carrying it back to the line, once per series, every time. The right one puts the name where the line ends, so the reading is over as soon as the eye lands. Direct labelling is the accessibility fix that does not depend on the reader: a better palette makes the swatches easier to match, but a label removes the match entirely, and it survives a projector, a greyscale printout, and colour vision the author does not share. Use the legend only when a series has nowhere to put a label.`;

export function render() {
  return plot({
    height: 330,
    marginTop: 30,
    marginLeft: 46,
    marginRight: 78,
    marginBottom: 46,
    ariaLabel: title,
    x: {
      label: null,
      domain: MONTHS.map((_, i) => i),
      ticks: MONTHS.map((_, i) => i),
      tickFormat: (i) => MONTHS[i],
    },
    // Headroom above every series so the legend row has somewhere to sit that
    // is not on top of the data it is describing.
    y: {
      label: "Signups (thousands)",
      domain: [8, 62],
      ticks: [10, 20, 30, 40, 50],
    },
    fx: { domain: PANELS, label: null },
    marks: [
      Plot.line(ROWS, {
        x: "i",
        y: "y",
        z: "key",
        fx: "panel",
        stroke: (d) => d.color,
        strokeWidth: 2,
      }),

      // Left panel: a swatch and a name, parked away from the data.
      Plot.dot(LEGEND, { x: "i", y: "y", fx: "panel", r: 3.4, fill: (d) => d.color }),
      Plot.text(LEGEND, {
        x: "i",
        y: "y",
        fx: "panel",
        text: "key",
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "start",
        dx: 8,
        ...HALO,
      }),

      // Right panel: the name where the line is.
      Plot.text(ENDS, {
        x: "i",
        y: "y",
        fx: "panel",
        text: "key",
        fill: (d) => d.color,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "start",
        dx: 7,
        ...HALO,
      }),
    ],
  });
}
