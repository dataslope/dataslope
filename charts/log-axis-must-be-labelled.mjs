/**
 * The same eight numbers, once as what they are and once as a straight line.
 *
 * A log axis is the correct tool for a quantity that multiplies, and this
 * series multiplies: it doubles every quarter. On a linear axis that produces
 * the shape everyone recognises as a hockey stick, which is honest and not
 * very informative, because the first six quarters are pressed flat against
 * the floor and you cannot tell whether the early growth was steady or not.
 *
 * On a log axis the same series is a straight line, and the straightness is
 * the finding: a straight line on a log axis *is* a constant growth rate. That
 * is the whole reason to reach for one.
 *
 * The catch is that "straight and gently rising" is also what a reader takes
 * from a linear chart of a company growing slowly, and the two pictures are
 * nearly identical. Everything that separates them lives in the tick labels
 * and the axis title. Take the label away, or set it in the same grey as the
 * gridlines and let it fall off the bottom of a slide, and a chart of a
 * quantity that grew a hundred and twenty-eight fold reads as modest,
 * dependable progress.
 *
 * So: a log axis is not a trick, and the rule is not "avoid it". The rule is
 * that a log axis has a mandatory piece of furniture. Say it in the axis
 * title, and if the chart matters, say it again in the annotation.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY } from "./_theme.mjs";
import { panel, panelAxis, panelBaseline, panelSpace, panelTitle } from "./_panels.mjs";

export const title =
  "One series that doubles every quarter, drawn on a linear axis and on a logarithmic one. The linear panel is a hockey stick pressed against the floor; the log panel is a straight line, and the straightness is what says the growth rate is constant.";

const QUARTERS = ["Q1", "Q2", "Q3", "Q4", "Q5", "Q6", "Q7", "Q8"];
/** Active accounts, doubling every quarter from a small start. */
const SERIES = QUARTERS.map((label, i) => ({ label, i, users: 1200 * 2 ** i }));

const LAST = SERIES.at(-1);
const FIRST = SERIES[0];
const GROWTH = Math.round(LAST.users / FIRST.users);

const LINEAR = panel(0, { x: [0, 7], y: [0, 165_000] });
const LOG = panel(1, { x: [0, 7], y: [900, 260_000], yType: "log" });

const line = (p) => SERIES.map((d) => ({ ...d, x: p.px(d.i), y: p.py(d.users) }));
const linearRow = line(LINEAR);
const logRow = line(LOG);

const k = (v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v));

export const caption = `The same eight numbers on a linear and a log axis: an account count that doubles every quarter and ends ${GROWTH} times where it started.`;

export function render() {
  return plot({
    height: 340,
    marginTop: 24,
    marginLeft: 34,
    marginRight: 18,
    marginBottom: 40,
    ariaLabel: title,
    ...panelSpace(2),
    marks: [
      ...panelAxis(LINEAR, { ticks: [0, 40_000, 80_000, 120_000, 160_000], format: k }),
      ...panelAxis(LOG, { ticks: [1000, 10_000, 100_000], format: k }),
      panelTitle(LINEAR, "Linear axis"),
      panelTitle(LOG, "Log axis, and it has to say so", { fill: ACCENT }),
      panelBaseline(LINEAR),

      Plot.areaY(linearRow, {
        x: "x",
        y1: LINEAR.py(0),
        y2: "y",
        fill: PRIMARY,
        fillOpacity: 0.14,
      }),
      Plot.line(linearRow, { x: "x", y: "y", stroke: PRIMARY, strokeWidth: 2.2 }),
      Plot.dot(linearRow, { x: "x", y: "y", r: 3, fill: PRIMARY }),

      Plot.line(logRow, { x: "x", y: "y", stroke: PRIMARY, strokeWidth: 2.2 }),
      Plot.dot(logRow, { x: "x", y: "y", r: 3, fill: PRIMARY }),

      ...[LINEAR, LOG].map((p) =>
        Plot.text(
          QUARTERS.map((label, i) => ({ label, x: p.px(i) })),
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

      Plot.text([{}], {
        x: LINEAR.px(2.4),
        y: LINEAR.py(0),
        text: () => "six quarters flat\nagainst the floor",
        fill: MUTED,
        fontSize: 10,
        fontWeight: 600,
        lineHeight: 1.35,
        textAnchor: "middle",
        dy: -30,
        ...HALO,
      }),
      Plot.text([{}], {
        x: LOG.px(3.4),
        y: LOG.py(9000),
        text: () => "straight here means the\ngrowth rate never changed",
        fill: MUTED,
        fontSize: 10,
        fontWeight: 600,
        lineHeight: 1.35,
        textAnchor: "middle",
        dy: 26,
        ...HALO,
      }),
      Plot.text([{}], {
        x: (LOG.left + LOG.right) / 2,
        y: LOG.bottom,
        text: () => "each gridline is ten times the one below it",
        fill: ACCENT,
        fontSize: 10,
        fontWeight: 700,
        textAnchor: "middle",
        dy: 30,
        ...HALO,
      }),
    ],
  });
}
