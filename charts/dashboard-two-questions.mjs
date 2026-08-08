/**
 * One chart, two questions, one wrong answer.
 *
 * A stacked area is a good chart for "is the total growing?" and a bad chart
 * for "is this band growing?", because only the bottom band is measured from
 * zero. Every other band sits on a baseline that moves, so its top edge
 * inherits the movement of everything underneath it, and the eye reads the top
 * edge.
 *
 * Web is flat at 20 orders a week for the entire year. Drawn as the second
 * band, its top edge climbs from 30 to 95, which is Mobile's growth showing
 * through. The dashed rule is Web measured from zero, in the same units on the
 * same axis, so the comparison needs no second scale and no second chart: the
 * band climbs, the truth is flat.
 *
 * Areas are drawn with explicit `y1`/`y2` rather than through Plot's stack
 * transform, because the stacking order *is* the subject here and inferring it
 * from the input order would make the point depend on an implementation
 * detail.
 */
import { Plot, plot, ACCENT, HALO, MUTED, SERIES } from "./_theme.mjs";

export const title =
  "A stacked area chart of weekly orders across four channels. The Web band keeps a constant thickness all year, but because it is stacked on top of a growing Mobile band its upper edge climbs steeply, while a dashed reference line shows Web's own level is flat.";

const WEEKS = 26;
const at = (w) => w / (WEEKS - 1);

/** Bottom to top. Web is deliberately second: first would be measured from
 *  zero and there would be nothing to show. */
const CHANNELS = [
  { key: "Mobile", f: (w) => 10 + 65 * at(w) },
  { key: "Web", f: () => 20 },
  { key: "Partner", f: (w) => 8 + 10 * at(w) },
  { key: "Retail", f: (w) => 14 - 4 * at(w) },
];

const WEB = CHANNELS[1].f(0);

// Cumulative bounds per week, computed here so the stack order is explicit.
const rows = [];
for (let w = 0; w < WEEKS; w++) {
  let base = 0;
  for (const [i, c] of CHANNELS.entries()) {
    const v = c.f(w);
    rows.push({ key: c.key, color: SERIES[i], w, y1: base, y2: base + v });
    base += v;
  }
}

const band = rows.filter((d) => d.key === "Web");
const EDGE_START = band[0].y2;
const EDGE_END = band.at(-1).y2;

export const caption = `Web sells exactly ${WEB} orders a week for the whole year. Stacked second, its upper edge climbs from ${EDGE_START} to ${EDGE_END}, because it is carrying Mobile's growth underneath it. The chart answers "is the total growing?" perfectly and "is Web growing?" backwards. One question per chart is not a style rule; it is what stops a reader taking the right answer to the wrong question.`;

export function render() {
  return plot({
    height: 340,
    marginTop: 26,
    marginLeft: 56,
    marginRight: 104,
    marginBottom: 46,
    ariaLabel: title,
    x: { label: "Week", labelAnchor: "center", domain: [0, WEEKS - 1], ticks: 6 },
    y: { label: "Orders per week", domain: [0, 145], ticks: 5 },
    marks: [
      Plot.areaY(rows, {
        x: "w",
        y1: "y1",
        y2: "y2",
        z: "key",
        fill: "color",
        fillOpacity: (d) => (d.key === "Web" ? 0.85 : 0.3),
      }),
      Plot.ruleY([WEB], { stroke: ACCENT, strokeWidth: 1.6, strokeDasharray: "5 4" }),
      Plot.text([{}], {
        x: 0.4,
        y: WEB,
        text: () => `Web, measured from zero: ${WEB} every week`,
        fill: ACCENT,
        fontSize: 11,
        fontWeight: 600,
        textAnchor: "start",
        dy: -9,
        ...HALO,
      }),
      ...CHANNELS.map((c, i) =>
        Plot.text([rows.filter((d) => d.key === c.key).at(-1)], {
          x: WEEKS - 1,
          y: (d) => (d.y1 + d.y2) / 2,
          text: () => c.key,
          fill: SERIES[i],
          fontSize: 11,
          fontWeight: 600,
          textAnchor: "start",
          dx: 8,
          ...HALO,
        }),
      ),
      Plot.text([{}], {
        x: WEEKS * 0.46,
        y: 118,
        text: () => "the Web band never gets thicker,\nonly higher",
        fill: MUTED,
        fontSize: 11,
        fontWeight: 600,
        lineHeight: 1.35,
        textAnchor: "middle",
        ...HALO,
      }),
    ],
  });
}
