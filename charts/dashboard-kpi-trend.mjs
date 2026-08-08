/**
 * Why the big number at the top is not enough on its own, and what the row of
 * time-series charts underneath it is for.
 *
 * Four businesses, four completely different years, one identical headline
 * figure this month. A KPI tile reports the endpoint of a path and throws the
 * path away, which is fine when the reader already knows the shape and useless
 * when they do not: "£120k this month" is good news, bad news or a crisis
 * depending on which of these curves produced it.
 *
 * That is the whole argument for the middle band of a dashboard. The number
 * answers "where are we?", the trend answers "how did we get here, and where
 * is it going?", and only the second one tells anybody what to do.
 */
import { Plot, plot, HALO, MUTED, SERIES } from "./_theme.mjs";

export const title =
  "Four monthly revenue series over one year that all finish at the same value: one flat, one climbing steadily, one falling from a much higher peak, and one that spiked mid-year and fell back. A single headline number cannot tell them apart.";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const END = 120;

/** Four paths to the same December. Written as explicit series rather than
 *  formulas so each shape is exactly the story its label claims. */
// Colours picked per shape rather than taken in palette order: the palette is
// non-semantic, but a *declining* series drawn in green and a recovery drawn
// in red is a needless fight with the reader's priors.
const SHAPES = [
  {
    key: "Steady",
    color: SERIES[0],
    values: [118, 121, 119, 122, 118, 120, 121, 119, 122, 120, 119, END],
  },
  {
    key: "Growing",
    color: SERIES[2],
    values: [62, 68, 71, 79, 84, 88, 95, 99, 104, 110, 115, END],
  },
  {
    key: "Declining",
    color: SERIES[5],
    values: [196, 188, 179, 173, 166, 158, 150, 144, 137, 131, 125, END],
  },
  {
    key: "Spiked",
    color: SERIES[3],
    values: [117, 120, 118, 152, 186, 174, 149, 128, 118, 121, 119, END],
  },
];

const rows = SHAPES.flatMap((s) =>
  s.values.map((v, m) => ({ key: s.key, color: s.color, month: m, value: v })),
);

export const caption = `Four very different years, one identical headline figure in December. The tile at the top of the dashboard reports the endpoint and discards the path, so it cannot separate a business that is steady from one that is halfway down a slide. That is what the band of time-series charts under the headline row is for.`;

export function render() {
  return plot({
    height: 330,
    marginTop: 26,
    marginLeft: 60,
    marginRight: 96,
    marginBottom: 44,
    ariaLabel: title,
    x: {
      label: null,
      domain: [0, MONTHS.length - 1],
      ticks: [0, 2, 4, 6, 8, 10, 11],
      tickFormat: (d) => MONTHS[d],
    },
    y: { label: "Revenue (£k)", domain: [0, 210], ticks: 5 },
    marks: [
      Plot.line(rows, {
        x: "month",
        y: "value",
        z: "key",
        stroke: "color",
        strokeWidth: 1.9,
      }),
      ...SHAPES.map((s, i) =>
        Plot.text([{}], {
          x: MONTHS.length - 1,
          y: END,
          text: () => s.key,
          fill: s.color,
          fontSize: 11,
          fontWeight: 600,
          textAnchor: "start",
          dx: 10,
          dy: -34 + i * 15,
          ...HALO,
        }),
      ),
      Plot.dot([{}], { x: MONTHS.length - 1, y: END, fill: MUTED, r: 3.4 }),
      Plot.text([{}], {
        x: 0.2,
        y: END + 16,
        text: () => `all four report "£${END}k" this month`,
        fill: MUTED,
        fontSize: 11.5,
        fontWeight: 600,
        textAnchor: "start",
        ...HALO,
      }),
    ],
  });
}
