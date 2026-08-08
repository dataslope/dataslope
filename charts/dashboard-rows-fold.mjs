/**
 * "Five rows or fewer", drawn as the thing that actually enforces it: the fold.
 *
 * The page is measured in pixels rather than in rows, because a row is not a
 * unit of anything — a KPI strip is 160px and a chart row is 220px, and what
 * decides whether a panel gets looked at is where it lands relative to the
 * bottom of the window. On the laptop viewport most people are using, that is
 * a little under 900 CSS pixels of usable height once browser chrome and the
 * app's own header are gone, and five rows is roughly where it falls.
 *
 * Drawn as a schematic of the dashboard itself (three panels per row) rather
 * than as a bar chart of heights, so the fold reads as a line across a page
 * instead of as a threshold on an axis.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "A dashboard drawn to scale in page pixels: a headline row and six chart rows stacked down the page, with a rule marking the bottom of a laptop viewport. The rule falls inside the fifth row, so everything from there down is below the fold.";

/** Usable height of a 1080p laptop window once browser chrome, the OS bar and
 *  the app's own header are subtracted. */
const FOLD = 900;

const ROWS = [
  { label: "Headline numbers", h: 160 },
  { label: "Trend", h: 220 },
  { label: "Trend by segment", h: 220 },
  { label: "Funnel", h: 220 },
  { label: "Breakdown by channel", h: 220 },
  { label: "Top campaigns", h: 220 },
  { label: "Errors by endpoint", h: 220 },
];

// Cumulative tops, so each row knows where on the page it starts.
let top = 0;
const rows = ROWS.map((r, i) => {
  const y1 = top;
  top += r.h;
  return { ...r, index: i + 1, y1, y2: top };
});
const PAGE = top;

/** Panels drawn inside each row: three per row, with a gutter. */
const PANELS = rows.flatMap((r) =>
  [0, 1, 2].map((c) => ({
    ...r,
    x1: c + 0.06,
    x2: c + 0.94,
    py1: r.y1 + 14,
    py2: r.y2 - 14,
    below: r.y1 >= FOLD,
    straddles: r.y1 < FOLD && r.y2 > FOLD,
  })),
);

const VISIBLE = rows.filter((r) => r.y2 <= FOLD).length;
const HIDDEN = rows.filter((r) => r.y1 >= FOLD).length;

export const caption = `The same seven rows, measured in pixels rather than in rows. A laptop window leaves about ${FOLD} usable pixels, so ${VISIBLE} rows land above the fold, the fifth is cut in half, and ${HIDDEN} never appear until someone scrolls. A dashboard is read at a glance or not at all: if the answer lives in row 6, it is not on the dashboard.`;

export function render() {
  return plot({
    height: 400,
    marginTop: 18,
    marginLeft: 62,
    marginRight: 20,
    marginBottom: 34,
    ariaLabel: title,
    x: { label: null, domain: [0, 3], ticks: [], grid: false },
    y: {
      label: "Pixels down the page",
      domain: [PAGE, 0],
      ticks: [0, 300, 600, 900, 1200, 1500],
      grid: false,
    },
    marks: [
      Plot.rect(PANELS, {
        x1: "x1",
        x2: "x2",
        y1: "py1",
        y2: "py2",
        fill: (d) => (d.below ? MUTED : PRIMARY),
        fillOpacity: (d) => (d.below ? 0.16 : d.straddles ? 0.3 : 0.4),
      }),
      // Row names inside the leftmost panel rather than in the margin: the
      // y axis is already carrying pixel ticks there, and two label columns
      // an axis apart collide at this height.
      Plot.text(rows, {
        x: 0.06,
        y: (d) => (d.y1 + d.y2) / 2,
        text: (d) => `${d.index}. ${d.label}`,
        fill: (d) => (d.y1 >= FOLD ? MUTED : "currentColor"),
        fontSize: 11,
        fontWeight: 600,
        textAnchor: "start",
        dx: 9,
        ...HALO,
      }),
      Plot.ruleY([FOLD], { stroke: ACCENT, strokeWidth: 1.6, strokeDasharray: "5 4" }),
      Plot.text([{}], {
        x: 3,
        y: FOLD,
        text: () => "bottom of the window",
        fill: ACCENT,
        fontSize: 11,
        fontWeight: 600,
        textAnchor: "end",
        dx: -6,
        dy: -8,
        ...HALO,
      }),
      Plot.text([{}], {
        x: 2,
        y: (rows[5].y1 + rows[6].y2) / 2,
        text: () => "nobody scrolls a dashboard",
        fill: MUTED,
        fontSize: 12,
        fontWeight: 600,
        ...HALO,
      }),
    ],
  });
}
