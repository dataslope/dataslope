/**
 * Why a page can be slow on a fast connection: the waterfall, drawn as a
 * waterfall.
 *
 * Loading a page is not one transfer, it is a dependency graph, and the parts
 * that matter are the ones the browser cannot start until something else has
 * finished. The HTML has to arrive before the stylesheet can be discovered;
 * the stylesheet has to be parsed before the font it references is requested;
 * the font arrives last and the text has been invisible the whole time. Each
 * of those steps costs a full round trip regardless of how big the file is.
 *
 * That is why "make the files smaller" has a ceiling and "make the chain
 * shorter" does not. Preloading the font moves it off the end of the chain
 * without making it a byte smaller, and it is worth more than any compression
 * on this page.
 */
import { Plot, plot, ACCENT, HALO, MUTED, SERIES } from "./_theme.mjs";

export const title =
  "A request waterfall for one page: DNS, connect and TLS, then the HTML, then the stylesheet it references, then the font the stylesheet references. Each bar starts where the one it depends on ends, and the font finishes last.";

/** start and duration in ms, on a mobile connection with a 60 ms round trip. */
const REQUESTS = [
  { key: "DNS lookup", start: 0, ms: 55, depth: 0 },
  { key: "TCP connect", start: 55, ms: 62, depth: 0 },
  { key: "TLS handshake", start: 117, ms: 124, depth: 0 },
  { key: "GET / (HTML)", start: 241, ms: 138, depth: 1 },
  { key: "GET app.css", start: 379, ms: 96, depth: 2 },
  { key: "GET Inter.woff2", start: 475, ms: 118, depth: 3 },
  { key: "First paint with text", start: 593, ms: 0, depth: 4 },
];

const BARS = REQUESTS.filter((r) => r.ms > 0);
const TOTAL = REQUESTS.at(-1).start;
const FONT = REQUESTS[5];

export const caption = `Six steps, five of which cannot start until the one above them has finished: the HTML has to arrive before the stylesheet is discovered, and the stylesheet has to be parsed before the font it names is even requested. Nothing here overlaps, so the page takes exactly as long as its longest chain, and text is invisible until ${TOTAL} ms. Compressing the font harder shortens one bar; preloading it moves it off the end of the chain entirely, without saving a single byte. That is the difference between making the files smaller, which has a ceiling, and making the chain shorter, which does not.`;

export function render() {
  return plot({
    height: 300,
    marginTop: 26,
    marginLeft: 152,
    marginRight: 100,
    marginBottom: 46,
    ariaLabel: title,
    x: { label: "Milliseconds", labelAnchor: "center", domain: [0, 700], ticks: 6 },
    y: { label: null, domain: REQUESTS.map((r) => r.key), padding: 0.28, grid: false },
    marks: [
      Plot.barX(BARS, {
        y: "key",
        x1: "start",
        x2: (d) => d.start + d.ms,
        fill: (d) => SERIES[Math.min(d.depth, 3)],
        fillOpacity: 0.72,
      }),
      Plot.text(BARS, {
        y: "key",
        x: (d) => d.start + d.ms,
        text: (d) => `${d.ms} ms`,
        fill: MUTED,
        fontSize: 10,
        fontWeight: 600,
        textAnchor: "start",
        dx: 7,
        ...HALO,
      }),
      Plot.ruleX([TOTAL], { stroke: ACCENT, strokeWidth: 1.5, strokeDasharray: "5 4" }),
      // Each annotation carries its row as a *field*. Passing the category
      // straight in as `y: someRow.key` hands a string to a channel, which
      // Plot reads as a column name; it resolves to undefined and the mark
      // vanishes without an error.
      Plot.text([{ at: REQUESTS.at(-1).key }], {
        x: TOTAL,
        y: "at",
        text: () => `${TOTAL} ms before a word is visible`,
        fill: ACCENT,
        fontSize: 11,
        fontWeight: 600,
        textAnchor: "end",
        dx: -10,
        ...HALO,
      }),
      Plot.text([{ at: FONT.key }], {
        x: FONT.start,
        y: "at",
        text: () => "not requested until the CSS is parsed",
        fill: MUTED,
        fontSize: 10,
        fontWeight: 600,
        textAnchor: "end",
        dx: -8,
        ...HALO,
      }),
    ],
  });
}
