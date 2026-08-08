/**
 * Four answers to "how long is this string?", all correct, none
 * interchangeable.
 *
 * A string has at least four lengths. Bytes is what a UTF-8 file or socket
 * carries and what a `VARCHAR(n)` limit counts in some databases. Code units
 * is what `"…".length` reports in JavaScript, Java and C#, because those
 * languages store UTF-16 and a character outside the Basic Multilingual Plane
 * takes two of them. Code points is what Python's `len()` reports and what an
 * index into a Python string counts. Graphemes is what a human means by
 * "characters", and no standard library returns it without help.
 *
 * The four agree exactly on ASCII, which is why this is discovered in
 * production rather than in a test. Every row below is one real behaviour: a
 * truncation that splits a family emoji into three people, a `[::-1]` that
 * scrambles a flag, a length limit that rejects a legitimate name.
 */
import { Plot, plot, ACCENT, HALO, MUTED, SERIES } from "./_theme.mjs";

export const title =
  "Four measures of length for five strings: UTF-8 bytes, UTF-16 code units, code points and graphemes. They agree exactly on ASCII and disagree by up to a factor of eleven on emoji.";

const MEASURES = ["UTF-8 bytes", "UTF-16 code units", "Code points", "Graphemes"];

/** Counted by hand from the actual encodings, so the numbers are the strings'
 *  and not an illustration of them. */
const STRINGS = [
  { key: "hello", counts: [5, 5, 5, 5] },
  { key: "café (composed)", counts: [5, 4, 4, 4] },
  { key: "café (e + accent)", counts: [6, 5, 5, 4] },
  { key: "日本語", counts: [9, 3, 3, 3] },
  { key: "👨‍👩‍👧 (family)", counts: [18, 8, 5, 1] },
];

const rows = STRINGS.flatMap((s) =>
  s.counts.map((n, i) => ({ key: s.key, measure: MEASURES[i], color: SERIES[i], n })),
);

const FAMILY = STRINGS.at(-1).counts;

export const caption = `Bytes is what a file or socket carries. Code units is what \`.length\` returns in JavaScript, Java and C#, which store UTF-16. Code points is what Python's \`len()\` returns. Graphemes is what a person means by "characters", and no standard library gives it to you unaided. One family emoji is ${FAMILY[0]} bytes, ${FAMILY[1]} code units, ${FAMILY[2]} code points and ${FAMILY[3]} character. All four agree exactly on ASCII, which is why the mismatch is found in production: a truncation that splits the family into three people, a reverse that scrambles it, a length limit that rejects a real name.`;

export function render() {
  return plot({
    height: 500,
    marginTop: 34,
    marginLeft: 148,
    marginRight: 132,
    marginBottom: 46,
    ariaLabel: title,
    fy: { label: null, domain: STRINGS.map((s) => s.key) },
    x: { label: "Length", labelAnchor: "center", domain: [0, 20], ticks: 5 },
    y: { label: null, domain: MEASURES, padding: 0.16, grid: false },
    marks: [
      Plot.barX(rows, {
        fy: "key",
        y: "measure",
        x: "n",
        fill: (d) => (d.key.startsWith("👨") ? ACCENT : d.color),
        fillOpacity: 0.72,
      }),
      Plot.text(rows, {
        fy: "key",
        y: "measure",
        x: "n",
        text: (d) => String(d.n),
        fill: MUTED,
        fontSize: 9.5,
        fontWeight: 600,
        textAnchor: "start",
        dx: 6,
        ...HALO,
      }),
      Plot.ruleX([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
