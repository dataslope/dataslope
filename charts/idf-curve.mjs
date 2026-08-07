/**
 * What IDF does to a word, as one curve: log(N / df) against how many
 * documents contain it.
 *
 * The formula's behaviour at the two ends is what a reader has to internalise,
 * and both are visible here without arithmetic. A word in every document sits
 * exactly on zero, so multiplying by it silences the word — that is the
 * automatic stoplist the lesson promises. A word in one document in a thousand
 * scores about 6.9, and the curve's steepness on the left is why rarity is
 * such a powerful signal: the difference between appearing in 1 document and
 * 10 is larger than the difference between 100 and 1,000.
 *
 * Drawn for N = 1,000 documents on a log document-frequency axis, because the
 * interesting behaviour is all in the first few counts and a linear axis puts
 * every one of them on the left edge.
 */
import { Plot, plot, linspace, sidedText, ACCENT, GUIDE, HALO, PRIMARY } from "./_theme.mjs";

export const title =
  "Inverse document frequency against document frequency on a logarithmic axis, falling as a straight line from about 6.9 for a word in one document out of a thousand to exactly zero for a word in all of them.";

export const caption =
  "IDF against how many documents contain the word, for a corpus of a thousand. A word in every document lands on exactly zero and is silenced; rarity earns weight, and the steepness on the left is why it earns so much of it.";

const N = 1000;
const idf = (df) => Math.log(N / df);

const DFS = linspace(0, Math.log10(N), 160).map((e) => Math.pow(10, e));
const curve = DFS.map((df) => ({ df, idf: idf(df) }));

const MARKS = [
  { df: 1, word: "“comet”", note: "in 1 document" },
  { df: 40, word: "“cat”", note: "in 40" },
  { df: N, word: "“the”", note: "in all 1,000" },
].map((m) => ({ ...m, idf: idf(m.df) }));

export function render() {
  return plot({
    height: 330,
    marginTop: 26,
    marginLeft: 46,
    marginRight: 40,
    ariaLabel: title,
    x: {
      label: "Documents containing the word",
      labelAnchor: "center",
      type: "log",
      domain: [1, N],
      ticks: [1, 10, 100, 1000],
      tickFormat: (d) => String(d),
    },
    y: { label: "IDF", domain: [-1.15, 7.6], ticks: [0, 2, 4, 6] },
    marks: [
      Plot.ruleY([0], { stroke: GUIDE, strokeWidth: 1.5, strokeDasharray: "4,3" }),
      Plot.lineY(curve, { x: "df", y: "idf", stroke: PRIMARY, strokeWidth: 2 }),
      Plot.dot(MARKS, {
        x: "df",
        y: "idf",
        r: 4,
        fill: (d) => (d.idf === 0 ? ACCENT : PRIMARY),
        stroke: null,
      }),
      // The rightmost mark sits against the frame, so its label turns inward.
      ...sidedText(
        MARKS,
        {
          side: (d) => (d.df === N ? "end" : "start"),
          x: "df",
          y: "idf",
          text: (d) => `${d.word}  ${d.note}\nIDF ${d.idf.toFixed(1)}`,
          fill: (d) => (d.idf === 0 ? ACCENT : PRIMARY),
          fontSize: 12,
          fontWeight: 600,
          lineHeight: 1.3,
          ...HALO,
        },
        // "the" sits in the bottom-right corner with the curve running
        // through the space above it, so its label drops below the zero line.
        { start: { dx: 11, dy: -8 }, end: { dx: -6, dy: 24 } },
      ),
    ],
  });
}
