/**
 * Playfair's trade-balance plate, 1786: the first published time-series chart.
 *
 * Two lines, imports and exports between England and Denmark-and-Norway across
 * eighty-one years, with the gap between them shaded. Before this, economic
 * data of this kind lived in tables of figures and nowhere else, and Playfair
 * had to argue in his preface that a picture of trade was a legitimate way to
 * know something about trade. The argument he was making is visible in the
 * chart itself: the *balance* is not a column in any table, it is the area
 * between two lines, and it only becomes a quantity you can see once the lines
 * are drawn.
 *
 * The shading changes color where the lines cross, which is Playfair's own
 * device. Everything left of the crossing is money leaving England, everything
 * right of it is money arriving, and the reader does not need to be told which
 * is which or to subtract anything.
 *
 * ── On the numbers ─────────────────────────────────────────────────────────
 *
 * These are read off the engraving rather than recovered from a ledger, and
 * the caption says so. The shape is Playfair's: the level of imports, the slow
 * climb of exports, the crossing in the middle 1750s and the steep run to
 * 1780. The last significant figure is not his and is not claimed to be.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "William Playfair's 1786 chart of English trade with Denmark and Norway, redrawn: two lines from 1700 to 1780 for imports and exports, with the area between them shaded. Imports run above exports until the mid-1750s, when the lines cross and exports climb steeply to nearly twice the import level by 1780.";

/** Thousands of pounds, read from the plate at five-year steps. */
const TRADE = [
  [1700, 70, 35],
  [1705, 62, 30],
  [1710, 65, 28],
  [1715, 55, 35],
  [1720, 60, 42],
  [1725, 68, 50],
  [1730, 72, 55],
  [1735, 78, 62],
  [1740, 80, 68],
  [1745, 72, 72],
  [1750, 78, 80],
  [1755, 85, 88],
  [1760, 95, 105],
  [1765, 100, 125],
  [1770, 105, 150],
  [1775, 100, 165],
  [1780, 96, 185],
].map(([year, imports, exports]) => ({ year, imports, exports }));

/** Linear crossing between the last year imports lead and the first year they
 *  do not, so the two shaded regions meet exactly rather than overlap by a
 *  year. Computed rather than typed, so editing the table cannot desync it. */
const CROSS = (() => {
  for (let i = 1; i < TRADE.length; i++) {
    const a = TRADE[i - 1];
    const b = TRADE[i];
    const da = a.imports - a.exports;
    const db = b.imports - b.exports;
    if (da >= 0 && db < 0) {
      const t = da / (da - db);
      const year = a.year + t * (b.year - a.year);
      const value = a.imports + t * (b.imports - a.imports);
      return { year, imports: value, exports: value };
    }
  }
  return TRADE.at(-1);
})();

const against = [...TRADE.filter((d) => d.year <= CROSS.year), CROSS];
const inFavour = [CROSS, ...TRADE.filter((d) => d.year > CROSS.year)];
const LAST = TRADE.at(-1);

export const caption = `Redrawn from Playfair's plate in the *Commercial and Political Atlas*; the values are read from the engraving and rounded, so the shape is his and the last digit is not. By ${LAST.year} exports ran at £${LAST.exports},000 against imports of £${LAST.imports},000.`;

export function render() {
  return plot({
    height: 340,
    marginTop: 26,
    marginLeft: 62,
    marginRight: 128,
    marginBottom: 48,
    ariaLabel: title,
    x: {
      label: null,
      domain: [1700, 1780],
      ticks: [1700, 1720, 1740, 1760, 1780],
      tickFormat: (d) => String(d),
    },
    y: {
      label: "Thousands of pounds",
      domain: [0, 200],
      ticks: 5,
      tickFormat: (d) => `£${d}k`,
    },
    marks: [
      Plot.areaY(against, {
        x: "year",
        y1: "exports",
        y2: "imports",
        fill: ACCENT,
        fillOpacity: 0.16,
        clip: true,
      }),
      Plot.areaY(inFavour, {
        x: "year",
        y1: "imports",
        y2: "exports",
        fill: PRIMARY,
        fillOpacity: 0.16,
        clip: true,
      }),
      Plot.line(TRADE, { x: "year", y: "imports", stroke: ACCENT, strokeWidth: 2, clip: true }),
      Plot.line(TRADE, { x: "year", y: "exports", stroke: PRIMARY, strokeWidth: 2, clip: true }),
      Plot.ruleX([CROSS.year], { stroke: GUIDE, strokeWidth: 1.25, strokeDasharray: "4,3" }),
      Plot.text([{}], {
        x: CROSS.year,
        y: 196,
        text: () => "the lines cross:\nthe balance turns",
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.35,
        textAnchor: "end",
        dx: -9,
        ...HALO,
      }),
      Plot.text([{ year: 1718, y: 30 }], {
        x: "year",
        y: "y",
        text: () => "balance against England",
        fill: ACCENT,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "start",
        ...HALO,
      }),
      Plot.text([{ year: 1762, y: 168 }], {
        x: "year",
        y: "y",
        text: () => "and in her favour",
        fill: PRIMARY,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "start",
        ...HALO,
      }),
      Plot.text([LAST], {
        x: "year",
        y: "exports",
        text: () => "Exports",
        fill: PRIMARY,
        fontSize: 11,
        fontWeight: 600,
        textAnchor: "start",
        dx: 9,
        ...HALO,
      }),
      Plot.text([LAST], {
        x: "year",
        y: "imports",
        text: () => "Imports",
        fill: ACCENT,
        fontSize: 11,
        fontWeight: 600,
        textAnchor: "start",
        dx: 9,
        ...HALO,
      }),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
