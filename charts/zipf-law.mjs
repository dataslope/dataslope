/**
 * Zipf's law: word frequency falls off as roughly 1/rank, so the handful of
 * commonest words account for most of a corpus and the long tail is almost
 * entirely words that appear once or twice.
 *
 * Log-log, because that is the shape of the claim: a power law is a straight
 * line on log-log axes, and the point is not "frequent words are frequent" but
 * that the fall-off is *regular* over four orders of magnitude. On linear axes
 * this is a right angle against the axis and says nothing.
 *
 * Counts are the Brown corpus's published top ranks, with the tail following
 * the fitted 1/rank line, so the figure is the law rather than a sample of it.
 */
import { Plot, plot, linspace, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Word frequency against rank on logarithmic axes, falling as a near-straight line over four orders of magnitude. The top few ranks are labelled with the, of and and.";

export const caption =
  "Rank a corpus's words by frequency and the counts fall as roughly 1/rank. The top three words alone are about a tenth of all tokens, and most of the vocabulary sits in the tail, appearing once or twice.";

// The Brown corpus's leading ranks (Kučera & Francis), which anchor the line.
const TOP = [
  { rank: 1, count: 69971, word: "the" },
  { rank: 2, count: 36411, word: "of" },
  { rank: 3, count: 28852, word: "and" },
  { rank: 4, count: 26149, word: "to" },
  { rank: 5, count: 23237, word: "a" },
  { rank: 6, count: 21341, word: "in" },
];

const MAX_RANK = 20000;
// The 1/rank line the ranked counts follow, anchored on the observed top rank.
const K = TOP[0].count;
const law = linspace(0, Math.log10(MAX_RANK), 160).map((e) => {
  const rank = Math.pow(10, e);
  return { rank, count: K / rank };
});

export function render() {
  return plot({
    height: 340,
    marginTop: 24,
    marginLeft: 62,
    marginRight: 24,
    ariaLabel: title,
    x: {
      label: "Word rank",
      labelAnchor: "center",
      type: "log",
      domain: [1, MAX_RANK],
      ticks: [1, 10, 100, 1000, 10000],
    },
    y: {
      label: "Times it appears",
      type: "log",
      domain: [1, 100000],
      ticks: [1, 10, 100, 1000, 10000, 100000],
      tickFormat: (d) => (d >= 1000 ? `${d / 1000}k` : String(d)),
    },
    marks: [
      Plot.lineY(law, { x: "rank", y: "count", stroke: PRIMARY, strokeWidth: 2 }),
      Plot.dot(TOP, { x: "rank", y: "count", r: 3.5, fill: PRIMARY, stroke: null }),
      // Only the first three are labelled; past that the points are closer
      // together than the words are wide.
      Plot.text(TOP.slice(0, 3), {
        x: "rank",
        y: "count",
        text: (d) => `“${d.word}”`,
        fill: PRIMARY,
        fontSize: 12,
        fontWeight: 600,
        textAnchor: "start",
        dx: 9,
        dy: -6,
        ...HALO,
      }),
      Plot.text([{ rank: 700, count: 320 }], {
        x: "rank",
        y: "count",
        text: () => "count ≈ k / rank",
        fill: MUTED,
        fontSize: 12.5,
        fontWeight: 600,
        textAnchor: "start",
        ...HALO,
      }),
    ],
  });
}
