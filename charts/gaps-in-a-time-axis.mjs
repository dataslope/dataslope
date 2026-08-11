/**
 * A time series with holes in it, plotted twice: once against row number and
 * once against time.
 *
 * If a date column arrives as text, or as the default integer index after a
 * `read_csv`, the x axis is *row order*, not time. Every observation gets the
 * same horizontal slot, so a gap where no data was recorded closes up and the
 * points either side become neighbours.
 *
 * That is not a cosmetic difference. Three separate readings change:
 *
 *   • the *shape* is wrong. This series has a nine-day outage in the middle;
 *     against row order the level before and after the outage sit side by
 *     side, so a step change reads as a smooth one;
 *   • the *slope* is wrong everywhere, since a slope is change per unit time
 *     and the units are no longer time. The steepest-looking segment on the
 *     left panel spans nine days; the ones next to it span one;
 *   • the *gap itself* is invisible, and the gap is usually the interesting
 *     part. Missing data is rarely missing at random. Something happened.
 *
 * The right panel is the same numbers against a real date axis, with the
 * series broken rather than bridged across the hole. Bridging is the second
 * decision to make deliberately: joining the two ends with a straight line
 * draws nine days of readings nobody took.
 *
 * In pandas the fix is one call, `pd.to_datetime`, followed by
 * `set_index` and usually `asfreq("D")`, which materialises the missing days
 * as NaN so that they are visibly missing rather than quietly absent.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, PRIMARY, rng } from "./_theme.mjs";
import { panel, panelAxis, panelSpace, panelTitle } from "./_panels.mjs";

export const title =
  "A daily series with a nine-day outage, plotted against row order and against a real date axis. Against row order the gap closes up and a step change reads as a smooth one; against dates the hole is visible and the step is obvious.";

/** Day-of-month, with days 12 to 20 missing entirely, and a level shift that
 *  happened during the outage. */
const u = rng(6_119);
const DAYS = [];
for (let d = 1; d <= 30; d++) {
  if (d >= 12 && d <= 20) continue;
  const base = d < 12 ? 62 : 34;
  DAYS.push({ day: d, v: Math.round(base + (u() - 0.5) * 7) });
}

const GAP_FROM = 11;
const GAP_TO = 21;
const MISSING = GAP_TO - GAP_FROM - 1;
const before = DAYS.filter((d) => d.day < GAP_FROM + 1);
const after = DAYS.filter((d) => d.day > GAP_TO - 1);
const STEP = Math.round(
  before.slice(-3).reduce((s, d) => s + d.v, 0) / 3 -
    after.slice(0, 3).reduce((s, d) => s + d.v, 0) / 3,
);

const Y = [20, 78];
const ROWS = panel(0, { x: [0, DAYS.length - 1], y: Y });
const DATES = panel(1, { x: [1, 30], y: Y });

const rowSeries = DAYS.map((d, i) => ({ ...d, x: ROWS.px(i), y: ROWS.py(d.v) }));
const dateBefore = before.map((d) => ({ ...d, x: DATES.px(d.day), y: DATES.py(d.v) }));
const dateAfter = after.map((d) => ({ ...d, x: DATES.px(d.day), y: DATES.py(d.v) }));

export const caption = `If a date column arrives as text, or as the default integer index after a read_csv, the horizontal axis is row order rather than time. Every observation gets an equal slot, so a stretch where nothing was recorded closes up and the points either side become neighbours. Three readings change, not one. The shape is wrong: this series has a ${MISSING}-day outage, and against row order the levels before and after it sit next to each other, so a drop of about ${Math.abs(STEP)} units reads as a gentle slide. Every slope is wrong, because a slope is change per unit *time* and the units are no longer time: one segment on the left spans ${MISSING} days and its neighbours span one, and they are drawn the same width. And the gap itself disappears, which is usually the expensive part, because missing data is rarely missing at random. Something happened here. The right panel is the same numbers against real dates with the line broken rather than bridged, and that is the second decision worth making deliberately: joining the two ends with a straight segment draws ${MISSING} days of readings nobody took. In pandas the fix is pd.to_datetime, then set_index, then usually asfreq("D"), which materialises the absent days as NaN so they are visibly missing instead of quietly gone.`;

export function render() {
  return plot({
    height: 320,
    marginTop: 26,
    marginLeft: 38,
    marginRight: 18,
    marginBottom: 46,
    ariaLabel: title,
    ...panelSpace(2),
    marks: [
      ...panelAxis(ROWS, { ticks: [20, 40, 60, 80] }),
      ...panelAxis(DATES, { ticks: [20, 40, 60, 80] }),
      panelTitle(ROWS, "Plotted against row order", { fill: ACCENT }),
      panelTitle(DATES, "Plotted against the date", { fill: PRIMARY }),

      Plot.line(rowSeries, { x: "x", y: "y", stroke: ACCENT, strokeWidth: 2 }),
      Plot.dot(rowSeries, { x: "x", y: "y", r: 2.8, fill: ACCENT }),

      // The hole, marked rather than bridged.
      Plot.rect([{}], {
        x1: DATES.px(GAP_FROM),
        x2: DATES.px(GAP_TO),
        y1: DATES.py(Y[0]),
        y2: DATES.py(Y[1]),
        fill: GUIDE,
        fillOpacity: 0.14,
      }),
      Plot.line(dateBefore, { x: "x", y: "y", stroke: PRIMARY, strokeWidth: 2 }),
      Plot.line(dateAfter, { x: "x", y: "y", stroke: PRIMARY, strokeWidth: 2 }),
      Plot.dot([...dateBefore, ...dateAfter], { x: "x", y: "y", r: 2.8, fill: PRIMARY }),

      ...[
        [ROWS, (i) => `${DAYS[i].day}`],
        [DATES, null],
      ].map(([p, labelFor]) =>
        Plot.text(
          labelFor
            ? [0, 5, 10, 15, 20].map((i) => ({ label: labelFor(i), x: p.px(i) }))
            : [1, 8, 15, 22, 29].map((d) => ({ label: String(d), x: p.px(d) })),
          {
            x: "x",
            y: p.bottom,
            text: "label",
            fill: "currentColor",
            fillOpacity: 0.55,
            fontSize: 10,
            textAnchor: "middle",
            dy: 14,
          },
        ),
      ),
      ...[ROWS, DATES].map((p, k) =>
        Plot.text([{}], {
          x: (p.left + p.right) / 2,
          y: p.bottom,
          text: () => (k === 0 ? "day of month, as recorded in order" : "day of month"),
          fill: MUTED,
          fontSize: 10,
          fontWeight: 600,
          textAnchor: "middle",
          dy: 30,
          ...HALO,
        }),
      ),

      Plot.text([{}], {
        x: ROWS.px(10.5),
        y: ROWS.py(48),
        text: () => `${MISSING} missing days,\nclosed up`,
        fill: ACCENT,
        fontSize: 10,
        fontWeight: 700,
        lineHeight: 1.35,
        textAnchor: "middle",
        ...HALO,
      }),
      Plot.text([{}], {
        x: DATES.px((GAP_FROM + GAP_TO) / 2),
        y: DATES.py(Y[1]),
        text: () => `${MISSING} days\nwith no data`,
        fill: MUTED,
        fontSize: 10,
        fontWeight: 700,
        lineHeight: 1.35,
        textAnchor: "middle",
        dy: 14,
        ...HALO,
      }),
    ],
  });
}
