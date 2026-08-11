/**
 * Cleveland and McGill's ranking of graphical encodings, which is the reason
 * this course keeps saying "use position, then length, and only then
 * anything else".
 *
 * Their 1984 experiments asked people to judge the same ratios shown five
 * ways and measured how far off the answers were. The ordering that came out
 * is not a matter of taste, and it is why a bar chart beats a pie chart at the
 * same job: the bar asks you to compare two lengths on a common scale, which
 * people do well, and the pie asks you to compare two angles, which they do
 * about twice as badly.
 *
 * Error is drawn relative to position-on-a-common-scale, so the axis reads as
 * "how many times worse than the best encoding" and needs no units.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Five graphical encodings ranked by how accurately people judge them. Position on a common scale is the most accurate; length is close behind; angle, area and color saturation are progressively worse, with color about three times the error of position.";

export const caption =
  "How far off people are when judging the same ratio shown five different ways. Position and length are what a bar chart uses; angle is what a pie chart uses. The ranking is measured, not a matter of taste.";

// Relative error from the Cleveland & McGill position-length experiments and
// the follow-up work that extended the ranking to area and color. Rounded,
// and normalised so position = 1.
const ENCODINGS = [
  { key: "Position\non a common scale", error: 1.0, example: "scatter, dot plot" },
  { key: "Length", error: 1.4, example: "bar chart" },
  { key: "Angle", error: 1.8, example: "pie chart" },
  { key: "Area", error: 2.5, example: "bubble chart" },
  { key: "Color saturation", error: 3.0, example: "heatmap" },
];

export function render() {
  return plot({
    height: 340,
    marginTop: 26,
    marginLeft: 148,
    marginRight: 128,
    marginBottom: 46,
    ariaLabel: title,
    x: {
      label: "Judgement error, relative to position",
      labelAnchor: "center",
      domain: [0, 3.4],
      ticks: [1, 2, 3],
      tickFormat: (d) => `${d}×`,
    },
    y: { label: null, domain: ENCODINGS.map((e) => e.key), padding: 0.34, grid: false },
    marks: [
      Plot.barX(ENCODINGS, {
        x: "error",
        y: "key",
        fill: (d) => (d.error === 1 ? PRIMARY : MUTED),
        fillOpacity: (d) => (d.error === 1 ? 0.6 : 0.4),
      }),
      Plot.text(ENCODINGS, {
        x: "error",
        y: "key",
        text: "example",
        fill: MUTED,
        fontSize: 11.5,
        textAnchor: "start",
        dx: 10,
        ...HALO,
      }),
      Plot.ruleX([1], { stroke: ACCENT, strokeWidth: 1.5, strokeDasharray: "4,3" }),
    ],
  });
}
