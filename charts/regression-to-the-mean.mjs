/**
 * Regression to the mean: the effect that makes useless interventions look
 * like they worked.
 *
 * Two independent noisy measurements of the same unchanging quantity, one per
 * axis. Nothing happens between them. Take the group that scored worst the
 * first time and it improves on the second; take the best and it declines.
 * Neither movement is a change in the thing being measured; both are the noise
 * that pushed them to the extreme failing to repeat.
 *
 * The two selected groups are the bottom and top deciles, and their movement is
 * computed from the sample rather than asserted, so the arrows and the caption
 * cannot disagree with the dots.
 *
 * This is why "we coached the worst performers and they improved" is not
 * evidence of anything, and why a control group is not a formality.
 */
import { Plot, plot, mean, normalSamples, ACCENT, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "A scatter of two independent measurements of the same people, with the lowest-scoring tenth on the first test highlighted; on the second test that group averages much closer to the middle, having changed in no other way.";

const N = 400;
const TRUE = normalSamples(N, 100, 10, 555);
const first = TRUE.map((t, i) => t + normalSamples(1, 0, 10, 900 + i)[0]);
const second = TRUE.map((t, i) => t + normalSamples(1, 0, 10, 4000 + i)[0]);

const rows = first.map((f, i) => ({ first: f, second: second[i] }));
const sorted = [...rows].sort((a, b) => a.first - b.first);
const K = Math.round(N / 10);
const LOW = sorted.slice(0, K);
const HIGH = sorted.slice(-K);

const stat = (g) => ({ before: mean(g.map((d) => d.first)), after: mean(g.map((d) => d.second)) });
const low = stat(LOW);
const high = stat(HIGH);
const GRAND = mean(rows.map((d) => d.first));

export const caption =
  `Two noisy measurements of the same people, with nothing done in between. The worst tenth averaged ${low.before.toFixed(0)} and then ${low.after.toFixed(0)}; the best tenth averaged ${high.before.toFixed(0)} and then ${high.after.toFixed(0)}. Both moved toward the middle because the luck that put them at the edge did not repeat. Any programme aimed at the extremes will show this, intervention or not.`;

const marked = (g, cls) => g.map((d) => ({ ...d, group: cls }));

export function render() {
  const D = [55, 145];
  return plot({
    height: 360,
    marginTop: 32,
    marginLeft: 56,
    marginRight: 26,
    marginBottom: 48,
    ariaLabel: title,
    x: { label: "First measurement", labelAnchor: "center", domain: D, ticks: 5 },
    y: { label: "Second measurement", domain: D, ticks: 5 },
    marks: [
      Plot.dot(rows, { x: "first", y: "second", fill: MUTED, fillOpacity: 0.3, r: 2.6 }),
      Plot.dot([...marked(LOW), ...marked(HIGH)], {
        x: "first",
        y: "second",
        fill: ACCENT,
        fillOpacity: 0.65,
        r: 3,
      }),
      // y = x: where a point would sit if the second measurement repeated the
      // first exactly. Every selected group sits off it, toward the middle.
      Plot.line(
        [
          { x: D[0], y: D[0] },
          { x: D[1], y: D[1] },
        ],
        { x: "x", y: "y", stroke: PRIMARY, strokeWidth: 1.5, strokeDasharray: "4,3" },
      ),
      Plot.ruleY([GRAND], { stroke: MUTED, strokeWidth: 1.25 }),

      Plot.arrow([{ x1: low.before, y1: low.before, x2: low.before, y2: low.after }], {
        x1: "x1",
        y1: "y1",
        x2: "x2",
        y2: "y2",
        stroke: ACCENT,
        strokeWidth: 2,
        headLength: 8,
      }),
      Plot.arrow([{ x1: high.before, y1: high.before, x2: high.before, y2: high.after }], {
        x1: "x1",
        y1: "y1",
        x2: "x2",
        y2: "y2",
        stroke: ACCENT,
        strokeWidth: 2,
        headLength: 8,
      }),
      Plot.text([{}], {
        x: low.before,
        y: low.after,
        text: () => `worst tenth:\n${low.before.toFixed(0)} → ${low.after.toFixed(0)}`,
        fill: ACCENT,
        fontSize: 11,
        fontWeight: 600,
        lineHeight: 1.3,
        textAnchor: "start",
        dx: 12,
        dy: 24,
        ...HALO,
      }),
      Plot.text([{}], {
        x: high.before,
        y: high.after,
        text: () => `best tenth:\n${high.before.toFixed(0)} → ${high.after.toFixed(0)}`,
        fill: ACCENT,
        fontSize: 11,
        fontWeight: 600,
        lineHeight: 1.3,
        textAnchor: "end",
        dx: -10,
        dy: -8,
        ...HALO,
      }),
      Plot.text([{}], {
        x: D[0] + 3,
        y: D[1] - 4,
        text: () => "dashed line: no change at all",
        fill: PRIMARY,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "start",
        ...HALO,
      }),
    ],
  });
}
