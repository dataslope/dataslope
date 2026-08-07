/**
 * Why a bar chart's axis starts at zero: the bar *is* the number, and the
 * chart lies the moment the two stop matching.
 *
 * Five values a couple of percent apart, drawn honestly from zero. The shaded
 * band is the window a truncated axis would show: the same five numbers, but
 * with everything below 94 cropped away, which leaves the winner's bar around
 * fifty times the height of the loser's for a real gap of five points.
 *
 * `bar-truncation-cropped` draws that window, and belongs immediately after
 * this chart in a lesson. Two figures rather than one because facets share
 * every scale, and the scale is the variable here.
 *
 * Marking the crop *in place* here is what makes the companion legible: the
 * reader has already seen how little of the range it covers before they meet
 * the chart drawn inside it.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Five bars between 94 and 99 percent, drawn from a zero baseline so they look nearly equal. A shaded band across the top marks the narrow window a truncated axis would show instead.";

const BARS = [
  { team: "Team A", value: 94.1 },
  { team: "Team B", value: 95.3 },
  { team: "Team C", value: 96.8 },
  { team: "Team D", value: 98.2 },
  { team: "Team E", value: 99.0 },
];

const CROP = 94; // where a truncated axis would start

// Quoted in the caption, and by the companion chart, rather than written out:
// a hand-typed multiplier drifts the moment a value changes.
const GAP = BARS[BARS.length - 1].value - BARS[0].value;
const EXAGGERATION = Math.round((BARS[BARS.length - 1].value - CROP) / (BARS[0].value - CROP));

export const caption =
  `The same five numbers. From zero they are nearly equal, which is the truth. Crop the axis to the shaded band and the tallest bar becomes about ${EXAGGERATION} times the shortest, for a real gap of ${GAP.toFixed(1)} points. The next chart is that crop.`;

export function render() {
  return plot({
    height: 340,
    marginTop: 34,
    marginLeft: 62,
    marginRight: 140,
    marginBottom: 46,
    ariaLabel: title,
    x: { label: null, domain: BARS.map((b) => b.team), padding: 0.3 },
    y: { label: "Score", domain: [0, 104], ticks: [0, 25, 50, 75, 100] },
    marks: [
      // The crop window, drawn first so the bars sit on top of it. No x here:
      // omitting a dimension makes a rect span the frame, and numeric bounds
      // against the band x scale silently drew nothing at all.
      Plot.rectY([{}], { y1: CROP, y2: 100, fill: ACCENT, fillOpacity: 0.12 }),
      Plot.ruleY([CROP], { stroke: ACCENT, strokeWidth: 1.5, strokeDasharray: "4,3" }),

      Plot.barY(BARS, { x: "team", y: "value", fill: PRIMARY, fillOpacity: 0.55 }),
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

      // The datum carries the band value: `x: "Team E"` on an empty object is
      // read as a *field name*, resolves to undefined, and the mark vanishes.
      Plot.text([{ team: BARS[BARS.length - 1].team }], {
        x: "team",
        y: 97,
        text: () => `what a chart starting\nat ${CROP} would show you`,
        fill: ACCENT,
        fontSize: 12,
        fontWeight: 600,
        lineHeight: 1.3,
        textAnchor: "start",
        dx: 34,
        ...HALO,
      }),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
