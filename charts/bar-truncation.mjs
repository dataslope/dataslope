/**
 * Why a bar chart's axis starts at zero: the bar *is* the number, and the
 * chart lies the moment the two stop matching.
 *
 * Five values a couple of percent apart, drawn honestly from zero. The shaded
 * band is the window a truncated axis would show — the same five numbers, but
 * with the bottom 94% of every bar cropped away, so the winner's bar ends up
 * roughly six times the height of the loser's for a gap of five points.
 *
 * Drawn as one chart with the crop marked rather than two charts side by side,
 * because the point is precisely that the second chart is a *view* of this
 * one. Showing the crop in place makes the exaggeration a measurable distance
 * on the page instead of an assertion in a caption.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Five bars between 94 and 99 percent, drawn from a zero baseline so they look nearly equal. A shaded band across the top marks the narrow window a truncated axis would show instead.";

export const caption =
  "The same five numbers. From zero they are nearly equal, which is the truth. Crop the axis to the shaded band and the top bar becomes about six times the bottom one, for a real gap of five points.";

const BARS = [
  { team: "Team A", value: 94.1 },
  { team: "Team B", value: 95.3 },
  { team: "Team C", value: 96.8 },
  { team: "Team D", value: 98.2 },
  { team: "Team E", value: 99.0 },
];

const CROP = 94; // where a truncated axis would start

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
      // The crop window, drawn first so the bars sit on top of it.
      Plot.rect([{}], {
        x1: -0.5,
        x2: BARS.length,
        y1: CROP,
        y2: 100,
        fill: ACCENT,
        fillOpacity: 0.12,
      }),
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

      Plot.text([{}], {
        x: "Team E",
        y: 97,
        text: () => "what a chart starting\nat 94 would show you",
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
