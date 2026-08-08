/**
 * The generational hypothesis, which is the reason a managed runtime can
 * collect garbage in under a millisecond most of the time.
 *
 * Nearly every object a program allocates is dead almost immediately: a
 * string built for one line of output, the boxed result of one comparison, the
 * iterator behind one `foreach`. A small minority survive their first
 * collection, and of those a smaller minority survive the second, and what is
 * left is the long-lived program state: caches, configuration, the object
 * graph the application is actually made of.
 *
 * A collector that assumed a uniform lifetime would have to walk everything
 * every time. A generational collector exploits the shape instead: it scans
 * only the youngest region, where almost nothing is alive, and promotes the
 * survivors out of the way. The cost of a gen-0 collection is proportional to
 * what *survives*, and by construction that is a rounding error.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Share of allocated objects still alive against age, measured in collections survived. The curve falls very steeply through the first two collections and then flattens into a small, long-lived remainder.";

const GENERATIONS = 8;

/** A steep decay to a small floor: most objects die immediately, and what
 *  survives two collections mostly survives forever. */
const FLOOR = 0.018;
const curve = (g) => FLOOR + (1 - FLOOR) * Math.exp(-1.65 * g);

const rows = Array.from({ length: GENERATIONS + 1 }, (_, g) => ({ g, alive: curve(g) }));

const GEN0 = curve(1);
const GEN1 = curve(2);

const REGIONS = [
  { label: "gen 0", from: 0, to: 1 },
  { label: "gen 1", from: 1, to: 2 },
  { label: "gen 2", from: 2, to: GENERATIONS },
];

export const caption = `Most objects a program allocates are dead almost immediately: a string built for one line of output, an iterator behind one \`foreach\`. Only about ${(GEN0 * 100).toFixed(0)}% survive their first collection and ${(GEN1 * 100).toFixed(0)}% their second, and what is left is the long-lived state the application is actually made of. A generational collector is that observation turned into a design: it scans only the youngest region, where the cost is proportional to what survives, which is almost nothing.`;

export function render() {
  return plot({
    height: 320,
    marginTop: 30,
    marginLeft: 62,
    marginRight: 24,
    marginBottom: 46,
    ariaLabel: title,
    x: {
      label: "Collections survived",
      labelAnchor: "center",
      domain: [0, GENERATIONS],
      ticks: GENERATIONS + 1,
    },
    y: { label: "Still alive", domain: [0, 1.04], ticks: 5, tickFormat: "%" },
    marks: [
      Plot.areaY(rows, { x: "g", y: "alive", fill: PRIMARY, fillOpacity: 0.2 }),
      Plot.line(rows, { x: "g", y: "alive", stroke: PRIMARY, strokeWidth: 2 }),
      ...REGIONS.map((r) =>
        Plot.text([{}], {
          x: (r.from + r.to) / 2,
          y: 1.0,
          text: () => r.label,
          fill: MUTED,
          fontSize: 11,
          fontWeight: 600,
          ...HALO,
        }),
      ),
      Plot.ruleX([1, 2], { stroke: MUTED, strokeOpacity: 0.5, strokeDasharray: "4 3" }),
      Plot.dot([{ g: 1, alive: GEN0 }], { x: "g", y: "alive", fill: ACCENT, r: 4 }),
      Plot.text([{}], {
        x: 2.6,
        y: 0.52,
        text: () =>
          `${(GEN0 * 100).toFixed(0)}% survive one collection.\nA collector that scans only the young\nregion pays for the survivors, not the dead.`,
        fill: MUTED,
        fontSize: 11,
        fontWeight: 600,
        lineHeight: 1.4,
        textAnchor: "start",
        ...HALO,
      }),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
