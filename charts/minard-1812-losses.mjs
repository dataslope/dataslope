/**
 * Minard's 1869 plate, with the map taken away.
 *
 * The original is usually introduced as "six variables in one figure", which
 * is true and slightly beside the point. What makes it work is that five of
 * the six are carried by things that were going to be on the page anyway: the
 * band's *position* is where the army was, its *thickness* is how many men
 * were left, its *color* is which direction they were walking, and its *end*
 * is when they stopped. Nothing is a legend entry. Nothing has to be looked
 * up.
 *
 * This redraw drops the map and keeps the arithmetic, which is the part a
 * reader is meant to take away. Longitude runs left to right, so the shape of
 * the march survives; the band is the army, centred on nothing in particular,
 * exactly as Minard drew it; and the temperature panel below is his, on his
 * own Réaumur scale, plotted against the same longitudes so a reader can drop
 * a finger from a step in the band to the weather that caused it.
 *
 * The two steepest losses are worth finding by eye before reading the caption.
 * Neither is Moscow.
 *
 * ── On the numbers ─────────────────────────────────────────────────────────
 *
 * Minard's own tables, as they are transcribed in every modern reproduction of
 * the plate: the survivor counts for the main column at each longitude, and
 * his nine retreat temperatures in degrées Réaumur with their dates. Réaumur
 * is converted for the labels at 1.25 °C per degree; the plotted values are
 * his.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Napoleon's main column on the 1812 Russian campaign, redrawn from Minard: 340,000 men crossing the Niemen in June, 100,000 reaching Moscow, and 4,000 recrossing in December, plotted against longitude, with Minard's retreat temperatures below on the same axis.";

/** Survivors in the main column, by longitude. `back` marks the retreat. */
const ADVANCE = [
  [24.0, 340_000],
  [24.5, 340_000],
  [25.5, 340_000],
  [26.0, 320_000],
  [27.0, 300_000],
  [28.0, 280_000],
  [28.5, 240_000],
  [30.0, 210_000],
  [30.3, 180_000],
  [32.0, 175_000],
  [33.2, 145_000],
  [34.4, 140_000],
  [35.5, 127_100],
  [36.0, 100_000],
  [37.6, 100_000],
].map(([lon, men]) => ({ lon, men }));

const RETREAT = [
  [37.6, 100_000],
  [37.5, 98_000],
  [37.0, 97_000],
  [36.8, 96_000],
  [35.4, 87_000],
  [34.3, 55_000],
  [33.8, 37_000],
  [32.0, 24_000],
  [30.4, 20_000],
  [29.2, 20_000],
  [28.5, 20_000],
  [28.3, 20_000],
  [27.5, 20_000],
  [26.8, 12_000],
  [26.4, 14_000],
  [24.6, 8_000],
  [24.4, 4_000],
  [24.2, 4_000],
  [24.1, 4_000],
].map(([lon, men]) => ({ lon, men }));

/** Minard's temperature scale, in degrees Réaumur, with his dates. */
const TEMPS = [
  [37.6, 0, "18 Oct"],
  [36.0, 0, "24 Oct"],
  [33.2, -9, "9 Nov"],
  [32.0, -21, "14 Nov"],
  [29.2, -11, "24 Nov"],
  [28.5, -20, "28 Nov"],
  [27.2, -24, "1 Dec"],
  [26.7, -30, "6 Dec"],
  [25.3, -26, "7 Dec"],
].map(([lon, reaumur, date]) => ({ lon, reaumur, date, celsius: reaumur * 1.25 }));

const CITIES = [
  { lon: 24.0, name: "Kowno" },
  { lon: 28.5, name: "Smorgoni" },
  { lon: 34.4, name: "Smolensk" },
  { lon: 37.6, name: "Moscow" },
];

/**
 * Minard's plate is two panels sharing one horizontal axis, and Plot facets
 * share *every* scale, so the temperature cannot be an `fy` panel: it is in
 * degrees and the band is in men. Instead the y domain is extended below zero
 * and the temperature is mapped by hand into that reserved strip, with the y
 * ticks pinned to the four that mean something. Same picture, one scale.
 */
const STRIP_TOP = -34_000;
const STRIP_BOTTOM = -128_000;
const COLDEST = Math.min(...TEMPS.map((d) => d.reaumur));
const toStrip = (reaumur) =>
  STRIP_TOP + ((STRIP_TOP - STRIP_BOTTOM) * reaumur) / Math.abs(COLDEST);

const tempRow = TEMPS.map((d) => ({ ...d, y: toStrip(d.reaumur) }));
const LABELLED_DATES = new Set(["9 Nov", "24 Nov", "6 Dec"]);

const START = ADVANCE[0].men;
const AT_MOSCOW = ADVANCE.at(-1).men;
const HOME = RETREAT.at(-1).men;

/** The single worst stretch of the retreat, found rather than asserted, and
 *  the city it happened nearest to, so editing the table cannot make the
 *  caption point at the wrong place. */
const WORST = RETREAT.reduce(
  (worst, d, i) => {
    if (i === 0) return worst;
    const lost = RETREAT[i - 1].men - d.men;
    return lost > worst.lost ? { lost, from: RETREAT[i - 1], to: d } : worst;
  },
  { lost: -1 },
);
const NEAREST = CITIES.reduce((a, b) =>
  Math.abs(b.lon - WORST.to.lon) < Math.abs(a.lon - WORST.to.lon) ? b : a,
);

const pct = (n) => Math.round((n / START) * 100);

export const caption = `Minard's plate of 1869, with the map removed and the arithmetic kept. The band is the army and its thickness is how many men are left, so the reader never converts anything: ${START.toLocaleString()} crossed into Russia, ${AT_MOSCOW.toLocaleString()} reached Moscow, ${HOME.toLocaleString()} came back, which is ${pct(HOME)}% of ${pct(START)}%. Notice where the losses actually are. Over half the army was gone before Moscow, on a summer march with no battle to account for it, and the sharpest single drop on the way home is the stretch beside ${NEAREST.name}, where ${WORST.lost.toLocaleString()} men vanish between two of Minard's own readings. The temperature strip below is his, on the Réaumur scale he used, aligned to the same longitudes so that a step in the band and the weather under it can be read with one finger.`;

export function render() {
  return plot({
    height: 400,
    marginTop: 30,
    marginLeft: 62,
    marginRight: 132,
    marginBottom: 48,
    ariaLabel: title,
    x: {
      label: "Longitude east",
      labelAnchor: "center",
      domain: [23.4, 38.2],
      ticks: [24, 28, 32, 36],
      tickFormat: (d) => `${d}°`,
    },
    y: {
      label: "Men still marching",
      domain: [STRIP_BOTTOM - 14_000, 356_000],
      ticks: [0, 100_000, 200_000, 300_000],
      tickFormat: (d) => (d === 0 ? "0" : `${d / 1000}k`),
      grid: false,
    },
    marks: [
      // Faint rules only where the y axis still means men.
      Plot.ruleY([100_000, 200_000, 300_000], { stroke: "currentColor", strokeOpacity: 0.08 }),

      Plot.areaY(ADVANCE, { x: "lon", y: "men", fill: PRIMARY, fillOpacity: 0.28, clip: true }),
      Plot.areaY(RETREAT, { x: "lon", y: "men", fill: ACCENT, fillOpacity: 0.4, clip: true }),
      Plot.line(ADVANCE, { x: "lon", y: "men", stroke: PRIMARY, strokeWidth: 2, clip: true }),
      Plot.line(RETREAT, { x: "lon", y: "men", stroke: ACCENT, strokeWidth: 2, clip: true }),

      Plot.text([ADVANCE[6]], {
        x: "lon",
        y: "men",
        text: () => "Advance",
        fill: PRIMARY,
        fontSize: 11.5,
        fontWeight: 700,
        textAnchor: "start",
        dx: 4,
        dy: -12,
        ...HALO,
      }),
      Plot.text([RETREAT[5]], {
        x: "lon",
        y: "men",
        text: () => "Retreat",
        fill: ACCENT,
        fontSize: 11.5,
        fontWeight: 700,
        textAnchor: "start",
        dx: 6,
        dy: 16,
        ...HALO,
      }),
      Plot.text([ADVANCE[1]], {
        x: "lon",
        y: "men",
        text: () => `${START.toLocaleString()} cross the Niemen`,
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "start",
        dx: 4,
        dy: 20,
        ...HALO,
      }),
      Plot.text([ADVANCE.at(-1)], {
        x: "lon",
        y: "men",
        text: () => `${AT_MOSCOW.toLocaleString()}\nreach Moscow`,
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.35,
        textAnchor: "start",
        dx: 8,
        dy: -14,
        ...HALO,
      }),
      Plot.text([RETREAT.at(-1)], {
        x: "lon",
        y: "men",
        text: () => `${HOME.toLocaleString()} come back`,
        fill: ACCENT,
        fontSize: 11,
        fontWeight: 700,
        textAnchor: "start",
        dx: 4,
        dy: -14,
        ...HALO,
      }),

      // Cities, as dropped ticks under the band.
      Plot.text(CITIES, {
        x: "lon",
        y: 348_000,
        text: "name",
        fill: MUTED,
        fontSize: 10,
        fontWeight: 600,
        textAnchor: "middle",
        ...HALO,
      }),
      Plot.ruleX(CITIES, {
        x: "lon",
        y1: STRIP_BOTTOM,
        y2: 338_000,
        stroke: GUIDE,
        strokeOpacity: 0.5,
        strokeDasharray: "2,4",
      }),

      // ── Minard's temperature panel, mapped into the reserved strip ────────
      Plot.ruleY([toStrip(0)], { stroke: "currentColor", strokeOpacity: 0.25 }),
      Plot.line(tempRow, { x: "lon", y: "y", stroke: MUTED, strokeWidth: 1.6, clip: true }),
      Plot.dot(tempRow, { x: "lon", y: "y", fill: MUTED, r: 2.6 }),
      // Only the readings far enough apart to label without collision. Minard
      // printed all nine on a wider plate; here the curve carries the rest.
      Plot.text(
        tempRow.filter((d) => LABELLED_DATES.has(d.date)),
        {
          x: "lon",
          y: "y",
          text: (d) => `${d.reaumur}°R, ${Math.round(d.celsius)}°C\n${d.date}`,
          fill: MUTED,
          fontSize: 10,
          fontWeight: 600,
          lineHeight: 1.3,
          textAnchor: "middle",
          dy: 17,
          ...HALO,
        },
      ),
      Plot.text([{}], {
        x: 38.2,
        y: toStrip(0),
        text: () => "Temperature\non the retreat,\nMinard's own\nRéaumur scale",
        fill: MUTED,
        fontSize: 10,
        fontWeight: 600,
        lineHeight: 1.45,
        textAnchor: "start",
        dx: 8,
        dy: 18,
        ...HALO,
      }),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
