/**
 * Three ways to put two distributions in one histogram, and the different
 * question each one answers.
 *
 * They are not styling options. Stacked shows the *combined* distribution and
 * the split within it, so the top edge is the total and only the bottom group
 * sits on a flat baseline; comparing the two groups' shapes across a moving
 * baseline is the same judgement a stacked bar asks for, and people are bad at
 * it. Grouped puts both on the axis, so shapes are comparable and the total is
 * gone. Overlaid with transparency compares the shapes directly and lets the
 * overlap be seen, at the cost of a muddled colour wherever they meet.
 *
 * The data is chosen so the choice matters: two groups with the same spread
 * and different centres, which is the case where the stacked version reads as
 * one broad hump and hides that there are two.
 */
import {
  Plot,
  plot,
  ACCENT,
  HALO,
  MUTED,
  PRIMARY,
  normalSamples,
} from "./_theme.mjs";

export const title =
  "The same two groups in one histogram three ways: stacked, grouped side by side, and overlaid with transparency. The stacked version reads as a single broad hump; the other two show two separate peaks.";

const LO = 10;
const HI = 90;
const BINS = 26;
const WIDTH = (HI - LO) / BINS;

const A = normalSamples(600, 40, 9, 101);
const B = normalSamples(600, 58, 9, 202);

function bin(xs) {
  const counts = new Array(BINS).fill(0);
  for (const v of xs) {
    const i = Math.floor((v - LO) / WIDTH);
    if (i >= 0 && i < BINS) counts[i]++;
  }
  return counts;
}

const CA = bin(A);
const CB = bin(B);

const STACKED = "Stacked";
const GROUPED = "Grouped";
const OVERLAID = "Overlaid";

const rows = [];
for (let i = 0; i < BINS; i++) {
  const x1 = LO + i * WIDTH;
  const x2 = x1 + WIDTH;
  // Stacked: B sits on top of A, so only A has a flat baseline.
  rows.push({ panel: STACKED, key: "A", x1, x2, y1: 0, y2: CA[i] });
  rows.push({ panel: STACKED, key: "B", x1, x2, y1: CA[i], y2: CA[i] + CB[i] });
  // Grouped: each bin split into two half-width bars.
  rows.push({
    panel: GROUPED,
    key: "A",
    x1,
    x2: x1 + WIDTH / 2,
    y1: 0,
    y2: CA[i],
  });
  rows.push({
    panel: GROUPED,
    key: "B",
    x1: x1 + WIDTH / 2,
    x2,
    y1: 0,
    y2: CB[i],
  });
  // Overlaid: both from zero, both translucent.
  rows.push({ panel: OVERLAID, key: "A", x1, x2, y1: 0, y2: CA[i] });
  rows.push({ panel: OVERLAID, key: "B", x1, x2, y1: 0, y2: CB[i] });
}

const PEAK = Math.max(...CA.map((c, i) => c + CB[i]));

export const caption =
  'Three modes, three questions. Stacked answers "what is the total, and how does it split?", and only the bottom group is measured from zero, so comparing the two shapes means comparing across a moving baseline. Grouped answers "how do the shapes compare?" and gives up the total. Overlaid answers the same question and adds where they overlap, at the cost of a muddy colour where they meet. Two groups with the same spread and different centres, as here, is exactly the case where the stacked version reads as one broad hump and hides that there are two.';

export function render() {
  return plot({
    height: 300,
    marginTop: 34,
    marginLeft: 52,
    marginRight: 20,
    marginBottom: 46,
    ariaLabel: title,
    // Bare mode names. The full descriptions ran into each other at this
    // width, and Plot does not wrap a facet label; the caption carries them.
    fx: { label: null, domain: [STACKED, GROUPED, OVERLAID] },
    x: { label: "Value", labelAnchor: "center", domain: [LO, HI], ticks: 4 },
    y: { label: "Count", domain: [0, PEAK * 1.08], ticks: 4 },
    marks: [
      Plot.rect(rows, {
        fx: "panel",
        x1: "x1",
        x2: "x2",
        y1: "y1",
        y2: "y2",
        fill: (d) => (d.key === "A" ? PRIMARY : ACCENT),
        // Only the overlaid panel needs to be see-through; making the others
        // translucent too would suggest the mode is about opacity.
        fillOpacity: (d) => (d.panel === OVERLAID ? 0.55 : 0.85),
      }),
      Plot.text([{}], {
        fx: () => STACKED,
        x: (LO + HI) / 2,
        y: PEAK * 0.98,
        text: () => "one hump, two groups",
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        ...HALO,
      }),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
