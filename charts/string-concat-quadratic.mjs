/**
 * The loop that looks linear and is not.
 *
 * `s += piece` inside a loop reads like appending, and in a language with
 * immutable strings it is not: each `+=` allocates a fresh string and copies
 * everything accumulated so far into it. Copy 1 character, then 2, then 3, and
 * the total after n steps is n(n+1)/2, which is quadratic. A builder (`join`,
 * `StringBuilder`, `strings.Builder`, `String::push_str`) appends into a buffer
 * it owns and grows geometrically, so the total copying is linear.
 *
 * Both curves are drawn as characters copied rather than seconds, so the shape
 * is a property of the algorithm rather than of a machine. The gap only opens
 * at scale, which is exactly why this survives review: at a hundred pieces the
 * two are indistinguishable, and the loop that ships is usually the one that
 * was tested on a hundred pieces.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Characters copied while building a string from n pieces, on log axes. Repeated concatenation rises as n squared while a builder rises linearly, and the two are indistinguishable until a few hundred pieces.";

const PIECE = 20;
const AT = 10_000;

const sizes = Array.from({ length: 41 }, (_, i) => Math.round(Math.pow(10, 1 + (i * 4) / 40)));

const rows = sizes.flatMap((n) => [
  // Each += copies everything accumulated so far, then appends.
  { key: "s += piece", n, copied: (PIECE * n * (n + 1)) / 2 },
  // A builder copies each piece once, plus the doublings of its buffer.
  { key: "A builder, joined once", n, copied: 2 * PIECE * n },
]);

const QUAD = (PIECE * AT * (AT + 1)) / 2;
const LIN = 2 * PIECE * AT;

export const caption = `Strings are immutable in Python, Java, C# and JavaScript, so \`s += piece\` cannot append: it allocates a new string and copies everything so far into it. Copy ${PIECE}, then ${2 * PIECE}, then ${3 * PIECE}, and the total after n pieces is quadratic. At ${AT.toLocaleString()} pieces that is ${(QUAD / 1e9).toFixed(1)} billion characters copied against ${(LIN / 1000).toFixed(0)} thousand for a builder. The two curves are on top of each other until a few hundred, which is why this survives review: the loop that ships was tested on a hundred pieces.`;

export function render() {
  return plot({
    height: 320,
    marginTop: 26,
    marginLeft: 70,
    marginRight: 156,
    marginBottom: 46,
    ariaLabel: title,
    x: {
      label: "Pieces appended",
      labelAnchor: "center",
      type: "log",
      domain: [10, 100_000],
      ticks: [10, 100, 1000, 10_000, 100_000],
      tickFormat: (d) => (d >= 1000 ? `${d / 1000}k` : String(d)),
    },
    y: {
      label: "Characters copied",
      type: "log",
      domain: [100, 2e10],
      ticks: [1e3, 1e5, 1e7, 1e9],
      tickFormat: (d) => (d >= 1e9 ? `${d / 1e9}B` : d >= 1e6 ? `${d / 1e6}M` : `${d / 1000}k`),
    },
    marks: [
      Plot.line(rows.filter((d) => d.key === "s += piece"), {
        x: "n",
        y: "copied",
        stroke: ACCENT,
        strokeWidth: 2,
      }),
      Plot.line(rows.filter((d) => d.key !== "s += piece"), {
        x: "n",
        y: "copied",
        stroke: PRIMARY,
        strokeWidth: 2,
      }),
      Plot.ruleX([AT], { stroke: GUIDE, strokeDasharray: "4 3" }),
      Plot.text([{}], {
        x: 100_000,
        y: (PIECE * 100_000 * 100_001) / 2,
        text: () => "s += piece",
        fill: ACCENT,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "start",
        dx: 8,
        ...HALO,
      }),
      Plot.text([{}], {
        x: 100_000,
        y: 2 * PIECE * 100_000,
        text: () => "A builder,\njoined once",
        fill: PRIMARY,
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.35,
        textAnchor: "start",
        dx: 8,
        ...HALO,
      }),
      Plot.text([{}], {
        x: 320,
        y: 4e8,
        text: () => "indistinguishable here,\nthree orders apart there",
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
