/**
 * What independence looks like, which is a line that does not move.
 *
 * A mosaic plot draws a contingency table as area: the columns are as wide as
 * their marginal counts, and each column is split vertically by the conditional
 * distribution inside it. That construction gives independence a shape you can
 * check without arithmetic.
 *
 * If the two variables are independent, then `P(outcome | group)` is the same
 * whatever the group, so every column splits at the same height and the divider
 * runs straight across. That is the left panel. The columns have very different
 * widths, because far more people are in one group than the other, and the
 * split is identical, because group size has nothing to do with outcome.
 *
 * If they are dependent, the divider steps. The right panel has the same
 * marginal totals as the left, so the columns are exactly as wide, and the only
 * difference is where each one splits.
 *
 * The reason to prefer this over a stacked bar is that the mosaic shows both
 * margins at once. A stacked bar normalises every column to full height, so it
 * shows the conditional distribution and hides how many observations are behind
 * each one; a grouped bar shows the counts and makes the conditional
 * distribution something you compute. The mosaic shows the joint distribution,
 * which is what a contingency table is, and the flat divider is a chi-squared
 * test you can do with your eye.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, PRIMARY, SERIES } from "./_theme.mjs";
import { panel, panelSpace, panelTitle } from "./_panels.mjs";

export const title =
  "Two mosaic plots of a two-by-two table with identical margins. In the independent one every column splits at the same height and the divider runs straight across; in the dependent one the divider steps, and that step is the association.";

const GROUPS = [
  { key: "Desktop", n: 7400 },
  { key: "Mobile", n: 2600 },
];
const TOTAL = GROUPS.reduce((s, g) => s + g.n, 0);

/** Same margins in both panels; only the conditional split differs. */
const OVERALL = 0.34;
const INDEPENDENT = GROUPS.map((g) => ({ ...g, p: OVERALL }));
const DEPENDENT = [
  { ...GROUPS[0], p: 0.28 },
  { ...GROUPS[1], p: 0.51 },
];
/** The dependent split keeps the same overall rate, so the two panels really
 *  are the same table reshuffled rather than two different datasets. */
const CHECK = DEPENDENT.reduce((s, g) => s + g.p * g.n, 0) / TOTAL;

const LEFT = panel(0, { y: [0, 1] });
const RIGHT = panel(1, { y: [0, 1] });

const TOP = 0.76;
const BOTTOM = 0.18;
const GAP = 0.012;

function cells(p, rows) {
  let x = p.left;
  const usable = p.right - p.left - GAP;
  return rows.flatMap((g) => {
    const w = usable * (g.n / TOTAL);
    // The converted band sits at the top and has to be `p` of the height, so
    // the divider is measured down from the top rather than up from the base.
    const split = TOP - (TOP - BOTTOM) * g.p;
    const out = [
      { ...g, part: "yes", x1: x, x2: x + w, y1: split, y2: TOP, color: PRIMARY, cx: x + w / 2 },
      { ...g, part: "no", x1: x, x2: x + w, y1: BOTTOM, y2: split, color: MUTED, cx: x + w / 2 },
    ];
    x += w + GAP;
    return out;
  });
}

const leftCells = cells(LEFT, INDEPENDENT);
const rightCells = cells(RIGHT, DEPENDENT);

const dividers = (p, rows) => {
  let x = p.left;
  const usable = p.right - p.left - GAP;
  return rows.map((g) => {
    const w = usable * (g.n / TOTAL);
    const seg = { x1: x, x2: x + w, y: TOP - (TOP - BOTTOM) * g.p };
    x += w + GAP;
    return seg;
  });
};

const SPREAD = Math.round((DEPENDENT[1].p - DEPENDENT[0].p) * 100);

export const caption = `A contingency table drawn as area: columns as wide as their marginal counts, split by the conditional distribution inside each. Under independence every column splits at the same height; on the right the same margins and the same overall rate of ${(CHECK * 100).toFixed(0)}% give ${Math.round(DEPENDENT[0].p * 100)}% against ${Math.round(DEPENDENT[1].p * 100)}%.`;

export function render() {
  return plot({
    height: 320,
    marginTop: 26,
    marginLeft: 24,
    marginRight: 18,
    marginBottom: 42,
    ariaLabel: title,
    ...panelSpace(2),
    marks: [
      panelTitle(LEFT, "Independent: the split never moves", { fill: PRIMARY }),
      panelTitle(RIGHT, "Dependent: the split steps", { fill: ACCENT }),

      ...[leftCells, rightCells].map((cs) =>
        Plot.rect(cs, {
          x1: "x1",
          x2: "x2",
          y1: "y1",
          y2: "y2",
          fill: "color",
          fillOpacity: (d) => (d.part === "yes" ? 0.65 : 0.2),
          stroke: "var(--ds-chart-surface)",
          strokeWidth: 1.4,
        }),
      ),
      ...[
        [LEFT, INDEPENDENT, PRIMARY],
        [RIGHT, DEPENDENT, ACCENT],
      ].map(([p, rows, color]) =>
        Plot.link(dividers(p, rows), {
          x1: "x1",
          x2: "x2",
          y1: "y",
          y2: "y",
          stroke: color,
          strokeWidth: 2.4,
        }),
      ),
      ...[leftCells, rightCells].map((cs) =>
        Plot.text(
          cs.filter((d) => d.part === "yes"),
          {
            x: "cx",
            y: TOP,
            text: (d) => `${d.key}\n${Math.round(d.p * 100)}% converted`,
            fill: MUTED,
            fontSize: 10.5,
            fontWeight: 700,
            lineHeight: 1.35,
            textAnchor: "middle",
            dy: -16,
            ...HALO,
          },
        ),
      ),
      ...[leftCells, rightCells].map((cs) =>
        Plot.text(
          cs.filter((d) => d.part === "yes"),
          {
            x: "cx",
            y: BOTTOM,
            text: (d) => `${(d.n / 1000).toFixed(1)}k sessions`,
            fill: "currentColor",
            fillOpacity: 0.55,
            fontSize: 10,
            textAnchor: "middle",
            dy: 16,
          },
        ),
      ),
      Plot.text([{}], {
        x: (LEFT.left + LEFT.right) / 2,
        y: BOTTOM,
        text: () => "column widths are the sample sizes, in both panels",
        fill: MUTED,
        fontSize: 10,
        fontWeight: 600,
        textAnchor: "middle",
        dy: 34,
        ...HALO,
      }),
      Plot.text([{}], {
        x: (RIGHT.left + RIGHT.right) / 2,
        y: BOTTOM,
        text: () => `same margins, same overall rate, ${SPREAD}-point gap`,
        fill: ACCENT,
        fontSize: 10,
        fontWeight: 700,
        textAnchor: "middle",
        dy: 34,
        ...HALO,
      }),
    ],
  });
}
