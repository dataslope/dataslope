/**
 * Why `push` is O(1) when it sometimes copies the whole array: the copies get
 * rarer exactly as fast as they get more expensive.
 *
 * The bars are the cost of each individual push: one, except at a capacity
 * boundary, where it is the whole array. Those spikes double in height and halve
 * in frequency, so the total work through n pushes stays proportional to n. The
 * line is that total divided by the number of pushes, which is what "amortized
 * O(1)" names, and it settles at a small constant rather than growing.
 *
 * The doubling factor is the variable worth understanding: at 2x the amortized
 * cost converges to about 3 operations per push. Growing by a fixed amount
 * instead would make the spikes just as tall and no rarer, and the amortized
 * line would climb without bound.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Cost per push against push number: mostly one, with doubling spikes at each reallocation, and a line showing the running average settling at about three operations per push.";

const N = 130;
const GROWTH = 2;

const rows = (() => {
  let capacity = 1;
  let total = 0;
  return Array.from({ length: N }, (_, i) => {
    const n = i + 1;
    let cost = 1;
    if (n > capacity) {
      // Reallocate: copy everything already there, then store the new element.
      cost += capacity;
      capacity *= GROWTH;
    }
    total += cost;
    return { n, cost, amortized: total / n, realloc: cost > 1 };
  });
})();

const SETTLED = rows.at(-1).amortized;
const SPIKES = rows.filter((r) => r.realloc).length;

export const caption =
  `Most pushes cost one. The spikes are reallocations: each copies twice as much as the last and happens half as often, so through ${N} pushes there are only ${SPIKES} of them. The running average is the line, and it settles near ${SETTLED.toFixed(1)} rather than climbing. Grow by a fixed amount instead of doubling and the spikes stay just as tall without getting rarer, and that line rises forever.`;

export function render() {
  return plot({
    height: 320,
    marginTop: 32,
    marginLeft: 58,
    marginRight: 96,
    marginBottom: 48,
    ariaLabel: title,
    x: { label: "Push number", labelAnchor: "center", domain: [0, N], ticks: 5 },
    // Tall enough for the last reallocation, which copies 128 elements. At a
    // tighter domain that spike clipped and its label rendered outside the
    // frame entirely, where it landed on top of the next figure.
    y: { label: "Operations", domain: [0, 145], ticks: 5 },
    marks: [
      Plot.ruleX(rows, {
        x: "n",
        y1: 0,
        y2: "cost",
        stroke: (d) => (d.realloc ? ACCENT : PRIMARY),
        strokeOpacity: (d) => (d.realloc ? 0.85 : 0.5),
        clip: true,
      }),
      Plot.line(rows, { x: "n", y: "amortized", stroke: MUTED, strokeWidth: 2 }),
      Plot.ruleY([SETTLED], { stroke: GUIDE, strokeWidth: 1.25, strokeDasharray: "3,3" }),
      Plot.text([rows.at(-1)], {
        x: "n",
        y: "amortized",
        text: () => `running average:\n${SETTLED.toFixed(1)} per push`,
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.3,
        textAnchor: "start",
        dx: 8,
        ...HALO,
      }),
      Plot.text([rows.filter((r) => r.realloc).at(-1)], {
        x: "n",
        y: "cost",
        text: () => "each copy is twice the last\nand half as frequent",
        fill: ACCENT,
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.3,
        textAnchor: "end",
        dx: -10,
        ...HALO,
      }),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
