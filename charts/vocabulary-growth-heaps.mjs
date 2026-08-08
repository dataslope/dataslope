/**
 * Heaps' law: the vocabulary of a corpus never stops growing, and that is a
 * planning constraint rather than a curiosity.
 *
 * Distinct word types grow as roughly `K · N^β` in tokens, with β around 0.5
 * for English prose. It is sublinear, so the curve flattens and the tenth
 * million tokens add far fewer new words than the first. It is also unbounded,
 * so it never stops: there is no corpus size at which you have seen every
 * word, because the tail is made of names, typos, product codes, hashtags and
 * compounds that are being invented faster than they can be collected.
 *
 * Everything downstream inherits that. A vocabulary built on training data
 * will meet unseen tokens in production, whatever its size, which is why a
 * bag-of-words model needs an out-of-vocabulary plan and why subword
 * tokenizers exist at all: they trade a vocabulary that cannot cover the tail
 * for pieces that can spell anything.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Distinct word types against tokens read, on log axes. The curve rises without bound as a straight line of slope one half, so each tenfold increase in corpus size roughly triples the vocabulary.";

const K = 15;
const BETA = 0.5;

const vocab = (n) => K * Math.pow(n, BETA);

const sizes = Array.from({ length: 61 }, (_, i) => Math.round(Math.pow(10, 3 + (i * 6) / 60)));
const rows = sizes.map((n) => ({ n, types: vocab(n) }));

const A = 1e6;
const B = 1e8;

export const caption = `Distinct word types grow as roughly K·N^${BETA} in tokens, which is sublinear and unbounded at the same time. Sublinear means the flattening is real: going from ${(A / 1e6).toFixed(0)} million tokens to ${(B / 1e6).toFixed(0)} million multiplies the corpus by ${B / A} and the vocabulary by only ${(vocab(B) / vocab(A)).toFixed(0)}. Unbounded means it never finishes, because the tail is names, typos, product codes and compounds being invented faster than they can be collected. Every vocabulary built from training data will therefore meet unseen tokens in production, which is why bag-of-words needs an out-of-vocabulary plan and why subword tokenizers exist: pieces can spell anything, whole words cannot.`;

export function render() {
  return plot({
    height: 320,
    marginTop: 26,
    marginLeft: 70,
    marginRight: 132,
    marginBottom: 46,
    ariaLabel: title,
    x: {
      label: "Tokens read",
      labelAnchor: "center",
      type: "log",
      domain: [1000, 1e9],
      ticks: [1e3, 1e5, 1e7, 1e9],
      tickFormat: (d) => (d >= 1e9 ? "1B" : d >= 1e6 ? `${d / 1e6}M` : `${d / 1000}k`),
    },
    y: {
      label: "Distinct word types",
      type: "log",
      domain: [300, 1e6],
      ticks: [1e3, 1e4, 1e5, 1e6],
      tickFormat: (d) => (d >= 1e6 ? "1M" : `${d / 1000}k`),
    },
    marks: [
      Plot.line(rows, { x: "n", y: "types", stroke: PRIMARY, strokeWidth: 2 }),
      Plot.ruleX([A, B], { stroke: GUIDE, strokeDasharray: "4 3" }),
      Plot.dot(
        [
          { n: A, types: vocab(A) },
          { n: B, types: vocab(B) },
        ],
        { x: "n", y: "types", fill: ACCENT, r: 4 },
      ),
      Plot.text([{}], {
        x: 1e9,
        y: vocab(1e9),
        text: () => "and still\nclimbing",
        fill: PRIMARY,
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.35,
        textAnchor: "start",
        dx: 8,
        ...HALO,
      }),
      Plot.text([{}], {
        x: 1400,
        y: 300_000,
        text: () =>
          `×${B / A} the corpus, ×${(vocab(B) / vocab(A)).toFixed(0)} the vocabulary,\nand no size at which it stops`,
        fill: MUTED,
        fontSize: 11,
        fontWeight: 600,
        lineHeight: 1.35,
        textAnchor: "start",
        ...HALO,
      }),
    ],
  });
}
