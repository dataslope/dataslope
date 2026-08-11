/**
 * "Always start bar charts at zero" is a real rule with a real reason, and the
 * reason is why it does not extend to lines.
 *
 * Both panels are the same twelve numbers on the same axis, which starts at
 * 92. On the left the axis is a lie, on the right it is a reasonable editorial
 * choice, and nothing about the axis changed. What changed is the mark.
 *
 * A bar encodes its value as a *length*, measured from the baseline. That is
 * the entire encoding: there is nothing else in a bar. So when the baseline
 * moves off zero, every length in the chart is the value minus something, and
 * a reader comparing two bars is reading a ratio of two differences while
 * believing they are reading a ratio of two values. Here that turns a 4%
 * change into a bar three times another one.
 *
 * A line encodes its value as a *position*, and the comparison a line invites
 * is between one position and the next one along, which is a *slope*. Slope
 * does not care where the axis starts. Truncating the axis magnifies the
 * slope, which is a real risk and a real thing to be careful about, but it
 * does not make the reader compute a wrong ratio: nothing in a line chart is
 * measured from the bottom of the frame, because the bottom of the frame is
 * not part of the drawing.
 *
 * Hence the rule in its useful form. A zero baseline is mandatory when the
 * mark's length *is* the value, and optional when it is not. Bars, columns and
 * areas: zero. Lines, dots and slopes: whatever range shows the variation,
 * labelled honestly.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "The same twelve monthly values on the same axis, which starts at 92 rather than 0, drawn once as bars and once as a line. As bars the truncated baseline makes a four per cent change look like a threefold one; as a line the same axis only magnifies a slope, which is a much smaller sin.";

/** A satisfaction score that moves within four points all year, which is what
 *  most business metrics actually do. */
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const SCORE = [94.2, 94.0, 94.6, 95.1, 95.4, 95.0, 95.8, 96.3, 96.1, 96.9, 97.2, 97.6];

const SERIES = MONTHS.map((month, i) => ({ month, i, score: SCORE[i] }));

const BARS = "As bars: the length is the value";
const LINE = "As a line: the slope is the value";
const rows = [BARS, LINE].flatMap((panel) => SERIES.map((d) => ({ ...d, panel })));

const FLOOR = 92;
const LO = SERIES[1];
const HI = SERIES.at(-1);
/** What the eye reads off the truncated bars, against what actually happened. */
const REAL_CHANGE = ((HI.score - LO.score) / LO.score) * 100;
const APPARENT = (HI.score - FLOOR) / (LO.score - FLOOR);

export const caption = `Both panels are the same twelve numbers with the same axis, floored at ${FLOOR}. Nothing about the axis differs; the mark does. A bar says its value with a *length* measured up from the baseline, and that is all a bar is, so moving the baseline off zero means every length is the value minus ${FLOOR} and a reader comparing two bars is comparing two differences while believing they are comparing two values. Here the score rises ${REAL_CHANGE.toFixed(1)}% across the year and the last bar is ${APPARENT.toFixed(1)} times the height of the February one. A line says its value with a *position*, and invites you to compare a position with the next one along, which is a slope. A truncated axis exaggerates that slope, which is worth watching, but it does not hand anybody a wrong ratio, because nothing in a line chart is measured from the bottom of the frame. So the rule, usefully stated: zero is mandatory when the mark's length is the value, and optional when it is not.`;

export function render() {
  return plot({
    height: 320,
    marginTop: 26,
    marginLeft: 52,
    marginRight: 18,
    marginBottom: 48,
    ariaLabel: title,
    x: {
      label: null,
      domain: MONTHS,
      padding: 0.22,
      // Twelve labels do not fit twelve narrow bands side by side in two
      // panels, and a month name is guessable from its neighbours.
      ticks: MONTHS.filter((_, i) => i % 2 === 0),
    },
    y: {
      label: "Satisfaction score",
      domain: [FLOOR, 99],
      ticks: [92, 94, 96, 98],
      tickFormat: (d) => String(d),
    },
    fx: { label: null, domain: [BARS, LINE] },
    marks: [
      Plot.barY(
        rows.filter((d) => d.panel === BARS),
        { fx: "panel", x: "month", y: "score", fill: ACCENT, fillOpacity: 0.7, clip: true },
      ),
      Plot.line(
        rows.filter((d) => d.panel === LINE),
        { fx: "panel", x: "month", y: "score", stroke: PRIMARY, strokeWidth: 2.2 },
      ),
      Plot.dot(
        rows.filter((d) => d.panel === LINE),
        { fx: "panel", x: "month", y: "score", r: 3, fill: PRIMARY },
      ),
      Plot.text([{ panel: BARS, at: MONTHS[3] }], {
        fx: "panel",
        x: "at",
        y: 99,
        text: () => `a ${REAL_CHANGE.toFixed(1)}% rise,\ndrawn ${APPARENT.toFixed(1)} times as tall`,
        fill: ACCENT,
        fontSize: 10.5,
        fontWeight: 700,
        lineHeight: 1.35,
        textAnchor: "start",
        dy: 12,
        ...HALO,
      }),
      Plot.text([{ panel: LINE, at: MONTHS[3] }], {
        fx: "panel",
        x: "at",
        y: 99,
        text: () => "the same axis only\nsteepens a slope",
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 700,
        lineHeight: 1.35,
        textAnchor: "start",
        dy: 12,
        ...HALO,
      }),
      Plot.ruleY([FLOOR], { stroke: "currentColor", strokeOpacity: 0.35 }),
      Plot.text([{ panel: BARS, at: MONTHS.at(-1) }], {
        fx: "panel",
        x: "at",
        y: FLOOR,
        text: () => "the baseline is 92, not 0",
        fill: ACCENT,
        fontSize: 10,
        fontWeight: 600,
        textAnchor: "end",
        dy: -8,
        ...HALO,
      }),
    ],
  });
}
