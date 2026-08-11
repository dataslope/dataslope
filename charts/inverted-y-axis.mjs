/**
 * The misleading chart that contains no false numbers.
 *
 * Both panels plot the same eight values and both label their axes correctly.
 * The left one has the y axis running downwards, so gun deaths *rising* draw
 * as a line *falling*, and a reader who takes the usual half-second on a chart
 * takes away the opposite of what happened.
 *
 * This is not a hypothetical: a version of it was broadcast by Reuters in 2014
 * about Florida's firearm homicides, and the ensuing argument is a good test
 * of what "misleading" means. Nothing on the chart is false. The axis is
 * labelled, the numbers are right, and the designer's stated reason (the fill
 * was meant to read as pooling blood, with the baseline at the top) is a
 * real design intention rather than a trick.
 *
 * It is still misleading, and the reason is worth stating precisely. Up is
 * more. That convention is not a rule someone can opt out of by labelling the
 * axis, because a reader does not *read* an axis before forming an impression;
 * they see the shape first and check the axis afterwards, if at all. A chart
 * that requires the caption to undo the impression the shape just made has
 * already lost.
 *
 * The same argument applies more weakly to every convention a chart can
 * invert: time running right to left, a diverging scale with red on the good
 * side, a size encoding where small means more. None of them is *false*. All
 * of them cost the reader a correction they will not always make.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY } from "./_theme.mjs";
import { panel, panelAxis, panelBaseline, panelSpace, panelTitle } from "./_panels.mjs";

export const title =
  "One rising series drawn twice: with the vertical axis inverted so that the line falls, and the honest way up. The axis numbers are correct in both panels, and the two shapes say opposite things.";

const YEARS = [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023];
const DEATHS = [521, 548, 596, 634, 712, 768, 803, 841];
const SERIES = YEARS.map((year, i) => ({ year, i, v: DEATHS[i] }));

const RISE = Math.round(((DEATHS.at(-1) - DEATHS[0]) / DEATHS[0]) * 100);
const DOMAIN = [400, 900];

const FLIPPED = panel(0, { x: [0, YEARS.length - 1], y: DOMAIN });
const HONEST = panel(1, { x: [0, YEARS.length - 1], y: DOMAIN });

/** The inversion, and the whole subject of the figure: one minus the usual
 *  mapping, so a larger value lands lower on the page. */
const flipY = (v) => FLIPPED.top + FLIPPED.bottom - FLIPPED.py(v);

const flippedRow = SERIES.map((d) => ({ ...d, x: FLIPPED.px(d.i), y: flipY(d.v) }));
const honestRow = SERIES.map((d) => ({ ...d, x: HONEST.px(d.i), y: HONEST.py(d.v) }));

export const caption = `Same eight numbers, both axes correctly labelled, and the two panels say opposite things. On the left the vertical axis runs downwards, so a ${RISE}% rise draws as a line sloping down. A version of this was broadcast in 2014 about Florida's firearm homicides, and the argument that followed is a good test of what "misleading" means, because nothing on the chart is false: the axis is labelled, the numbers are right, and the designer's stated intention, a fill that reads as pooling blood with the baseline at the top, is a real design idea rather than a trick. It is misleading anyway, and the reason is worth saying exactly. Up is more. That is not a rule you can opt out of by labelling an axis, because a reader does not read the axis before forming an impression; they take the shape first and check the axis later, if at all. Any chart that needs its caption to undo the impression its shape just made has already lost. The same holds, more weakly, for every other convention a chart can invert: time running right to left, red on the good side of a diverging scale, small meaning more. None of them is false, and all of them cost a correction the reader will not always make.`;

export function render() {
  return plot({
    height: 330,
    marginTop: 26,
    marginLeft: 42,
    marginRight: 18,
    marginBottom: 42,
    ariaLabel: title,
    ...panelSpace(2),
    marks: [
      // The inverted panel's tick labels are the honest ones, printed at the
      // inverted positions: that is exactly what makes it defensible and
      // exactly what makes it work.
      ...panelAxis(
        { ...FLIPPED, py: flipY },
        { ticks: [400, 500, 600, 700, 800, 900] },
      ),
      ...panelAxis(HONEST, { ticks: [400, 500, 600, 700, 800, 900] }),
      panelTitle(FLIPPED, "Axis inverted", { fill: ACCENT }),
      panelTitle(HONEST, "Axis the usual way up", { fill: PRIMARY }),

      Plot.areaY(flippedRow, {
        x: "x",
        y1: flipY(DOMAIN[0]),
        y2: "y",
        fill: ACCENT,
        fillOpacity: 0.16,
      }),
      Plot.line(flippedRow, { x: "x", y: "y", stroke: ACCENT, strokeWidth: 2.2 }),
      Plot.dot(flippedRow, { x: "x", y: "y", r: 3, fill: ACCENT }),

      Plot.areaY(honestRow, {
        x: "x",
        y1: HONEST.py(DOMAIN[0]),
        y2: "y",
        fill: PRIMARY,
        fillOpacity: 0.14,
      }),
      Plot.line(honestRow, { x: "x", y: "y", stroke: PRIMARY, strokeWidth: 2.2 }),
      Plot.dot(honestRow, { x: "x", y: "y", r: 3, fill: PRIMARY }),

      ...[FLIPPED, HONEST].map((p) =>
        Plot.text(
          YEARS.filter((_, i) => i % 2 === 0).map((year, j) => ({ year, x: p.px(j * 2) })),
          {
            x: "x",
            y: p.bottom,
            text: (d) => String(d.year),
            fill: "currentColor",
            fillOpacity: 0.55,
            fontSize: 10,
            textAnchor: "middle",
            dy: 14,
          },
        ),
      ),

      Plot.text([{}], {
        x: FLIPPED.px(3.5),
        y: flipY(560),
        text: () => `a ${RISE}% rise,\ndrawn as a decline`,
        fill: ACCENT,
        fontSize: 10.5,
        fontWeight: 700,
        lineHeight: 1.35,
        textAnchor: "middle",
        ...HALO,
      }),
      Plot.text([{}], {
        x: HONEST.px(2.6),
        y: HONEST.py(790),
        text: () => "the same eight numbers",
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "middle",
        ...HALO,
      }),
    ],
  });
}
