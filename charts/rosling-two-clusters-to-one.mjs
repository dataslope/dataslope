/**
 * The finding Hans Rosling built the animation to deliver, standing still.
 *
 * The Gapminder bubbles are famous because of the motion, and the motion is
 * doing real work: it holds identity constant while time changes, so you watch
 * a country move rather than compare two pictures. But an animation has one
 * bad property for a teaching page. You cannot look at the end and the
 * beginning at once, so you cannot check a claim about the difference between
 * them, and the claim was the whole point.
 *
 * Rosling's claim was that the world stopped being two worlds. In 1960 you
 * could sort almost every country into a rich long-lived group and a poor
 * short-lived one, and the vocabulary of the time ("developed", "developing",
 * "third world") encoded that split as though it were permanent. It was not.
 *
 * A dumbbell puts both ends on one line, which is what makes the pattern
 * checkable: the length of a bar is the gain, and the bars are sorted by where
 * each country started. If the split were permanent the bars would all be
 * about the same length and the order would be preserved. Instead the longest
 * bars are almost all at the bottom, where the countries that started worst
 * are, and the ranking at the right end barely resembles the ranking at the
 * left.
 *
 * The two exceptions matter as much as the rule, and both are visible without
 * being pointed at, which is the test of whether a chart is honest.
 *
 * ── On the numbers ─────────────────────────────────────────────────────────
 *
 * Life expectancy at birth, World Bank series, rounded to whole years. A
 * sample of large or otherwise well-known countries rather than all of them:
 * the full set is what the bubbles show, and a legible dumbbell has room for
 * about twenty rows.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY, mean } from "./_theme.mjs";

export const title =
  "Life expectancy in eighteen countries in 1960 and 2010, as one bar per country running from the earlier value to the later one, sorted by the 1960 value. The countries that started lowest gained the most, so a spread of forty years narrows sharply, with Russia and South Africa as the two visible exceptions.";

/** [country, life expectancy 1960, life expectancy 2010]. */
const COUNTRIES = [
  ["Mali", 28, 57],
  ["Nigeria", 37, 51],
  ["Ethiopia", 38, 63],
  ["India", 41, 67],
  ["China", 44, 75],
  ["Bangladesh", 46, 70],
  ["Turkey", 46, 74],
  ["Egypt", 48, 70],
  ["Indonesia", 49, 68],
  ["South Africa", 49, 56],
  ["Brazil", 55, 73],
  ["South Korea", 55, 80],
  ["Mexico", 57, 74],
  ["Vietnam", 59, 75],
  ["Russia", 66, 69],
  ["Japan", 68, 83],
  ["Germany", 69, 80],
  ["United States", 70, 79],
].map(([name, y1960, y2010]) => ({ name, y1960, y2010, gain: y2010 - y1960 }));

const rows = [...COUNTRIES].sort((a, b) => a.y1960 - b.y1960);
const ORDER = rows.map((d) => d.name);

/** A country gains less than this and the bar is worth explaining. */
const STALLED = 8;
const stalled = rows.filter((d) => d.gain < STALLED);

const sd = (xs) => {
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
};
const SD_1960 = sd(rows.map((d) => d.y1960));
const SD_2010 = sd(rows.map((d) => d.y2010));
const BIGGEST = rows.reduce((a, b) => (b.gain > a.gain ? b : a));

export const caption = `Both ends of the Gapminder story on one line: each bar runs from a country's 1960 life expectancy to its 2010 one, sorted by where it started. ${BIGGEST.name} alone gains ${BIGGEST.gain} years, and the spread falls from about ${SD_1960.toFixed(0)} years to ${SD_2010.toFixed(0)}.`;

export function render() {
  return plot({
    height: 430,
    marginTop: 30,
    marginLeft: 112,
    marginRight: 66,
    marginBottom: 48,
    ariaLabel: title,
    x: {
      label: "Life expectancy at birth (years)",
      labelAnchor: "center",
      domain: [24, 88],
      ticks: [30, 40, 50, 60, 70, 80],
    },
    y: { label: null, domain: ORDER, padding: 0.42, grid: false },
    marks: [
      Plot.ruleY(ORDER, { stroke: "currentColor", strokeOpacity: 0.07 }),
      Plot.link(rows, {
        y: "name",
        x1: "y1960",
        x2: "y2010",
        stroke: (d) => (d.gain < STALLED ? ACCENT : PRIMARY),
        strokeOpacity: 0.5,
        strokeWidth: 7,
        strokeLinecap: "round",
      }),
      Plot.dot(rows, { y: "name", x: "y1960", r: 4.6, fill: MUTED }),
      Plot.dot(rows, {
        y: "name",
        x: "y2010",
        r: 4.6,
        fill: (d) => (d.gain < STALLED ? ACCENT : PRIMARY),
      }),
      Plot.text(rows, {
        y: "name",
        x: "y2010",
        text: (d) => `+${d.gain}`,
        fill: (d) => (d.gain < STALLED ? ACCENT : MUTED),
        fontSize: 10.5,
        fontWeight: 700,
        textAnchor: "start",
        dx: 10,
        ...HALO,
      }),
      // The two ends of the first row, named once, so the reader never has to
      // hunt for a legend.
      Plot.text([rows[0]], {
        y: "name",
        x: "y1960",
        text: () => "1960",
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 700,
        textAnchor: "middle",
        dy: -15,
        ...HALO,
      }),
      Plot.text([rows[0]], {
        y: "name",
        x: "y2010",
        text: () => "2010",
        fill: PRIMARY,
        fontSize: 10.5,
        fontWeight: 700,
        textAnchor: "middle",
        dy: -15,
        ...HALO,
      }),
    ],
  });
}
