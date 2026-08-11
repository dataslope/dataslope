/**
 * The chart that belongs inside a table rather than beside it.
 *
 * A table is the right answer more often than chart people admit. It gives
 * exact values, it is searchable, it is copyable, it survives being pasted
 * into an email, and a reader who wants one number gets it without measuring
 * anything. What a table cannot do is *shape*: to see that one of these
 * regions has been sliding for six straight months you would have to read
 * twelve numbers and hold eleven differences in your head, and nobody does.
 *
 * The usual fix is to put a line chart next to the table, which means twelve
 * lines in one frame and a reader matching a color to a row name. The
 * sparkline, which is Tufte's, does something different: it puts the shape
 * *in the row*, at the size of a word, so the exact value and the trend are
 * read in one movement without either being converted into the other.
 *
 * What makes it work is what it leaves out. No axis, no ticks, no gridlines,
 * no labels, no baseline. A sparkline is not a small chart, it is a *glyph*:
 * you are not meant to read a value off it, you are meant to see whether the
 * line goes up, wobbles, or falls off a cliff, and then read the actual number
 * in the column beside it. Adding an axis to a sparkline would be adding the
 * thing the number already provides.
 *
 * The one honest warning: because each row is scaled to its own range, two
 * sparklines are not comparable to each other, only to themselves. If the
 * question is "which region is biggest", the answer is the number column. If
 * the question is "which region is in trouble", it is the glyph column, and
 * the shape that stands out here is the one you can find in about a second.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY, rng } from "./_theme.mjs";

export const title =
  "A twelve-row table of regional revenue with a sparkline in each row: a small unlabelled line showing that row's twelve months. The exact value stays in the number column and the trend lives in the glyph column, so both are read in one movement.";

const MONTHS = 12;
const u = rng(31_337);

/** Twelve regions. Most drift; one has been falling all year, which is the
 *  thing a column of numbers hides and a column of glyphs does not. */
const REGIONS = [
  { key: "Northgate", base: 412, drift: 1.1 },
  { key: "Ashbourne", base: 388, drift: 0.4 },
  { key: "Cranmere", base: 366, drift: -3.4, trouble: true },
  { key: "Eastfield", base: 341, drift: 0.9 },
  { key: "Fenwick", base: 318, drift: 1.8 },
  { key: "Glenmoor", base: 296, drift: -0.3 },
  { key: "Harlow", base: 274, drift: 2.4 },
  { key: "Inglewood", base: 251, drift: 0.2 },
  { key: "Kestrel", base: 229, drift: 1.4 },
  { key: "Marlow", base: 206, drift: -0.6 },
  { key: "Oakhurst", base: 184, drift: 3.1 },
  { key: "Pelham", base: 162, drift: 0.7 },
].map((r) => {
  const series = Array.from({ length: MONTHS }, (_, i) => {
    const wobble = (u() - 0.5) * (r.trouble ? 5 : 14);
    return Math.round(r.base + r.drift * i + wobble);
  });
  return { ...r, series, latest: series.at(-1) };
});

const ORDER = REGIONS.map((r) => r.key);
const TROUBLE = REGIONS.find((r) => r.trouble);
const TROUBLE_DROP = Math.round(
  ((TROUBLE.series[0] - TROUBLE.latest) / TROUBLE.series[0]) * 100,
);

// Both axes are hand-mapped into a meaningless unit square. A band scale on y
// would place a row at a single position, and a sparkline has to *vary* inside
// its row; `dy` cannot do that job because it is a constant option in Plot
// rather than a channel, so a function passed to it is stringified and lost.
const COL_NAME = 0.05;
const COL_VALUE = 0.38;
const SPARK_FROM = 0.5;
const SPARK_TO = 0.95;

const HEADER_Y = 0.955;
const ROW_TOP = 0.9;
const ROW_STEP = 0.075;
/** Half the vertical space a sparkline is allowed inside its own row. */
const SPARK_RISE = 0.024;

const rowY = (i) => ROW_TOP - i * ROW_STEP;

const table = REGIONS.map((r, i) => ({ ...r, y: rowY(i) }));

/** Each row is scaled to its own range, which is the whole idea and also the
 *  one thing that makes two sparklines incomparable to each other. */
const spark = table.flatMap((r) => {
  const lo = Math.min(...r.series);
  const hi = Math.max(...r.series);
  return r.series.map((v, i) => ({
    key: r.key,
    trouble: Boolean(r.trouble),
    x: SPARK_FROM + ((SPARK_TO - SPARK_FROM) * i) / (MONTHS - 1),
    y: r.y - SPARK_RISE + ((v - lo) / (hi - lo || 1)) * SPARK_RISE * 2,
  }));
});
const endpoints = table.map((r) => {
  const lo = Math.min(...r.series);
  const hi = Math.max(...r.series);
  return {
    key: r.key,
    trouble: Boolean(r.trouble),
    x: SPARK_TO,
    y: r.y - SPARK_RISE + ((r.latest - lo) / (hi - lo || 1)) * SPARK_RISE * 2,
  };
});
const TROUBLE_ROW = table.find((r) => r.trouble);

export const caption = `A table gives exact values, is searchable and copyable, survives being pasted into an email, and hands a reader who wants one number that number without any measuring. What it cannot give is shape: spotting that ${TROUBLE.key} has slid ${TROUBLE_DROP}% across the year means reading twelve figures and holding eleven differences in your head, and nobody does that. The usual fix is a line chart beside the table, which is twelve lines in one frame and a reader matching colors to row names. Tufte's sparkline does something else: it puts the shape in the row, at about the size of a word, so the value and the trend are taken in with one movement. What makes it work is everything it omits. No axis, no ticks, no gridlines, no labels, no baseline, because a sparkline is a glyph rather than a small chart. You are not meant to read a value off it; the number is right there in the next column. One warning worth keeping: each row is scaled to its own range, so sparklines are comparable to themselves and not to each other. Which region is biggest is a question for the number column. Which region is in trouble is a question for the glyphs, and the answer takes about a second.`;

export function render() {
  return plot({
    height: 400,
    marginTop: 20,
    marginLeft: 22,
    marginRight: 22,
    marginBottom: 20,
    ariaLabel: title,
    x: { axis: null, domain: [0, 1] },
    y: { axis: null, grid: false, domain: [0, 1] },
    marks: [
      // Column headings and the rule under them.
      Plot.text([{}], {
        x: COL_NAME,
        y: HEADER_Y,
        text: () => "Region",
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 700,
        textAnchor: "start",
      }),
      Plot.text([{}], {
        x: COL_VALUE,
        y: HEADER_Y,
        text: () => "Latest month",
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 700,
        textAnchor: "end",
      }),
      Plot.text([{}], {
        x: SPARK_FROM,
        y: HEADER_Y,
        text: () => "Twelve months",
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 700,
        textAnchor: "start",
      }),
      Plot.link([{}], {
        x1: COL_NAME,
        x2: SPARK_TO,
        y1: HEADER_Y - 0.028,
        y2: HEADER_Y - 0.028,
        stroke: "currentColor",
        strokeOpacity: 0.28,
      }),

      // The table proper: the exact value stays a number.
      Plot.text(table, {
        x: COL_NAME,
        y: "y",
        text: "key",
        fill: "currentColor",
        fillOpacity: 0.85,
        fontSize: 11.5,
        textAnchor: "start",
      }),
      Plot.text(table, {
        x: COL_VALUE,
        y: "y",
        text: (d) => `\u00a3${d.latest.toLocaleString()}k`,
        fill: "currentColor",
        fillOpacity: 0.85,
        fontSize: 11.5,
        textAnchor: "end",
      }),

      // The glyphs: no axis, no ticks, no baseline, no labels. A sparkline is
      // a word, not a chart, and the number beside it is the value.
      Plot.line(spark, {
        x: "x",
        y: "y",
        z: "key",
        stroke: (d) => (d.trouble ? ACCENT : PRIMARY),
        strokeOpacity: (d) => (d.trouble ? 1 : 0.8),
        strokeWidth: 1.5,
      }),
      Plot.dot(endpoints, {
        x: "x",
        y: "y",
        r: 2.6,
        fill: (d) => (d.trouble ? ACCENT : PRIMARY),
      }),
      // In the gutter between the number column and the glyph column, which is
      // the only space in the row that is not already occupied.
      Plot.text([{}], {
        x: SPARK_FROM,
        y: TROUBLE_ROW.y,
        text: () => `down ${TROUBLE_DROP}%`,
        fill: ACCENT,
        fontSize: 10,
        fontWeight: 700,
        textAnchor: "end",
        dx: -8,
        ...HALO,
      }),
      Plot.text([{}], {
        x: SPARK_FROM,
        y: 0.02,
        text: () =>
          "Each row is scaled to its own range, so a sparkline is comparable to itself and not to its neighbours.",
        fill: MUTED,
        fontSize: 10,
        fontWeight: 500,
        textAnchor: "middle",
        ...HALO,
      }),
    ],
  });
}
