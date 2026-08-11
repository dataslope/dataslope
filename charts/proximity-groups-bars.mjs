/**
 * Whitespace, doing the work of a legend, a border and a set of subtitles.
 *
 * Twelve bars, evenly spaced, in a fixed order. There is nothing wrong with
 * the top panel and nothing to read off it either: twelve equal gaps say
 * twelve equal relationships, so the reader gets one long list and has to be
 * told, in prose somewhere else, that it is really four groups of three.
 *
 * The bottom panel changes one thing. The gap inside a group is smaller than
 * the gap between groups, and that is all. No borders, no background bands, no
 * second color, no repeated group name above each cluster. The reader sees
 * four things made of three things each, and never notices being told.
 *
 * This is the Gestalt principle of proximity, and it is the cheapest encoding
 * available: two spacings and nothing else added to the drawing. It is worth
 * knowing because the usual instinct when a chart needs grouping is to reach
 * for color, which spends a channel that could have carried a second
 * variable, or for panel borders, which add ink and no information. Spacing
 * costs neither.
 *
 * The same idea runs through the rest of a chart's furniture: an axis label
 * closer to its axis than to the title belongs to the axis, a legend key
 * touching its swatch belongs to the swatch, a footnote sitting away from
 * everything belongs to the whole figure. Distance is already saying
 * something. The only question is whether it is saying what you meant.
 */
import { Plot, plot, HALO, MUTED, PRIMARY } from "./_theme.mjs";
import { panel, panelAxis, panelBaseline, panelSpace, panelTitle } from "./_panels.mjs";

export const title =
  "Twelve bars drawn twice. In the top row the spacing between every pair is equal and the chart reads as one list of twelve. In the bottom row the only change is that the gaps at the group boundaries are wider, and the same bars read as four groups of three.";

/** Support tickets closed, by team, across four regions. */
const GROUPS = [
  { region: "North", teams: [42, 31, 27] },
  { region: "South", teams: [38, 46, 22] },
  { region: "East", teams: [29, 24, 35] },
  { region: "West", teams: [51, 33, 40] },
];

const FLAT = GROUPS.flatMap((g, gi) =>
  g.teams.map((v, ti) => ({ v, region: g.region, gi, ti })),
);
const N = FLAT.length;
const MAX = 56;

// Two panels stacked, so the only difference a reader can see is horizontal
// spacing. Side by side they would also differ in width, which would be a
// second change and would muddy the comparison.
const EVEN = panel(0, { y: [0, MAX] });
const GROUPED = panel(0, { y: [0, MAX] });

/** Both rows live in one unit square, split into an upper and a lower half. */
const rowOffset = (row) => (row === 0 ? 0.5 : 0);
const half = (p, row) => ({
  py: (v) => rowOffset(row) + p.py(v) * 0.5,
  bottom: rowOffset(row) + p.bottom * 0.5,
  top: rowOffset(row) + p.top * 0.5,
});

const TOP = half(EVEN, 0);
const BOTTOM = half(GROUPED, 1);

const BAR = 0.6;

/** Evenly spaced: every slot the same width, every gap the same. */
const evenX = (i) => EVEN.band(i, N);
const EVEN_W = EVEN.bandWidth(N) * BAR;

/**
 * Grouped: the twelve bars keep their width, and the space that was spread
 * evenly between them is pooled and spent at the three group boundaries.
 *
 * The eleven steps between twelve bars still have to add up to the eleven
 * even steps above, or the lower row would also be narrower and the reader
 * would be looking at two changes instead of one. Eight of them shrink, three
 * of them absorb everything the eight gave up.
 */
const INNER = EVEN.bandWidth(N) * 0.75;
const GROUP_GAP = (11 * EVEN.bandWidth(N) - 8 * INNER) / 3;
const groupedX = (() => {
  let x = EVEN.band(0, N);
  return FLAT.map((d, i) => {
    if (i > 0) x += d.gi === FLAT[i - 1].gi ? INNER : GROUP_GAP;
    return x;
  });
})();

export const caption = `Twelve bars, and between the two rows exactly one thing changes: in the lower row the gap at a group boundary is wider than the gap inside a group. No borders, no background bands, no second color, no group name repeated over each cluster. The top row reads as a list of twelve and has to be told in prose that it is four regions of three teams; the bottom row reads as four groups of three and never notices being told. This is proximity, and it is the cheapest encoding on the shelf: it adds no ink, and it leaves color free to carry a second variable instead of being spent on grouping you could have got for nothing. The same principle governs the rest of a chart's furniture. A label nearer its axis than its title belongs to the axis. Distance is already saying something; the only question is whether it is saying what you meant.`;

export function render() {
  return plot({
    height: 360,
    marginTop: 26,
    marginLeft: 34,
    marginRight: 18,
    marginBottom: 30,
    ariaLabel: title,
    ...panelSpace(1),
    marks: [
      // ── evenly spaced ─────────────────────────────────────────────────────
      Plot.text([{}], {
        x: (EVEN.left + EVEN.right) / 2,
        y: 0.985,
        text: () => "Even spacing: one list of twelve",
        fill: MUTED,
        fontSize: 11.5,
        fontWeight: 700,
        textAnchor: "middle",
        ...HALO,
      }),
      ...panelAxis({ ...EVEN, py: TOP.py }, { ticks: [0, 20, 40] }),
      Plot.link([{}], {
        x1: EVEN.left,
        x2: EVEN.right,
        y1: TOP.py(0),
        y2: TOP.py(0),
        stroke: "currentColor",
        strokeOpacity: 0.35,
      }),
      Plot.rect(FLAT, {
        x1: (d, i) => evenX(i) - EVEN_W / 2,
        x2: (d, i) => evenX(i) + EVEN_W / 2,
        y1: TOP.py(0),
        y2: (d) => TOP.py(d.v),
        fill: PRIMARY,
        fillOpacity: 0.65,
      }),

      // ── grouped by spacing alone ──────────────────────────────────────────
      Plot.text([{}], {
        x: (EVEN.left + EVEN.right) / 2,
        y: 0.485,
        text: () => "Same bars, same widths, wider gaps between regions",
        fill: MUTED,
        fontSize: 11.5,
        fontWeight: 700,
        textAnchor: "middle",
        ...HALO,
      }),
      ...panelAxis({ ...GROUPED, py: BOTTOM.py }, { ticks: [0, 20, 40] }),
      Plot.link([{}], {
        x1: EVEN.left,
        x2: EVEN.right,
        y1: BOTTOM.py(0),
        y2: BOTTOM.py(0),
        stroke: "currentColor",
        strokeOpacity: 0.35,
      }),
      Plot.rect(FLAT, {
        x1: (d, i) => groupedX[i] - EVEN_W / 2,
        x2: (d, i) => groupedX[i] + EVEN_W / 2,
        y1: BOTTOM.py(0),
        y2: (d) => BOTTOM.py(d.v),
        fill: PRIMARY,
        fillOpacity: 0.65,
      }),
      Plot.text(
        GROUPS.map((g, gi) => ({
          region: g.region,
          x: (groupedX[gi * 3] + groupedX[gi * 3 + 2]) / 2,
        })),
        {
          x: "x",
          y: BOTTOM.py(0),
          text: "region",
          fill: "currentColor",
          fillOpacity: 0.62,
          fontSize: 10.5,
          fontWeight: 600,
          textAnchor: "middle",
          dy: 14,
        },
      ),
    ],
  });
}
