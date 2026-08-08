/**
 * The failure a full green test suite does not see.
 *
 * Tests assert properties of the rows that arrived: this key is unique, this
 * column is not null, this value is in the accepted set. Every one of them
 * passes on the right-hand half of this chart, because the rows still there
 * are perfectly well-formed. What changed is how many of them there are, and
 * no assertion in the project mentions that.
 *
 * That is the line between testing and observability. Testing checks the
 * things you thought to write down; observability watches the shape of the
 * data itself (volume, freshness, distribution, cardinality) and flags a
 * departure from what it has been doing, including the departures nobody
 * predicted. The band is a rolling expectation rather than a fixed floor, so
 * it follows the weekly cycle instead of firing every Sunday.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY, rng } from "./_theme.mjs";

export const title =
  "Daily row counts loaded into a table over twelve weeks, with a rolling expected band. The counts track the band through a weekly cycle and then drop well below it after an upstream change, while every column-level test keeps passing.";

const DAYS = 84;
const BREAK = 62;
const u = rng(7);

/** A weekly cycle with weekend troughs, plus noise, and an upstream filter
 *  change on day 62 that silently drops a third of the rows. */
const rows = Array.from({ length: DAYS }, (_, d) => {
  const weekly = d % 7 >= 5 ? 0.62 : 1;
  const base = 50_000 * weekly * (1 + 0.04 * (u() - 0.5));
  const loaded = d >= BREAK ? base * 0.66 : base;
  return {
    d,
    loaded: Math.round(loaded),
    expected: Math.round(50_000 * weekly),
    broken: d >= BREAK,
  };
});

const band = rows.map((r) => ({ ...r, lo: r.expected * 0.9, hi: r.expected * 1.1 }));
const DROP = 1 - rows.at(-1).loaded / rows.at(-1).expected;

export const caption = `Every test in the project is green on the right-hand side of this chart: the rows that arrived are unique, non-null and in the accepted set. What changed is that a third of them stopped arriving, and no assertion mentions volume. Tests check the properties you thought to write down; observability watches the shape of the data (volume, freshness, distribution, cardinality) and flags a departure from what it has been doing. The band is a rolling expectation, so it follows the weekend trough instead of firing every Sunday. Here it catches a ${(DROP * 100).toFixed(0)}% shortfall the suite cannot see.`;

export function render() {
  return plot({
    height: 320,
    marginTop: 26,
    marginLeft: 66,
    marginRight: 108,
    marginBottom: 46,
    ariaLabel: title,
    x: { label: "Day", labelAnchor: "center", domain: [0, DAYS - 1], ticks: 6 },
    y: {
      label: "Rows loaded",
      domain: [0, 62_000],
      ticks: 4,
      tickFormat: (d) => `${Math.round(d / 1000)}k`,
    },
    marks: [
      Plot.areaY(band, { x: "d", y1: "lo", y2: "hi", fill: PRIMARY, fillOpacity: 0.16 }),
      Plot.line(rows.filter((r) => !r.broken), {
        x: "d",
        y: "loaded",
        stroke: PRIMARY,
        strokeWidth: 1.7,
      }),
      Plot.line(rows.filter((r) => r.broken), {
        x: "d",
        y: "loaded",
        stroke: ACCENT,
        strokeWidth: 1.7,
      }),
      Plot.text([{}], {
        x: DAYS - 1,
        y: rows.at(-1).loaded,
        text: () => "upstream filter\nchanged here",
        fill: ACCENT,
        fontSize: 11,
        fontWeight: 600,
        lineHeight: 1.35,
        textAnchor: "start",
        dx: 8,
        ...HALO,
      }),
      Plot.text([{}], {
        x: 2,
        y: 12_000,
        text: () => "every not_null, unique and accepted_values test: still green",
        fill: MUTED,
        fontSize: 11,
        fontWeight: 600,
        textAnchor: "start",
        ...HALO,
      }),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
