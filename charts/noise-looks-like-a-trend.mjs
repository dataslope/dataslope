/**
 * Four series with no trend in them at all, each of which looks like it has
 * one.
 *
 * Every panel is a cumulative sum of fair coin flips: the process has no drift
 * and no signal, and each step is independent of every step before it. What
 * makes them look purposeful is only that the *level* carries over, so a run
 * of luck persists on the chart instead of cancelling on the next point. That
 * is enough to produce a convincing rise, a convincing fall, and a convincing
 * reversal, none of which mean anything.
 *
 * This is the figure to reach for when a dashboard metric "clearly turned a
 * corner in March". Before explaining a wiggle, it is worth knowing what a
 * wiggle looks like when there is nothing to explain.
 */
import { Plot, plot, rng, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Four line charts of a quantity over time. The first climbs, the second wanders sideways, the third rises convincingly and then gives it all back, and the fourth falls throughout. All four are cumulative sums of fair coin flips with no trend built in.";

export const caption =
  "None of these has a trend. All four are running totals of fair coin flips, so the only structure is that today starts where yesterday finished. Before explaining a movement, it is worth knowing what pure noise looks like.";

const STEPS = 120;
const PANELS = ["Series 1", "Series 2", "Series 3", "Series 4"];
// Chosen from the first few hundred seeds for a spread of apparent stories:
// a climb, a flat stretch, a rise that reverses, and a slide.
const SEEDS = [9, 17, 53, 22];

const walks = PANELS.flatMap((panel, i) => {
  const next = rng(SEEDS[i]);
  let level = 0;
  return Array.from({ length: STEPS }, (_, t) => {
    level += next() < 0.5 ? -1 : 1;
    return { panel, t, level };
  });
});

const LIMIT = Math.max(...walks.map((d) => Math.abs(d.level))) + 2;

export function render() {
  return plot({
    height: 250,
    marginTop: 30,
    marginLeft: 40,
    marginBottom: 44,
    ariaLabel: title,
    fx: { label: null, domain: PANELS },
    x: { label: "Time", labelAnchor: "center", domain: [0, STEPS], ticks: [] },
    y: { label: null, domain: [-LIMIT, LIMIT], ticks: [] },
    marks: [
      Plot.ruleY([0], { stroke: MUTED, strokeWidth: 1, strokeDasharray: "3,3" }),
      Plot.lineY(walks, {
        x: "t",
        y: "level",
        z: "panel",
        fx: "panel",
        stroke: PRIMARY,
        strokeWidth: 1.75,
        clip: true,
      }),
      Plot.frame({ stroke: "currentColor", strokeOpacity: 0.12 }),
    ],
  });
}
