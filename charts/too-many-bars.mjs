/**
 * Where a bar chart stops working, and what it turns into.
 *
 * Bars are the safest chart in the book: length against a zero baseline is the
 * encoding the eye reads most accurately, which is why `encoding-accuracy` puts
 * it at the top and why this course reaches for it first. That ranking is about
 * *one* comparison though, and it says nothing about how many comparisons a
 * reader can hold at once. Hand the same chart forty categories and the
 * encoding is still perfect while the chart has become unusable, because the
 * labels have rotated to forty-five degrees, the bars are two pixels wide, and
 * nobody is comparing bar 7 to bar 31 by eye anyway.
 *
 * Three panels of the same distribution at eight, twenty-four and eighty
 * categories, so the failure is a property of the count and not of the data. It
 * is a chart about a chart type's working range, which is the thing a beginner
 * most often has to learn by shipping a bad one.
 *
 * The three share a scale, which is what makes them comparable and is also
 * honest here: same values, same units, only the number of buckets differs.
 * Sorted descending in all three, because an unsorted categorical bar chart
 * fails for a second and unrelated reason and mixing the two would muddle
 * which one the panel is demonstrating.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY, rng } from "./_theme.mjs";

export const title =
  "The same quantity drawn as a sorted bar chart three times, with eight, twenty-four and eighty categories. At eight every bar is readable and labelled; at twenty-four the labels have thinned out; at eighty the bars are hairlines with no labels at all and the chart has become a shape rather than a set of comparisons.";

const COUNTS = [8, 24, 80];
const PANELS = COUNTS.map((n) => `${n} categories`);

const u = rng(4242);

/** One long-tailed population, sliced into more and more buckets. Long-tailed
 *  rather than uniform because that is what a real category column looks like,
 *  and it is the case where the tail is what pushes the count up. */
function bars(n) {
  return Array.from({ length: n }, (_, i) => ({
    i,
    // A decaying value with noise, so the sorted shape is a curve rather than a
    // staircase and the tail is visibly the part nobody can read.
    v: 100 * Math.exp(-i / (n / 3.2)) + u() * 6,
  }))
    .sort((a, b) => b.v - a.v)
    .map((d, rank) => ({ ...d, rank }));
}

const ROWS = COUNTS.flatMap((n, p) =>
  bars(n).map((d) => ({
    panel: PANELS[p],
    n,
    // Position is the rank as a fraction of the panel, so three different
    // category counts share one horizontal axis without pretending the
    // categories themselves correspond.
    x: (d.rank + 0.5) / n,
    v: d.v,
  })),
);

const NOTES = {
  [PANELS[0]]: "every bar readable\nand labelled",
  [PANELS[1]]: "labels start\nto thin out",
  [PANELS[2]]: "a shape, not\na comparison",
};

export const caption = `Same quantity, same sort, three category counts. The encoding does not degrade: length against zero is exactly as accurate at eighty bars as at eight. What degrades is everything around it, the labels, the bar width, and the reader's willingness to compare the seventh bar with the thirty-first. Somewhere around twenty a bar chart stops answering "how do these compare?" and starts answering "what shape is this?", and past that a reader is better served by a histogram, a ranked table of the top few with the rest collected into "other", or a different question. The chart type has a working range, and it is shorter than people expect.`;

export function render() {
  return plot({
    height: 300,
    marginTop: 30,
    marginLeft: 48,
    marginRight: 22,
    marginBottom: 52,
    ariaLabel: title,
    x: { label: null, domain: [0, 1], ticks: [], axis: null },
    y: { label: "Value", domain: [0, 112], ticks: 4 },
    fx: { domain: PANELS, label: null },
    marks: [
      Plot.rectY(ROWS, {
        x1: (d) => d.x - 0.42 / d.n,
        x2: (d) => d.x + 0.42 / d.n,
        y1: 0,
        y2: "v",
        fx: "panel",
        fill: (d) => (d.n === COUNTS[0] ? PRIMARY : d.n === COUNTS[2] ? ACCENT : MUTED),
      }),
      Plot.text(
        PANELS.map((panel) => ({ panel })),
        {
          x: () => 0.5,
          y: () => 112,
          fx: "panel",
          text: (d) => NOTES[d.panel],
          fill: MUTED,
          fontSize: 10.5,
          fontWeight: 600,
          lineHeight: 1.3,
          textAnchor: "middle",
          dy: -2,
          ...HALO,
        },
      ),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
