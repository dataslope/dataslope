/**
 * Pre-attentive processing: the difference between a channel you *see* and one
 * you have to *search*.
 *
 * Three panels, the same forty marks, one target in each. Color and size are
 * pre-attentive, so the odd mark arrives before you have decided to look for
 * it and the time to find it does not depend on how many distractors there
 * are. Shape is not: the last panel has to be scanned item by item, and adding
 * marks would make it slower.
 *
 * This is the mechanism under the whole "use color for the one thing that
 * matters" rule. A channel that pops out can carry an alert; a channel that
 * has to be searched cannot, however carefully it is labelled.
 */
import { Plot, plot, linspace, ACCENT, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Three grids of forty marks, each hiding one odd mark. In the first the target is a different color and in the second a different size, and both jump out immediately. In the third the target differs only in shape, and has to be searched for.";

export const caption =
  "One odd mark in each grid. Color and size are pre-attentive: the target arrives before you look for it, however many distractors there are. Shape is not, so the third panel has to be scanned. That is why color is reserved for the one thing that matters.";

const COLS = 8;
const ROWS = 5;
const TARGET = 27; // same slot in all three, so the panels differ only in channel

const PANELS = [
  { key: "Color: pops out", channel: "color" },
  { key: "Size: pops out", channel: "size" },
  { key: "Shape: you have to search", channel: "shape" },
];

const marks = PANELS.flatMap((p) =>
  Array.from({ length: COLS * ROWS }, (_, i) => {
    const odd = i === TARGET;
    return {
      panel: p.key,
      channel: p.channel,
      x: i % COLS,
      y: Math.floor(i / COLS),
      odd,
      fill: p.channel === "color" && odd ? ACCENT : PRIMARY,
      r: p.channel === "size" && odd ? 9.5 : 5,
      symbol: p.channel === "shape" && odd ? "square" : "circle",
    };
  }),
);

export function render() {
  return plot({
    height: 250,
    marginTop: 34,
    marginLeft: 20,
    marginRight: 20,
    marginBottom: 20,
    ariaLabel: title,
    r: { type: "identity" },
    symbol: { type: "identity" },
    fx: { label: null, domain: PANELS.map((p) => p.key) },
    x: { label: null, domain: [-0.7, COLS - 0.3], ticks: [], grid: false },
    y: { label: null, domain: [-0.7, ROWS - 0.3], ticks: [], grid: false },
    marks: [
      Plot.dot(marks, {
        x: "x",
        y: "y",
        fx: "panel",
        r: "r",
        symbol: "symbol",
        fill: "fill",
        fillOpacity: 0.85,
        stroke: null,
      }),
      Plot.text([{ panel: PANELS[2].key }], {
        x: (COLS - 1) / 2,
        y: -0.62,
        fx: "panel",
        text: () => "…found it yet?",
        fill: MUTED,
        fontSize: 11.5,
        fontWeight: 600,
        ...HALO,
      }),
    ],
  });
}
