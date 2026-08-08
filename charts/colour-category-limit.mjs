/**
 * Where colour stops working as a categorical channel.
 *
 * The bullet immediately above this in the lesson says "more than about seven
 * categorical colours and the eye starts confusing similar shades", which is the
 * right rule and exactly the sort of claim a reader accepts without believing.
 *
 * The obvious way to draw it, three scatters coloured at three granularities,
 * does not work: at every count the panel is a confetti of intermixed dots and
 * all three look the same, so the figure demonstrates nothing. What actually
 * carries the claim is the palette itself, because the failure is a property of
 * the palette and not of the marks it colours.
 *
 * So: three rows of swatches, one row per category count. The point lands on the
 * third. A palette has a fixed number of distinguishable colours (seven here),
 * and no plotting library refuses when you ask for more than that. It cycles.
 * Every swatch past the seventh is a colour already spoken for, and nothing on
 * the chart or in the legend says so, so two unrelated groups end up identical
 * and the reader has no way to know.
 *
 * That is the real failure mode, and it is worth being precise about: not
 * "these colours are hard to tell apart", which sounds like a matter of taste,
 * but "these two are the same colour and nobody was told", which is a defect.
 *
 * It belongs in a section about colour vision because it is the same conclusion
 * from the other side. Whether a reader can separate two categories depends on
 * the reader; reducing the number of categories is the one fix that helps every
 * reader at once.
 */
import { Plot, plot, HALO, MUTED, SERIES, rng } from "./_theme.mjs";

export const title =
  "The same scatter drawn three times, coloured by four, eight and sixteen categories. With four the groups are easy to separate; with eight it takes effort; with sixteen the palette has cycled and separate groups share a colour.";

const COUNTS = [4, 8, 16];
const PANELS = COUNTS.map((n) => `${n} categories`);

/** How many distinguishable colours the palette actually has. Past this a
 *  library cycles rather than complaining, which is the whole subject. */
const PALETTE = SERIES.length;

const ROWS = COUNTS.flatMap((n) =>
  Array.from({ length: n }, (_, i) => ({
    panel: `${n} categories`,
    n,
    i,
    // Spread across the full width whatever the count, so the rows are
    // comparable and the third one is visibly denser rather than just longer.
    x: (i + 0.5) / n,
    color: SERIES[i % PALETTE],
    repeated: i >= PALETTE,
  })),
);

const OVERFLOW = ROWS.filter((d) => d.repeated && d.n === COUNTS[COUNTS.length - 1]).length;

/** Row notes are counted rather than written, because a hand-written one goes
 *  stale the moment the palette changes size: at seven roles the eight-category
 *  row already has a collision, which a label reading "still one colour each"
 *  would have denied while the ring beside it said otherwise. */
const repeatsIn = (n) => Math.max(0, n - PALETTE);
const NOTES = Object.fromEntries(
  COUNTS.map((n) => {
    const k = repeatsIn(n);
    return [
      `${n} categories`,
      k === 0
        ? "one colour each"
        : k === 1
          ? "one colour already repeats"
          : `${k} of these repeat a colour already used`,
    ];
  }),
);

export const caption = `Three rows of swatches, one per category count, and the failure is in the third. A palette has a fixed number of distinguishable colours, ${PALETTE} in this one, and no plotting library refuses when you ask for more: it starts again from the beginning. So at ${COUNTS[COUNTS.length - 1]} categories, ${OVERFLOW} groups carry a colour that already belongs to another group, and nothing in the chart or the legend says so. That is the real failure mode. Not "these colours are hard to tell apart", which sounds like taste, but "these two are identical and nobody was told", which is a defect. If a categorical variable has more levels than your palette has colours, the fix is fewer levels: collect the tail into "other", facet, or use a channel that is not colour.`;

export function render() {
  return plot({
    height: 250,
    marginTop: 26,
    marginLeft: 116,
    marginRight: 30,
    marginBottom: 34,
    ariaLabel: title,
    x: { label: null, domain: [0, 1], ticks: [], axis: null },
    y: { label: null, domain: [0, 1], ticks: [], grid: false, axis: null },
    fy: { domain: PANELS, label: null, axis: null },
    marks: [
      // The swatches, in two marks rather than one. `stroke` has to be a
      // constant here: as an accessor returning null for the un-repeated
      // swatches it becomes a channel, and Plot drops every datum whose channel
      // value is null, so two thirds of the figure silently vanished.
      Plot.dot(ROWS.filter((d) => !d.repeated), {
        x: "x",
        y: () => 0.5,
        fy: "panel",
        r: 9,
        fill: (d) => d.color,
      }),
      // Repeats get a ring, because the duplication is the one thing the row
      // has to say and the colour alone cannot say it.
      Plot.dot(ROWS.filter((d) => d.repeated), {
        x: "x",
        y: () => 0.5,
        fy: "panel",
        r: 9,
        fill: (d) => d.color,
        stroke: "currentColor",
        strokeWidth: 1.6,
        strokeDasharray: "2,2",
      }),
      Plot.text(
        PANELS.map((panel) => ({ panel })),
        {
          x: () => 0,
          y: () => 0.5,
          fy: "panel",
          text: (d) => d.panel,
          fill: MUTED,
          fontSize: 11,
          fontWeight: 600,
          textAnchor: "end",
          dx: -14,
          ...HALO,
        },
      ),
      Plot.text(
        PANELS.map((panel) => ({ panel })),
        {
          x: () => 0.5,
          y: () => 1,
          fy: "panel",
          text: (d) => NOTES[d.panel],
          fill: MUTED,
          fontSize: 10.5,
          fontWeight: 600,
          textAnchor: "middle",
          dy: -1,
          ...HALO,
        },
      ),
    ],
  });
}
