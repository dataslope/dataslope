/**
 * The mistake that makes most choropleths a population map.
 *
 * Shading a region by a raw count shades it by how many people live there.
 * Cases, sales, complaints, crimes, library loans: every one of them is
 * roughly proportional to population before it is anything else, so the map
 * comes out looking like the census and reports nothing the reader did not
 * already know. Dividing by population is what turns it back into a map of the
 * thing being measured, and it routinely reverses the ranking.
 *
 * Drawn as a scatter of count against population rather than as a map, because
 * a map would need real geography to be honest and the relationship is the
 * whole point: the counts lie close to a line through the origin, which is
 * exactly the statement "this is a population map". The two regions furthest
 * from that line are the ones with something to report, and both are invisible
 * on the count map.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Reported cases against population for twelve regions. Almost all lie close to a line through the origin, so a map shaded by raw count would be a population map; the two regions well off the line are the ones with a real story.";

/** Population in hundreds of thousands, and a count that is mostly population
 *  times a shared base rate, with two regions genuinely off it. */
const BASE = 4.2;
const REGIONS = [
  { key: "Northvale", pop: 88, factor: 1.02 },
  { key: "Eastport", pop: 71, factor: 0.97 },
  { key: "Kestrel", pop: 63, factor: 1.05 },
  { key: "Ashford", pop: 54, factor: 0.94 },
  { key: "Brightwater", pop: 47, factor: 1.01 },
  { key: "Marlow", pop: 39, factor: 0.99 },
  { key: "Ferngate", pop: 33, factor: 1.03 },
  { key: "Holt", pop: 27, factor: 0.96 },
  { key: "Redcliff", pop: 21, factor: 2.35 },
  { key: "Selby", pop: 18, factor: 1.0 },
  { key: "Ivering", pop: 12, factor: 0.98 },
  { key: "Wren", pop: 61, factor: 0.42 },
];

const rows = REGIONS.map((r) => ({
  ...r,
  cases: Math.round(r.pop * BASE * r.factor),
  rate: BASE * r.factor,
})).map((r) => ({ ...r, notable: Math.abs(r.factor - 1) > 0.3 }));

const byCount = [...rows].sort((a, b) => b.cases - a.cases);
const byRate = [...rows].sort((a, b) => b.rate - a.rate);

const MAX_POP = Math.max(...rows.map((r) => r.pop));

export const caption = `Twelve regions, plotted as reported cases against population. Nearly all of them sit on a line through the origin, which is the whole problem: a map shaded by raw count is shading by how many people live there, so it comes out looking like the census and reports nothing new. By count the worst region is ${byCount[0].key}; by rate it is ${byRate[0].key}, which is ${byCount.findIndex((r) => r.key === byRate[0].key) + 1}th by count and invisible on the count map. ${byRate.at(-1).key} is the mirror image: large, unremarkable by count, and the lowest rate on the list. Divide by population, and say so in the legend.`;

export function render() {
  return plot({
    height: 330,
    marginTop: 26,
    marginLeft: 62,
    marginRight: 30,
    marginBottom: 46,
    ariaLabel: title,
    x: { label: "Population (100k)", labelAnchor: "center", domain: [0, MAX_POP * 1.12], ticks: 5 },
    y: { label: "Reported cases", domain: [0, 420], ticks: 5 },
    marks: [
      // "Everyone at the same rate": the line a count map is really drawing.
      Plot.link([{}], {
        x1: 0,
        y1: 0,
        x2: MAX_POP * 1.12,
        y2: MAX_POP * 1.12 * BASE,
        stroke: GUIDE,
        strokeDasharray: "5 4",
      }),
      Plot.text([{}], {
        x: MAX_POP * 0.66,
        y: MAX_POP * 0.66 * BASE,
        text: () => "everyone at the same rate",
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "start",
        dx: 6,
        dy: 14,
        ...HALO,
      }),
      Plot.dot(rows, {
        x: "pop",
        y: "cases",
        r: (d) => (d.notable ? 6 : 4),
        fill: (d) => (d.notable ? ACCENT : PRIMARY),
        fillOpacity: (d) => (d.notable ? 0.95 : 0.6),
      }),
      Plot.text(rows.filter((d) => d.notable), {
        x: "pop",
        y: "cases",
        text: (d) => `${d.key}\n${d.rate.toFixed(1)} per 100k`,
        fill: ACCENT,
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.3,
        textAnchor: "start",
        dx: 10,
        dy: -6,
        ...HALO,
      }),
      Plot.text([{}], {
        x: MAX_POP * 0.02,
        y: 390,
        text: () => "a map shaded by the y axis is a map of the x axis",
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
