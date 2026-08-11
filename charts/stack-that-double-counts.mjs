/**
 * A stacked bar is a claim about arithmetic, and multi-select answers do not
 * satisfy it.
 *
 * When you stack segments, you are asserting two things the reader will take
 * on trust. First, that the parts are *mutually exclusive*: nothing is in two
 * of them. Second, that they are *exhaustive*: the bar's full length is the
 * whole. Both are true of "how did you travel to work today" and neither is
 * true of "which of these tools do you use", where a respondent ticks four
 * boxes and appears in four segments.
 *
 * The tell is on the axis. This bar runs to 187%, and the reader's eye has
 * already done the wrong thing before they notice, because a stack is read as
 * a *composition*: each segment looks like a share of the total, so a tool
 * used by 41% of people renders as roughly a fifth of the bar. The mental
 * arithmetic silently divides by 187 instead of by 100.
 *
 * Worse, the segments are not comparable to each other either. Their lengths
 * are correct as shares of respondents, but they are drawn end to end, which
 * is the layout that says "these add up". Two segments of the same length mean
 * two tools with the same adoption, and the reader will read the second one as
 * smaller because it starts further along and has no baseline to be measured
 * from.
 *
 * The fix is not a normalisation. Scaling this to 100% would be worse: it
 * would make the arithmetic *look* right while making every number wrong. Draw
 * multi-select answers as plain bars from a common zero, each labelled with
 * the per cent of *respondents* who picked it, and say the total exceeds 100
 * because people could pick more than one.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY, SERIES } from "./_theme.mjs";
import { panel, panelAxis, panelBaseline, panelSpace, panelTitle } from "./_panels.mjs";

export const title =
  "One multi-select survey question drawn as a stacked bar, where the segments sum to 187 per cent, and as separate bars from a common zero. The stack asserts that its parts partition a whole, which multi-select answers never do.";

/** "Which of these do you use?", per cent of respondents choosing each. */
const TOOLS = [
  { key: "Spreadsheets", pct: 78 },
  { key: "SQL", pct: 41 },
  { key: "Python", pct: 33 },
  { key: "BI tool", pct: 21 },
  { key: "R", pct: 14 },
];

const TOTAL = TOOLS.reduce((s, d) => s + d.pct, 0);
const N = TOOLS.length;
const AVG_PICKS = (TOTAL / 100).toFixed(1);
const SECOND = TOOLS[1];
/** What the second segment looks like it is worth, if the bar is read as a
 *  whole, which is how a stack is read. */
const MISREAD = Math.round((SECOND.pct / TOTAL) * 100);

const STACK = panel(0, { y: [0, TOTAL * 1.06] });
const BARS = panel(1, { y: [0, 88] });

const stacked = (() => {
  let acc = 0;
  return TOOLS.map((d, i) => {
    const from = acc;
    acc += d.pct;
    return {
      ...d,
      color: SERIES[i],
      y1: STACK.py(from),
      y2: STACK.py(acc),
      mid: STACK.py((from + acc) / 2),
    };
  });
})();

const BAR = 0.6;
const bars = TOOLS.map((d, i) => ({
  ...d,
  color: SERIES[i],
  x1: BARS.band(i, N) - (BARS.bandWidth(N) * BAR) / 2,
  x2: BARS.band(i, N) + (BARS.bandWidth(N) * BAR) / 2,
  y: BARS.py(d.pct),
}));

const STACK_X = (STACK.left + STACK.right) / 2;
const STACK_W = (STACK.right - STACK.left) * 0.34;

export const caption = `One multi-select survey question drawn as a stacked bar, whose segments sum to ${TOTAL}%, and as separate bars from a common zero.`;

export function render() {
  return plot({
    height: 340,
    marginTop: 26,
    marginLeft: 40,
    marginRight: 18,
    marginBottom: 42,
    ariaLabel: title,
    ...panelSpace(2),
    marks: [
      ...panelAxis(STACK, {
        ticks: [0, 50, 100, 150],
        format: (v) => `${v}%`,
      }),
      ...panelAxis(BARS, { ticks: [0, 25, 50, 75], format: (v) => `${v}%` }),
      panelTitle(STACK, "Stacked: the parts add to 187%", { fill: ACCENT }),
      panelTitle(BARS, "Bars: each from the same zero", { fill: PRIMARY }),
      panelBaseline(STACK),
      panelBaseline(BARS),

      Plot.rect(stacked, {
        x1: STACK_X - STACK_W / 2,
        x2: STACK_X + STACK_W / 2,
        y1: "y1",
        y2: "y2",
        fill: "color",
        fillOpacity: 0.82,
        stroke: "var(--ds-chart-surface)",
        strokeWidth: 1,
      }),
      Plot.text(stacked, {
        x: STACK_X + STACK_W / 2,
        y: "mid",
        text: (d) => `${d.key} ${d.pct}%`,
        fill: MUTED,
        fontSize: 10,
        fontWeight: 600,
        textAnchor: "start",
        dx: 8,
        ...HALO,
      }),
      Plot.text([{}], {
        x: STACK_X,
        y: STACK.py(TOTAL),
        text: () => `${TOTAL}%`,
        fill: ACCENT,
        fontSize: 11,
        fontWeight: 700,
        textAnchor: "middle",
        dy: -9,
        ...HALO,
      }),

      Plot.rect(bars, {
        x1: "x1",
        x2: "x2",
        y1: BARS.py(0),
        y2: "y",
        fill: "color",
        fillOpacity: 0.75,
      }),
      Plot.text(bars, {
        x: (d) => (d.x1 + d.x2) / 2,
        y: "y",
        text: (d) => `${d.pct}%`,
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
        text: (d) => d.key,
        fill: "currentColor",
        fillOpacity: 0.6,
        fontSize: 10,
        textAnchor: "middle",
        dy: 13,
      }),
      Plot.text([{}], {
        x: (BARS.left + BARS.right) / 2,
        y: BARS.py(0),
        text: () => `per cent of respondents, who picked ${AVG_PICKS} answers each`,
        fill: MUTED,
        fontSize: 10,
        fontWeight: 600,
        textAnchor: "middle",
        dy: 30,
        ...HALO,
      }),
    ],
  });
}
