/**
 * The companion to `bar-truncation`: the same five numbers, drawn on the
 * cropped axis.
 *
 * The honest chart shows the crop as a shaded band, which tells you where the
 * lie would happen but not what it looks like. This is what it looks like.
 * Team A led Team E by five points out of a hundred; with the axis starting at
 * 94, A's bar is a sliver and E's is the full height of the frame, and the
 * ratio between them is printed because no one would guess it.
 *
 * The two have to be separate charts. Facets share every scale, and the scale
 * is the variable, so a single figure cannot hold both; they are placed one
 * after the other in the lesson instead.
 *
 * Every number here is derived from the same BARS array as its sibling, so the
 * two cannot drift apart, and the exaggeration factor in the caption is
 * computed rather than asserted.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY } from "./_theme.mjs";

const BARS = [
  { team: "Team A", value: 94.1 },
  { team: "Team B", value: 95.3 },
  { team: "Team C", value: 96.8 },
  { team: "Team D", value: 98.2 },
  { team: "Team E", value: 99.0 },
];

const CROP = 94;
const TOP = 100;

const smallest = BARS[0];
const largest = BARS[BARS.length - 1];
const realGap = largest.value - smallest.value;
/** How many times taller the tallest bar looks once the axis is cropped. */
const EXAGGERATION = Math.round((largest.value - CROP) / (smallest.value - CROP));

export const title =
  "The same five scores between 94 and 99 percent, drawn on an axis that starts at 94 instead of zero. The lowest bar is a sliver and the highest fills the frame, though the real difference between them is five points.";

export const caption =
  `The same five numbers as the chart above, on an axis starting at ${CROP}. Team E's bar is now about ${EXAGGERATION} times Team A's, for a real difference of ${realGap.toFixed(1)} points out of a hundred. Nothing here is false; the bars have simply stopped meaning what their lengths say.`;

export function render() {
  return plot({
    height: 340,
    marginTop: 46,
    marginLeft: 62,
    marginRight: 140,
    marginBottom: 46,
    ariaLabel: title,
    x: { label: null, domain: BARS.map((b) => b.team), padding: 0.3 },
    // The whole point: the axis does not start at zero, and the tick labels
    // say so plainly rather than hiding it.
    y: { label: "Score", domain: [CROP, TOP], ticks: [94, 96, 98, 100] },
    marks: [
      Plot.barY(BARS, { x: "team", y: "value", fill: ACCENT, fillOpacity: 0.5, clip: true }),
      Plot.text(BARS, {
        x: "team",
        y: "value",
        text: (d) => d.value.toFixed(1),
        fill: MUTED,
        fontSize: 11.5,
        fontWeight: 600,
        dy: -10,
        ...HALO,
      }),

      // The two bars the ratio is quoted between, called out where they are.
      Plot.text([smallest, largest], {
        x: "team",
        y: CROP,
        text: (d) => (d === smallest ? "barely there" : "full height"),
        fill: ACCENT,
        fontSize: 11.5,
        fontWeight: 600,
        // Well clear of the cut line and the tick labels under it.
        dy: -26,
        ...HALO,
      }),

      Plot.text([{ team: largest.team }], {
        x: "team",
        y: TOP,
        text: () => `axis starts at ${CROP},\nnot zero`,
        fill: MUTED,
        fontSize: 12,
        fontWeight: 600,
        lineHeight: 1.3,
        textAnchor: "start",
        dx: 34,
        dy: 6,
        ...HALO,
      }),
      // Drawn heavier than the usual baseline: this rule is a *cut*, not a
      // zero, and the chart should not let it read as one.
      Plot.ruleY([CROP], { stroke: ACCENT, strokeWidth: 2, strokeDasharray: "5,3" }),
    ],
  });
}

export { BARS, CROP, EXAGGERATION };
