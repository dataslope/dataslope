/**
 * Categories that are secretly numbers, and the curve that straightens when
 * nobody is looking.
 *
 * The x values here are doses: 1, 2, 5, 10, 50 mg. They are numbers, and the
 * gaps between them are wildly unequal, which is normal for a designed
 * experiment because you choose doses on a roughly logarithmic ladder rather
 * than an even one.
 *
 * The left panel plots them the way almost every chart library will if the
 * column arrives as a string, or as a category, or as the index of a groupby:
 * one slot per distinct value, evenly spaced. The right panel puts each point
 * where its number actually is.
 *
 * The distortion runs in a specific direction, and it is worth knowing which.
 * Even spacing *stretches* the region where the real values are dense and
 * *compresses* the region where they are sparse. Here the dense region is the
 * low doses, where the response is climbing fast, and the sparse region is the
 * long stretch from 10 to 50, where the response has flattened. Stretching the
 * first and squashing the second turns a curve that plainly saturates into a
 * line that plainly does not, which is the difference between "we have found
 * the useful dose" and "keep increasing it".
 *
 * The failure is quiet because nothing looks wrong. Both axes carry the right
 * five numbers in the right order. The only clue is that the gaps between the
 * tick labels do not match the gaps between the values, which is precisely the
 * thing a reader is not checking.
 *
 * The habit that prevents it: after any `groupby`, `pivot` or `value_counts`,
 * check whether the index that came back is a number pretending to be a label.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY } from "./_theme.mjs";
import { panel, panelAxis, panelBaseline, panelSpace, panelTitle } from "./_panels.mjs";

export const title =
  "Five dose levels of 1, 2, 5, 10 and 50 mg plotted at equal spacing and at their real positions. Evenly spaced, the response looks like a straight line that keeps climbing; on a real numeric axis it is a curve that has clearly flattened out by 10 mg.";

/** A saturating dose-response: fast at first, flat by the top of the range. */
const DOSES = [
  { dose: 1, response: 18 },
  { dose: 2, response: 31 },
  { dose: 5, response: 52 },
  { dose: 10, response: 63 },
  { dose: 50, response: 74 },
];

const N = DOSES.length;
const Y = [0, 84];

const EVEN = panel(0, { y: Y });
const REAL = panel(1, { x: [0, 52], y: Y });

const evenRow = DOSES.map((d, i) => ({ ...d, x: EVEN.band(i, N), y: EVEN.py(d.response) }));
const realRow = DOSES.map((d) => ({ ...d, x: REAL.px(d.dose), y: REAL.py(d.response) }));

/** How much of the real range the last gap is, against how much of the drawing
 *  it gets when the axis is evenly spaced. */
const LAST_GAP = DOSES.at(-1).dose - DOSES.at(-2).dose;
const TOTAL_RANGE = DOSES.at(-1).dose - DOSES[0].dose;
const REAL_SHARE = Math.round((LAST_GAP / TOTAL_RANGE) * 100);
const EVEN_SHARE = Math.round((1 / (N - 1)) * 100);

export const caption = `Five doses: 1, 2, 5, 10 and 50 mg. Those are numbers, and their gaps are wildly unequal, which is normal for a designed experiment because doses are chosen on roughly a logarithmic ladder. The left panel plots them the way most libraries will if the column arrives as a string, as a category, or as the index of a groupby: one slot each, evenly spaced. The right panel puts each point where its number is. The distortion has a direction worth knowing. Even spacing stretches wherever the real values are dense and squashes wherever they are sparse, so here the crowded low doses get more of the drawing than they have earned and the long empty stretch from 10 to 50 gets less: ${REAL_SHARE}% of the real range drawn in ${EVEN_SHARE}% of the width. Stretch the climbing part and compress the flat part and a curve that obviously saturates becomes a line that obviously does not, which is the difference between "we have found the useful dose" and "keep increasing it". Nothing looks wrong, because both axes carry the right five numbers in the right order. The only clue is that the spacing of the labels does not match the spacing of the values, which is exactly what nobody checks. The habit that prevents it: after any groupby, pivot or value_counts, look at whether the index you got back is a number pretending to be a label.`;

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
      ...panelAxis(EVEN, { ticks: [0, 20, 40, 60, 80] }),
      ...panelAxis(REAL, { ticks: [0, 20, 40, 60, 80] }),
      panelTitle(EVEN, "Doses as categories, evenly spaced", { fill: ACCENT }),
      panelTitle(REAL, "Doses on a real numeric axis", { fill: PRIMARY }),
      panelBaseline(EVEN),
      panelBaseline(REAL),

      Plot.line(evenRow, { x: "x", y: "y", stroke: ACCENT, strokeWidth: 2.2 }),
      Plot.dot(evenRow, { x: "x", y: "y", r: 3.6, fill: ACCENT }),
      Plot.line(realRow, { x: "x", y: "y", stroke: PRIMARY, strokeWidth: 2.2 }),
      Plot.dot(realRow, { x: "x", y: "y", r: 3.6, fill: PRIMARY }),

      Plot.text(evenRow, {
        x: "x",
        y: EVEN.py(0),
        text: (d) => String(d.dose),
        fill: "currentColor",
        fillOpacity: 0.6,
        fontSize: 10,
        textAnchor: "middle",
        dy: 13,
      }),
      // 1 and 2 mg are five pixels apart on a real axis, which is the point of
      // the panel and also why only one of them can carry a label.
      Plot.text(
        realRow.filter((d) => d.dose !== 2),
        {
        x: "x",
        y: REAL.py(0),
        text: (d) => String(d.dose),
        fill: "currentColor",
        fillOpacity: 0.6,
        fontSize: 10,
        textAnchor: "middle",
        dy: 13,
      },
      ),
      ...[EVEN, REAL].map((p) =>
        Plot.text([{}], {
          x: (p.left + p.right) / 2,
          y: p.py(0),
          text: () => "Dose (mg)",
          fill: MUTED,
          fontSize: 10,
          fontWeight: 600,
          textAnchor: "middle",
          dy: 30,
          ...HALO,
        }),
      ),

      Plot.text([{}], {
        x: EVEN.band(2, N),
        y: EVEN.py(20),
        text: () => "looks like it is still\nclimbing at the same rate",
        fill: ACCENT,
        fontSize: 10,
        fontWeight: 600,
        lineHeight: 1.35,
        textAnchor: "middle",
        ...HALO,
      }),
      Plot.text([{}], {
        x: REAL.px(28),
        y: REAL.py(40),
        text: () => "flat well before the top\nof the dose range",
        fill: MUTED,
        fontSize: 10,
        fontWeight: 600,
        lineHeight: 1.35,
        textAnchor: "middle",
        ...HALO,
      }),
    ],
  });
}
