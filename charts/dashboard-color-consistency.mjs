/**
 * What "same colours mean the same thing" buys, and what breaks without it.
 *
 * The four regions and their numbers are identical in both rows. The only
 * difference is what decides the colour. In the top row it is the ranking
 * inside each panel, which is what every plotting library does by default when
 * a chart is sorted before it is drawn: the palette is handed out in drawing
 * order, so the darkest bar means "biggest here" and nothing else. North is
 * one colour in Q1 and another in Q2, and a reader who learned the key on the
 * first panel has to unlearn it on the second.
 *
 * In the bottom row the colour is bound to the region, so the key is learned
 * once and holds everywhere, including on the charts elsewhere on the page.
 * That is the whole of the rule: a colour is a variable, and rebinding a
 * variable between two panels the reader is comparing costs them the
 * comparison.
 *
 * Faceted honestly: all four panels are orders in thousands on one axis, so
 * the shared scale is the right shared scale.
 */
import { Plot, plot, HALO, MUTED, SERIES } from "./_theme.mjs";

export const title =
  "Four panels of the same four regions in two quarters. In the top row each panel's colours are handed out by rank, so a region changes colour between quarters; in the bottom row each region keeps one colour across both.";

const REGIONS = ["North", "South", "East", "West"];

const QUARTERS = [
  { key: "Q1", values: { North: 84, South: 61, East: 47, West: 33 } },
  { key: "Q2", values: { North: 52, South: 78, East: 39, West: 66 } },
];

const BY_RANK = "Colour by rank";
const BY_REGION = "Colour by region";

const rows = QUARTERS.flatMap((q) => {
  const ranked = [...REGIONS].sort((a, b) => q.values[b] - q.values[a]);
  return REGIONS.flatMap((region) => [
    {
      panel: BY_RANK,
      quarter: q.key,
      region,
      value: q.values[region],
      color: SERIES[ranked.indexOf(region)],
    },
    {
      panel: BY_REGION,
      quarter: q.key,
      region,
      value: q.values[region],
      color: SERIES[REGIONS.indexOf(region)],
    },
  ]);
});

export const caption =
  "The same eight numbers twice. In the top row the palette is handed out in drawing order, so North is one colour in Q1 and another in Q2 and the legend has to be read again for every panel. In the bottom row colour is bound to the region, and the reader learns the key once. Same axes, same periods, same colours: that is the consistency rule in full.";

export function render() {
  return plot({
    height: 340,
    marginTop: 30,
    marginLeft: 62,
    marginRight: 118,
    marginBottom: 44,
    ariaLabel: title,
    fx: { label: null, domain: ["Q1", "Q2"] },
    fy: { label: null, domain: [BY_RANK, BY_REGION] },
    x: { label: "Orders (thousands)", labelAnchor: "center", domain: [0, 92], ticks: 4 },
    y: { label: null, domain: REGIONS, padding: 0.28, grid: false },
    marks: [
      Plot.barX(rows, {
        fx: "quarter",
        fy: "panel",
        y: "region",
        x: "value",
        fill: "color",
        fillOpacity: 0.75,
      }),
      Plot.text(rows.filter((d) => d.panel === BY_RANK && d.region === "North"), {
        fx: "quarter",
        fy: "panel",
        y: "region",
        x: "value",
        text: () => "North",
        fill: MUTED,
        fontSize: 10,
        fontWeight: 600,
        textAnchor: "start",
        dx: 6,
        ...HALO,
      }),
      Plot.ruleX([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
