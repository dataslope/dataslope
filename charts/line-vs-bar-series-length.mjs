/**
 * The second half of "line or bars?", for the case the first half leaves open.
 *
 * `line-vs-bar-four-cases` settles the axis question: over an ordered x, both
 * marks are honest. That is where most explanations stop, and it is where the
 * practical decision actually starts, because the two marks stop being
 * interchangeable as soon as the series gets long.
 *
 * Bars spend a slot of width on every observation and ask the reader to compare
 * heights across the slots. At six periods that is easy and the levels are
 * probably what someone came for. At thirty-six the slots are 5px wide, no
 * label fits under them, and the reader has stopped comparing bar to bar and
 * started reading the silhouette across the tops — which is a line, drawn
 * expensively, in ink that encodes nothing.
 *
 * All three panels are the same series: the left is its last six months, the
 * middle and right are all thirty-six. So the figure is not about a threshold
 * to memorise. It is about which comparison the mark is for. Bars compare
 * neighbours, and a line carries a shape.
 */
import { Plot, plot, GUIDE, HALO, MUTED, PRIMARY, rng } from "./_theme.mjs";
import { panel, panelAxis, panelBaseline, panelCategories, panelSpace, panelTitle } from "./_panels.mjs";

export const title =
  "One monthly signup series drawn three ways: its last six months as bars, where every level is readable; all thirty-six months as bars, where the bars are hairlines and no label fits; and all thirty-six as a line, where the trend and the summer dip that repeats every year are both plain.";

/** Three years of monthly signups: a steady climb, a summer dip, and enough
 *  noise that the shape has to be read rather than asserted. Seeded, because
 *  the generated module is diffed on every build. */
const MONTHS = 36;
const noise = rng(20260813);
const SERIES = Array.from({ length: MONTHS }, (_, i) => {
  const trend = 150 + i * 5.2;
  // Peaks in January, troughs in July: the annual dip the line gives away.
  const season = 38 * Math.cos(((i % 12) / 12) * 2 * Math.PI);
  return { i, value: Math.round(trend + season + (noise() - 0.5) * 26) };
});

const TAIL = SERIES.slice(-6);
const TAIL_LABELS = ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const Y = [0, 400];
const TICKS = [0, 100, 200, 300, 400];

const FEW = panel(0, { y: Y });
const MANY = panel(1, { x: [0, MONTHS - 1], y: Y });
const LINE = panel(2, { x: [0, MONTHS - 1], y: Y });

/** Bar geometry for a panel drawn with `band()`. */
const bars = (p, rows, n, width) =>
  rows.map((d, i) => ({
    ...d,
    x1: p.band(i, n) - (p.bandWidth(n) * width) / 2,
    x2: p.band(i, n) + (p.bandWidth(n) * width) / 2,
    y: p.py(d.value),
    y0: p.py(0),
  }));

const fewBars = bars(FEW, TAIL, TAIL.length, 0.62);
const manyBars = bars(MANY, SERIES, MONTHS, 0.68);
const linePoints = SERIES.map((d) => ({ x: LINE.px(d.i), y: LINE.py(d.value) }));

/** The seasonal trough of each year: the finding the line hands over for free
 *  and the fence of bars does not. */
const TROUGHS = [0, 1, 2].map((year) =>
  SERIES.slice(year * 12, year * 12 + 12).reduce((lo, d) => (d.value < lo.value ? d : lo)),
);

export const caption =
  "The same series three times. Six bars is a set of levels a reader can compare one against the next, which is what bars are for. Thirty-six bars is 36 slots about five pixels wide with no room for a label under any of them, and by then nobody is comparing bar to bar: they are reading the shape across the tops, which is a line drawn in a great deal of unnecessary ink. Drawn as one, the climb and the dip that lands every summer are both immediate. **Bars compare neighbours; a line carries a shape**, and the length of the series decides which of those the reader needs.";

export function render() {
  return plot({
    height: 330,
    marginTop: 24,
    marginLeft: 24,
    marginRight: 16,
    marginBottom: 34,
    ariaLabel: title,
    ...panelSpace(3),
    marks: [
      ...panelAxis(FEW, { ticks: TICKS }),
      ...panelAxis(MANY, { ticks: TICKS }),
      ...panelAxis(LINE, { ticks: TICKS }),

      panelTitle(FEW, "Six periods, as bars"),
      panelTitle(MANY, "Thirty-six, as bars"),
      panelTitle(LINE, "Thirty-six, as a line"),

      panelBaseline(FEW),
      panelBaseline(MANY),
      panelBaseline(LINE),

      Plot.rect(fewBars, {
        x1: "x1",
        x2: "x2",
        y1: "y0",
        y2: "y",
        fill: PRIMARY,
        fillOpacity: 0.6,
      }),
      panelCategories(FEW, TAIL_LABELS),

      Plot.rect(manyBars, {
        x1: "x1",
        x2: "x2",
        y1: "y0",
        y2: "y",
        fill: PRIMARY,
        fillOpacity: 0.6,
      }),

      Plot.line(linePoints, { x: "x", y: "y", stroke: PRIMARY, strokeWidth: 1.8 }),

      // The finding the line gives away and the fence does not: the same dip,
      // once a year, every year.
      Plot.dot(
        TROUGHS.map((d) => ({ x: LINE.px(d.i), y: LINE.py(d.value) })),
        { x: "x", y: "y", r: 8, stroke: GUIDE, strokeWidth: 1.6 },
      ),
      Plot.text([{}], {
        x: (LINE.left + LINE.right) / 2,
        y: LINE.py(45),
        text: () => "the same dip each summer",
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "middle",
        dy: 0,
        ...HALO,
      }),
      Plot.text([{}], {
        x: (MANY.left + MANY.right) / 2,
        y: MANY.py(0),
        text: () => "five pixels a bar, and no label fits",
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "middle",
        dy: 16,
        ...HALO,
      }),
    ],
  });
}
