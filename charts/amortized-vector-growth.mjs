/**
 * Why `push` is O(1) when it sometimes copies the whole array: the copies get
 * rarer exactly as fast as they get more expensive.
 *
 * The spikes are the cost of an individual push: one, except at a capacity
 * boundary, where it is the whole array. Under doubling they double in height
 * and halve in frequency, so the total work through n pushes stays
 * proportional to n and the running average settles at a small constant. That
 * constant is what "amortized O(1)" names.
 *
 * ── Why there are two panels ────────────────────────────────────────────────
 *
 * The growth *factor* is the whole mechanism, and a single panel of doubling
 * could not show it: a reader looking at one falling curve has nothing to
 * compare it against, and the claim "the average would climb under a different
 * growth rule" stays a sentence. Both lessons that place this figure said as
 * much in their own words — "the same sequence of appends under doubling and
 * under adding a fixed number of slots each time" — and pointed at a chart
 * that only drew the first half of it.
 *
 * So the second panel adds a fixed sixteen slots instead. Its spikes arrive on
 * a fixed cadence and grow linearly rather than doubling, which is the same
 * total work rearranged into a shape whose average has no ceiling. Both panels
 * share both scales, which is the only reason the two averages can be compared
 * by eye at all.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Two panels of the same 130 pushes on shared axes. Under capacity doubling the reallocation spikes get taller and rarer together and the running average flattens near three operations per push. Under adding a fixed sixteen slots the spikes arrive just as often and the running average is above five and still climbing.";

const N = 130;
const STEP = 16;

/** One run of `n` pushes under a growth rule, returning per-push cost and the
 *  running average. `grow` takes the current capacity and returns the next. */
function run(label, grow, start = 1) {
  let capacity = start;
  let total = 0;
  return Array.from({ length: N }, (_, i) => {
    const n = i + 1;
    let cost = 1;
    if (n > capacity) {
      // Reallocate: copy everything already there, then store the new element.
      cost += capacity;
      capacity = grow(capacity);
    }
    total += cost;
    return { label, n, cost, amortized: total / n, realloc: cost > 1 };
  });
}

const DOUBLING = "Double the capacity";
const FIXED = `Add ${STEP} slots each time`;

const doubling = run(DOUBLING, (c) => c * 2);
const fixed = run(FIXED, (c) => c + STEP, STEP);
const rows = [...doubling, ...fixed];

const settled = (r) => r.at(-1).amortized;
const spikes = (r) => r.filter((d) => d.realloc).length;

const ENDS = [doubling, fixed].map((r) => ({
  label: r.at(-1).label,
  amortized: settled(r),
  text: `${settled(r).toFixed(1)} per push`,
}));

export const caption = `Most pushes cost one; the spikes are reallocations. Doubling makes each copy twice the size of the last and half as frequent, so ${N} pushes contain only ${spikes(doubling)} of them and the running average settles near ${settled(doubling).toFixed(1)}. Adding a fixed ${STEP} slots produces ${spikes(fixed)} copies on a fixed cadence, each one bigger than the last, so the average is already ${settled(fixed).toFixed(1)} here and has nothing to settle to; it climbs for as long as you keep pushing. Both panels are the same pushes on the same scales; only the growth rule differs.`;

export function render() {
  return plot({
    height: 320,
    marginTop: 32,
    marginLeft: 58,
    marginRight: 18,
    marginBottom: 48,
    ariaLabel: title,
    fx: { label: null, domain: [DOUBLING, FIXED] },
    x: { label: "Push number", labelAnchor: "center", domain: [0, N], ticks: 4 },
    // Tall enough for the last reallocation, which copies 128 elements. At a
    // tighter domain that spike clipped and its label rendered outside the
    // frame entirely, where it landed on top of the next figure.
    y: { label: "Operations", domain: [0, 145], ticks: 5 },
    marks: [
      Plot.ruleX(rows, {
        fx: "label",
        x: "n",
        y1: 0,
        y2: "cost",
        stroke: (d) => (d.realloc ? ACCENT : PRIMARY),
        strokeOpacity: (d) => (d.realloc ? 0.85 : 0.5),
        clip: true,
      }),
      Plot.line(rows, {
        fx: "label",
        x: "n",
        y: "amortized",
        z: "label",
        stroke: MUTED,
        strokeWidth: 2,
        clip: true,
      }),
      Plot.ruleY(ENDS, {
        fx: "label",
        y: "amortized",
        stroke: GUIDE,
        strokeWidth: 1.25,
        strokeDasharray: "3,3",
      }),
      Plot.text(ENDS, {
        fx: "label",
        x: N,
        y: "amortized",
        text: "text",
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "end",
        dy: -9,
        ...HALO,
      }),
      Plot.text([{ label: DOUBLING }, { label: FIXED }], {
        fx: "label",
        frameAnchor: "top-right",
        text: (d) =>
          d.label === DOUBLING
            ? "twice as big,\nhalf as often"
            : "bigger every time,\nand no rarer",
        fill: ACCENT,
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.3,
        textAnchor: "end",
        dx: -6,
        dy: 4,
        ...HALO,
      }),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
