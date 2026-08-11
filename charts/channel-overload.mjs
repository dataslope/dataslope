/**
 * Four encodings at once, and the same finding with two.
 *
 * The section this sits under is "just because you can". Every channel on the
 * left panel is used correctly: position for two measures, area for a third,
 * color for a category, shape for a second category. Nothing is scaled wrong
 * and nothing is mis-mapped. The chart is still unreadable, because the reader
 * has to decode four channels simultaneously to answer any question, and the
 * one thing the author actually wanted to say is nowhere in particular.
 *
 * The right panel says that one thing. Two channels, position and a single
 * color that marks the group being talked about, everything else dropped. It
 * is not a prettier version of the left panel; it is a *narrower* one, and the
 * information that went missing is information nobody was reading.
 *
 * Both panels are the same rows, so the comparison is honest: the argument is
 * about what the reader can extract, not about two different datasets. And the
 * left panel is drawn as competently as the encoding allows, because an overload
 * chart built badly proves only that it was built badly.
 */
import { Plot, plot, ACCENT, HALO, MUTED, SERIES, rng } from "./_theme.mjs";

export const title =
  "The same scatter twice. On the left, marks vary in position, size, color and shape all at once, and no pattern stands out. On the right, the same points carry position only, with one group in a strong color and the rest muted, and that group's separation is immediately visible.";

const REGIONS = ["North", "South", "East", "West"];
const SEGMENTS = ["Retail", "Trade"];
const HERO = "West";

const u = rng(31415);
function gauss() {
  const a = Math.max(u(), Number.EPSILON);
  const b = u();
  return Math.sqrt(-2 * Math.log(a)) * Math.cos(2 * Math.PI * b);
}

/** The finding is that one region sits low on margin at every spend level.
 *  It is in the data on both panels; only the left panel hides it. */
const POINTS = REGIONS.flatMap((region) =>
  SEGMENTS.flatMap((segment) =>
    Array.from({ length: 15 }, () => {
      const spend = 8 + u() * 52;
      const penalty = region === HERO ? 7.5 : 0;
      return {
        region,
        segment,
        spend,
        margin: 34 - penalty + spend * 0.13 + gauss() * 2.6,
        headcount: 4 + u() * 26,
      };
    }),
  ),
);

const PANELS = ["Four channels at once", "One thing, said once"];
const ROWS = PANELS.flatMap((panel) => POINTS.map((p) => ({ panel, ...p })));

const COLOR = Object.fromEntries(REGIONS.map((r, i) => [r, SERIES[i]]));
const SHAPE = { Retail: "circle", Trade: "square" };

export const caption = `Same rows in both panels. On the left, four channels are in play and every one of them is used correctly: position for spend and margin, area for headcount, color for region, shape for segment. It is still unreadable, because answering any question means decoding four things at once and none of them is emphasised over the others. On the right the same data carries position and a single highlight, and the finding, that one region runs a lower margin at every level of spend, is simply visible. The channels removed were not carrying the argument; they were competing with it. Add a channel when a question needs it, not because the data has another column.`;

export function render() {
  return plot({
    height: 360,
    marginTop: 30,
    marginLeft: 54,
    marginRight: 30,
    marginBottom: 50,
    ariaLabel: title,
    x: { label: "Marketing spend (£k)", labelAnchor: "center", ticks: 5 },
    y: { label: "Margin (%)", ticks: 5 },
    fx: { domain: PANELS, label: null },
    r: { range: [1.6, 7] },
    marks: [
      // Left: everything at once, drawn as well as the encoding permits.
      Plot.dot(ROWS.filter((d) => d.panel === PANELS[0]), {
        x: "spend",
        y: "margin",
        fx: "panel",
        r: "headcount",
        fill: (d) => COLOR[d.region],
        fillOpacity: 0.7,
        symbol: (d) => SHAPE[d.segment],
      }),

      // Right: position, plus one color that says which group is being talked
      // about. Same rows, two channels.
      Plot.dot(ROWS.filter((d) => d.panel === PANELS[1] && d.region !== HERO), {
        x: "spend",
        y: "margin",
        fx: "panel",
        r: 3,
        fill: MUTED,
        fillOpacity: 0.45,
      }),
      Plot.dot(ROWS.filter((d) => d.panel === PANELS[1] && d.region === HERO), {
        x: "spend",
        y: "margin",
        fx: "panel",
        r: 3.4,
        fill: ACCENT,
      }),
      Plot.text([{ panel: PANELS[1] }], {
        x: () => 58,
        y: () => 30,
        fx: "panel",
        text: () => `${HERO}: lower margin\nat every spend level`,
        fill: ACCENT,
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.3,
        textAnchor: "end",
        ...HALO,
      }),
      Plot.text([{ panel: PANELS[0] }], {
        x: () => 58,
        y: () => 30,
        fx: "panel",
        text: () => "the same finding\nis in here somewhere",
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.3,
        textAnchor: "end",
        ...HALO,
      }),
    ],
    // The categorical scale would otherwise emit literal hex, which is wrong in
    // one of the two themes and rejected by the build.
    color: { type: "ordinal", range: SERIES },
  });
}
