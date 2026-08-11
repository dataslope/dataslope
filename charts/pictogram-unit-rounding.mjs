/**
 * An isotype chart, and the icon that has to be a fraction of an icon.
 *
 * Otto Neurath's isotype system is one icon per fixed unit, repeated. It has a
 * real advantage over a bar: the reader can *count*, and counting is exact in
 * a way that reading a length off an axis is not. Ten icons against six is
 * unambiguous, and no axis is required at all.
 *
 * The advantage survives exactly as long as the values are multiples of the
 * unit, and real values are not. At one icon per hundred people, 640 is six
 * and two fifths of an icon, and that leaves three choices, all of which
 * change the comparison.
 *
 * *Round* and the small groups take the worst of it. At this unit, 640 and 631
 * both draw six icons, so a real difference of nine people disappears; and 149
 * and 51 both draw one, a threefold difference shown as a tie.
 * *Clip* the last icon to a partial shape, and you are back to comparing
 * areas, which is the thing the counting was supposed to replace, and readers
 * demonstrably read a half-width icon as somewhere between a third and a half.
 * *Change the unit* until everything divides evenly, and the smallest group
 * needs so many icons that the largest will not fit on the page.
 *
 * Neurath knew all this and worked within it: isotype charts were designed
 * around round numbers, and the unit was chosen so the values landed on it.
 * That is the honest way to use the form, and it means the *data* has to suit
 * the chart rather than the other way round, which is unusual and worth
 * saying out loud.
 *
 * The bar panel is the control. It has no unit problem, because a length is
 * continuous, and it gives up the exact counting in exchange.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY } from "./_theme.mjs";
import { panel, panelAxis, panelBaseline, panelSpace, panelTitle } from "./_panels.mjs";

export const title =
  "Five groups drawn as an isotype chart at one icon per hundred people, with the remainder rounded, and as bars. Rounding makes 640 and 631 draw the same six icons, and makes a group of 149 and a group of 51 both draw one.";

const UNIT = 100;
const GROUPS = [
  { key: "North", n: 640 },
  { key: "South", n: 631 },
  { key: "East", n: 412 },
  { key: "West", n: 149 },
  { key: "Isles", n: 51 },
];

const N = GROUPS.length;
const MAX_ICONS = 7;
const rounded = (n) => Math.round(n / UNIT);

/** Pairs the rounding makes indistinguishable, found rather than asserted. */
const TIES = GROUPS.flatMap((a, i) =>
  GROUPS.slice(i + 1)
    .filter((b) => rounded(a.n) === rounded(b.n))
    .map((b) => ({ a, b, gap: Math.abs(a.n - b.n), ratio: Math.max(a.n, b.n) / Math.min(a.n, b.n) })),
);
const WORST = TIES.reduce((x, y) => (y.ratio > x.ratio ? y : x));

const ICONS = panel(0, { y: [0, 1] });
const BARS = panel(1, { y: [0, 720] });

const ROW_TOP = 0.78;
const ROW_STEP = 0.135;
const ICON_R = 0.021;
const ICON_STEP = 0.058;

const dots = GROUPS.flatMap((d, row) =>
  Array.from({ length: rounded(d.n) }, (_, k) => ({
    key: d.key,
    tied: TIES.some((t) => t.a.key === d.key || t.b.key === d.key),
    x: ICONS.left + 0.11 + k * ICON_STEP,
    y: ROW_TOP - row * ROW_STEP,
  })),
);

const rowLabels = GROUPS.map((d, row) => ({
  ...d,
  y: ROW_TOP - row * ROW_STEP,
  icons: rounded(d.n),
}));

const BAR = 0.6;
const bars = GROUPS.map((d, i) => ({
  ...d,
  x1: BARS.band(i, N) - (BARS.bandWidth(N) * BAR) / 2,
  x2: BARS.band(i, N) + (BARS.bandWidth(N) * BAR) / 2,
  y: BARS.py(d.n),
  tied: TIES.some((t) => t.a.key === d.key || t.b.key === d.key),
}));

export const caption = `One icon per ${UNIT} people, which works until a value stops being a multiple of the unit. Rounded to whole icons, ${WORST.a.n} and ${WORST.b.n} draw the same number, so a ${WORST.ratio.toFixed(1)}-fold difference is shown as a tie.`;

export function render() {
  return plot({
    height: 340,
    marginTop: 26,
    marginLeft: 36,
    marginRight: 18,
    marginBottom: 44,
    ariaLabel: title,
    ...panelSpace(2),
    marks: [
      panelTitle(ICONS, `One icon per ${UNIT} people, rounded`, { fill: ACCENT }),
      panelTitle(BARS, "The same five counts as bars", { fill: PRIMARY }),

      Plot.dot(dots, {
        x: "x",
        y: "y",
        r: 6,
        fill: (d) => (d.tied ? ACCENT : PRIMARY),
        fillOpacity: 0.8,
        symbol: "square",
      }),
      Plot.text(rowLabels, {
        x: ICONS.left + 0.09,
        y: "y",
        text: "key",
        fill: MUTED,
        fontSize: 10,
        fontWeight: 600,
        textAnchor: "end",
        ...HALO,
      }),
      Plot.text(rowLabels, {
        x: ICONS.left + 0.11 + (MAX_ICONS - 0.4) * ICON_STEP,
        y: "y",
        text: (d) => `${d.n} becomes ${d.icons} ${d.icons === 1 ? "icon" : "icons"}`,
        fill: (d) => (TIES.some((t) => t.a.key === d.key || t.b.key === d.key) ? ACCENT : MUTED),
        fontSize: 10,
        fontWeight: 600,
        textAnchor: "start",
        ...HALO,
      }),

      ...panelAxis(BARS, { ticks: [0, 200, 400, 600] }),
      panelBaseline(BARS),
      Plot.rect(bars, {
        x1: "x1",
        x2: "x2",
        y1: BARS.py(0),
        y2: "y",
        fill: (d) => (d.tied ? ACCENT : PRIMARY),
        fillOpacity: 0.7,
      }),
      Plot.text(bars, {
        x: (d) => (d.x1 + d.x2) / 2,
        y: "y",
        text: (d) => String(d.n),
        fill: MUTED,
        fontSize: 10,
        fontWeight: 700,
        textAnchor: "middle",
        dy: -8,
        ...HALO,
      }),
      Plot.text(bars, {
        x: (d) => (d.x1 + d.x2) / 2,
        y: BARS.py(0),
        text: "key",
        fill: "currentColor",
        fillOpacity: 0.6,
        fontSize: 10,
        textAnchor: "middle",
        dy: 13,
      }),
      Plot.text([{}], {
        x: (ICONS.left + ICONS.right) / 2,
        y: ICONS.bottom,
        text: () =>
          `${WORST.a.n} and ${WORST.b.n} both draw ${rounded(WORST.a.n)}: a ${WORST.ratio.toFixed(1)}-fold gap, shown as a tie`,
        fill: ACCENT,
        fontSize: 10,
        fontWeight: 700,
        textAnchor: "middle",
        ...HALO,
      }),
    ],
  });
}
