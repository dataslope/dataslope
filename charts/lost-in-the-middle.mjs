/**
 * The "lost in the middle" curve: how reliably a model recalls a fact given
 * where in a long context it sits.
 *
 * The lesson prints this as a row of ASCII bars, which conveys the numbers but
 * not the shape, and the shape is the finding — recall is not merely lower in
 * the middle, it is a *U*, symmetric, with both ends near-perfect. That is
 * what turns it into an actionable rule ("put it first or last") rather than a
 * vague warning that long contexts are worse.
 *
 * The values are the lesson's own stylised numbers; the caption says so. The
 * effect is well replicated, the exact heights are not a measurement.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Recall of a planted fact against its position in a long context, forming a U. Recall is 97% at the start, falls to 68% halfway through, and climbs back to 96% at the end.";

export const caption =
  "Where a fact sits in a long context changes how reliably it comes back. Both ends are recalled almost perfectly and the middle is not, so the practical rule is to put what matters first or last. Heights are illustrative; the U-shape is the replicated finding.";

const POINTS = [
  { at: 0, label: "start", recall: 0.97 },
  { at: 10, label: "10%", recall: 0.92 },
  { at: 25, label: "25%", recall: 0.81 },
  { at: 50, label: "50%", recall: 0.68 },
  { at: 75, label: "75%", recall: 0.79 },
  { at: 90, label: "90%", recall: 0.9 },
  { at: 100, label: "end", recall: 0.96 },
];

const WORST = POINTS.reduce((a, b) => (b.recall < a.recall ? b : a));

export function render() {
  return plot({
    height: 320,
    marginTop: 34,
    marginLeft: 54,
    marginRight: 30,
    ariaLabel: title,
    x: {
      label: "Where the fact sits in the context",
      labelAnchor: "center",
      domain: [-4, 104],
      ticks: POINTS.map((p) => p.at),
      tickFormat: (t) => POINTS.find((p) => p.at === t).label,
    },
    y: { label: "Recalled correctly", domain: [0.55, 1.02], ticks: 5, tickFormat: "%" },
    marks: [
      Plot.areaY(POINTS, {
        x: "at",
        y1: 0.55,
        y2: "recall",
        fill: PRIMARY,
        fillOpacity: 0.12,
        curve: "monotone-x",
      }),
      Plot.lineY(POINTS, {
        x: "at",
        y: "recall",
        stroke: PRIMARY,
        strokeWidth: 2,
        curve: "monotone-x",
      }),
      Plot.dot(POINTS, {
        x: "at",
        y: "recall",
        r: 3.6,
        fill: (d) => (d === WORST ? ACCENT : PRIMARY),
        stroke: null,
      }),
      Plot.text([WORST], {
        x: "at",
        y: "recall",
        text: (d) => `${Math.round(d.recall * 100)}% halfway through`,
        fill: ACCENT,
        fontSize: 12.5,
        fontWeight: 600,
        dy: 20,
        ...HALO,
      }),
      Plot.text([POINTS[0], POINTS[POINTS.length - 1]], {
        x: "at",
        y: "recall",
        text: (d) => `${Math.round(d.recall * 100)}%`,
        fill: MUTED,
        fontSize: 12,
        fontWeight: 600,
        dy: -14,
        ...HALO,
      }),
    ],
  });
}
