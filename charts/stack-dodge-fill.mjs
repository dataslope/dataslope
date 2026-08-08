/**
 * The three position adjustments on one set of counts, so the choice reads as
 * a choice about the *question* rather than about the look.
 *
 * `stack` keeps the total honest and makes every segment above the first hard
 * to compare, because only the bottom one shares a baseline. `dodge` gives
 * every segment its own baseline, which is what makes within-category
 * comparison easy, and gives up the total. `fill` normalises each bar to 100%,
 * which is the only one of the three that can show a share and the only one
 * that hides how many observations produced it.
 *
 * The counts are lopsided on purpose: the smallest category has a fraction of
 * the largest's observations, and under `fill` that difference vanishes
 * completely. That is the trap worth drawing, and it is annotated where it
 * happens.
 *
 * ── Why this is drawn in pixel space ───────────────────────────────────────
 *
 * Facets cannot express it. Plot has no `dodge` position for bars: side-by-side
 * sub-bars are `fx: category` + `x: subgroup`, which spends the facet dimension
 * that would otherwise hold the three panels, and Plot has no nested facets.
 * The `fill` panel could not join the other two anyway, because its y is a
 * proportion where theirs is a count, and facets share every scale.
 *
 * So the frame is pixels: `x` and `y` are unitless, the axes are off, and every
 * rect is placed from the layout constants below. The scale from count to
 * height is computed once and shared by the stack and dodge panels, so those
 * two really are comparable; the fill panel's is deliberately different, which
 * is the point being made about it.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, SERIES } from "./_theme.mjs";

export const title =
  "The same counts drawn three ways: stacked, where only the bottom segment shares a baseline; dodged, where every segment has its own; and filled to 100 percent, where the smallest category ends up exactly as tall as the largest.";

const DRIVES = ["Front", "Rear", "4wd"];
// Three categories, not four: at this width a fourth slot puts the axis
// labels on top of each other, and the argument needs only a big category, a
// small one, and something in between.
const CATEGORIES = [
  { key: "Compact", counts: [30, 6, 12] },
  { key: "SUV", counts: [4, 10, 26] },
  { key: "Pickup", counts: [2, 3, 7] },
];

const total = (c) => c.counts.reduce((s, v) => s + v, 0);
const sortedByTotal = [...CATEGORIES].sort((a, b) => total(b) - total(a));
const BIGGEST = sortedByTotal[0];
const SMALLEST = sortedByTotal[sortedByTotal.length - 1];
const RATIO = Math.round(total(BIGGEST) / total(SMALLEST));

export const caption =
  `Stack keeps the total and makes everything above the bottom segment hard to compare. Dodge gives every segment a baseline and gives up the total. Fill shows shares and hides how many observations are behind each bar: ${BIGGEST.key} has ${RATIO} times ${SMALLEST.key}'s observations, and in the third panel they are the same height.`;

// ── Layout, in pixels ──────────────────────────────────────────────────────
const W = 680;
const H = 340;
const BASE = 258; // shared baseline
const TALL = 168; // height of the tallest bar in the count panels
const PANELS = [
  { key: "position = stack", x0: 58 },
  { key: "position = dodge", x0: 274 },
  { key: "position = fill", x0: 490 },
];
const PANEL_W = 150;
const SLOT = PANEL_W / CATEGORIES.length;
const BAR_W = 26;

const MAX_TOTAL = Math.max(...CATEGORIES.map(total));
/** Counts to pixels, shared by the stack and dodge panels. */
const h = (n) => (n / MAX_TOTAL) * TALL;

const color = (i) => SERIES[i % SERIES.length];

/** Stack: segments piled from the baseline, so only the first one starts there. */
const stacked = CATEGORIES.flatMap((c, ci) => {
  let acc = 0;
  return c.counts.map((n, di) => {
    const y2 = BASE - h(acc);
    acc += n;
    const cx = PANELS[0].x0 + ci * SLOT + SLOT / 2;
    return {
      x1: cx - BAR_W / 2,
      x2: cx + BAR_W / 2,
      y1: BASE - h(acc),
      y2,
      fill: color(di),
    };
  });
});

/** Dodge: one slot per category, split three ways, every sub-bar on the
 *  baseline. Same `h`, so a bar here is directly comparable with one there. */
const SUB_W = 13;
const dodged = CATEGORIES.flatMap((c, ci) =>
  c.counts.map((n, di) => {
    const cx = PANELS[1].x0 + ci * SLOT + SLOT / 2;
    const left = cx - (SUB_W * DRIVES.length) / 2;
    return {
      x1: left + di * SUB_W + 1,
      x2: left + (di + 1) * SUB_W - 1,
      y1: BASE - h(n),
      y2: BASE,
      fill: color(di),
    };
  }),
);

/** Fill: every bar normalised to the same height, so only shares remain. */
const filled = CATEGORIES.flatMap((c, ci) => {
  const t = total(c);
  let acc = 0;
  return c.counts.map((n, di) => {
    const y2 = BASE - (acc / t) * TALL;
    acc += n;
    const cx = PANELS[2].x0 + ci * SLOT + SLOT / 2;
    return {
      x1: cx - BAR_W / 2,
      x2: cx + BAR_W / 2,
      y1: BASE - (acc / t) * TALL,
      y2,
      fill: color(di),
    };
  });
});

const categoryLabels = PANELS.flatMap((p) =>
  CATEGORIES.map((c, ci) => ({ x: p.x0 + ci * SLOT + SLOT / 2, label: c.key })),
);

// Count ticks for the two panels that share `h`, and percent ticks for the one
// that does not.
const COUNT_TICKS = [0, 20, 40];
const SHARE_TICKS = [0, 50, 100];

export function render() {
  return plot({
    height: H,
    width: W,
    marginTop: 30,
    marginLeft: 0,
    marginRight: 0,
    marginBottom: 16,
    ariaLabel: title,
    x: { axis: null, grid: false, domain: [0, W] },
    y: { axis: null, grid: false, domain: [H, 0] },
    marks: [
      Plot.text(PANELS, {
        x: (d) => d.x0 + PANEL_W / 2,
        y: 16,
        text: "key",
        fill: MUTED,
        fontSize: 12,
        fontWeight: 600,
        textAnchor: "middle",
      }),

      // Gridlines, drawn per panel rather than across the figure: the left two
      // are counts and the right one is a percentage, and one ruled line
      // spanning both would be claiming they mean the same thing.
      ...COUNT_TICKS.map((t) =>
        Plot.ruleY([{ y: BASE - h(t) }], {
          y: "y",
          x1: PANELS[0].x0 - 10,
          x2: PANELS[1].x0 + PANEL_W,
          stroke: GUIDE,
          strokeOpacity: 0.4,
        }),
      ),
      ...SHARE_TICKS.map((t) =>
        Plot.ruleY([{ y: BASE - (t / 100) * TALL }], {
          y: "y",
          x1: PANELS[2].x0 - 10,
          x2: PANELS[2].x0 + PANEL_W,
          stroke: GUIDE,
          strokeOpacity: 0.4,
        }),
      ),
      Plot.text(
        COUNT_TICKS.map((t) => ({ t, y: BASE - h(t) })),
        {
          x: PANELS[0].x0 - 14,
          y: "y",
          text: (d) => String(d.t),
          fill: MUTED,
          fontSize: 10.5,
          textAnchor: "end",
        },
      ),
      Plot.text(
        SHARE_TICKS.map((t) => ({ t, y: BASE - (t / 100) * TALL })),
        {
          x: PANELS[2].x0 - 14,
          y: "y",
          text: (d) => `${d.t}%`,
          fill: MUTED,
          fontSize: 10.5,
          textAnchor: "end",
        },
      ),

      Plot.rect(stacked, { x1: "x1", x2: "x2", y1: "y1", y2: "y2", fill: "fill", fillOpacity: 0.6 }),
      Plot.rect(dodged, { x1: "x1", x2: "x2", y1: "y1", y2: "y2", fill: "fill", fillOpacity: 0.6 }),
      Plot.rect(filled, { x1: "x1", x2: "x2", y1: "y1", y2: "y2", fill: "fill", fillOpacity: 0.6 }),

      Plot.text(categoryLabels, {
        x: "x",
        y: BASE + 12,
        text: "label",
        fill: MUTED,
        fontSize: 10,
        textAnchor: "middle",
      }),

      // The colour key, drawn once for all three panels.
      ...DRIVES.map((d, i) => [
        Plot.rect([{}], {
          x1: 58 + i * 74,
          x2: 58 + i * 74 + 11,
          y1: 296,
          y2: 306,
          fill: color(i),
          fillOpacity: 0.6,
        }),
        Plot.text([{}], {
          x: 58 + i * 74 + 16,
          y: 301,
          text: () => d,
          fill: MUTED,
          fontSize: 10.5,
          textAnchor: "start",
        }),
      ]).flat(),

      // The trap, called out on the two bars it happens between.
      Plot.text([{}], {
        x: PANELS[2].x0 + PANEL_W / 2,
        y: 300,
        text: () => `${BIGGEST.key} and ${SMALLEST.key}:\nsame height, ${RATIO}x the data`,
        fill: ACCENT,
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.3,
        textAnchor: "middle",
        ...HALO,
      }),
      Plot.text([{}], {
        x: PANELS[0].x0 + PANEL_W / 2,
        y: BASE - TALL - 14,
        text: () => "only the bottom segment starts at zero",
        fill: ACCENT,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "middle",
        ...HALO,
      }),

      Plot.ruleY([{ y: BASE }], {
        y: "y",
        x1: PANELS[0].x0 - 10,
        x2: PANELS[2].x0 + PANEL_W,
        stroke: "currentColor",
        strokeOpacity: 0.35,
      }),
    ],
  });
}
