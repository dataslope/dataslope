/**
 * Why `len(s)` is not the number of characters, and why the answer depends on
 * what language the text is in.
 *
 * UTF-8 spends one byte on ASCII and up to four elsewhere, so the same
 * sentence costs very different numbers of bytes depending on the script it is
 * written in. The bars are bytes per character for each range. The consequence
 * is the part that bites: a `VARCHAR(255)` measured in bytes holds 255 English
 * characters and about 63 emoji, and a naive substring can cut a character in
 * half.
 *
 * The byte counts are the encoding's own rules rather than measurements, which
 * is what makes them exact: the ranges are defined by the standard.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Bytes per character in UTF-8 by script: one for ASCII, two for Latin accents and Cyrillic, three for CJK, and four for emoji, with the number of characters that fit in 255 bytes beside each.";

const LIMIT = 255;
const SCRIPTS = [
  { key: "ASCII (a-z, 0-9)", bytes: 1 },
  { key: "Latin accents, Greek, Cyrillic", bytes: 2 },
  { key: "CJK, Devanagari", bytes: 3 },
  { key: "Emoji, rare CJK", bytes: 4 },
];

const rows = SCRIPTS.map((s) => ({ ...s, fit: Math.floor(LIMIT / s.bytes) }));
const ASCII = rows[0];
const EMOJI = rows.at(-1);

export const caption =
  `UTF-8 is variable width by design: ASCII stays one byte and everything else pays for it. A ${LIMIT}-byte column holds ${ASCII.fit} English characters and ${EMOJI.fit} emoji, which is why a length limit measured in bytes is a different promise from one measured in characters, and why slicing a string by byte offset can cut a character in half.`;

export function render() {
  return plot({
    height: 290,
    marginTop: 36,
    marginLeft: 220,
    marginRight: 116,
    marginBottom: 46,
    ariaLabel: title,
    x: { label: "Bytes per character", labelAnchor: "center", domain: [0, 4.6], ticks: 5 },
    y: { label: null, domain: rows.map((r) => r.key), padding: 0.32 },
    marks: [
      Plot.barX(rows, {
        y: "key",
        x: "bytes",
        fill: (d) => (d.bytes >= 4 ? ACCENT : PRIMARY),
        fillOpacity: 0.5,
      }),
      Plot.text(rows, {
        y: "key",
        x: "bytes",
        text: (d) => `${d.bytes}`,
        fill: MUTED,
        fontSize: 11.5,
        fontWeight: 600,
        textAnchor: "start",
        dx: 8,
        ...HALO,
      }),
      Plot.text(rows, {
        y: "key",
        x: 4.6,
        text: (d) => `${d.fit} fit in ${LIMIT} bytes`,
        fill: MUTED,
        fontSize: 10.5,
        textAnchor: "start",
        dx: 22,
        ...HALO,
      }),
      Plot.ruleX([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
