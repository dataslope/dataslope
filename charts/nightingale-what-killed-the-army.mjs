/**
 * The sentence the rose exists to prove, as two running totals.
 *
 * London believed the army in the East was dying of its wounds. Nightingale's
 * table says otherwise, and the cleanest way to say so is to stop plotting
 * rates and start adding up bodies: one curve for the diseases she called
 * preventable, one for wounds and injuries, both accumulating across the same
 * twenty-four months.
 *
 * The curves are counts rather than rates on purpose. Rates are the right
 * encoding for the rose, because the army grew fivefold and a chart of monthly
 * deaths would confound the epidemic with reinforcements. But "how many men
 * did this actually kill" is a question about counts, and it is the question a
 * politician was being asked to act on.
 *
 * The shape is the argument twice over. The gap between the two curves is the
 * case against the hospitals; the *elbow* in the upper curve, right where the
 * Sanitary Commission arrives, is the case that something could be done about
 * it. After that month the blue curve is almost flat, and the red one, the war
 * itself, carries on at the rate it always had.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, SERIES } from "./_theme.mjs";
import { COMMISSION_INDEX, MONTHS } from "./_nightingale.mjs";

export const title =
  "Cumulative deaths in the British army in the East, April 1854 to March 1856, split into preventable disease and wounds. The disease curve climbs to about 16,000 and flattens sharply after the Sanitary Commission arrives in March 1855; the wounds curve rises steadily to about 1,700 throughout.";

/** Running totals of the raw counts, month by month. */
const series = ["disease", "wounds"].map((cause) => {
  let running = 0;
  return {
    cause,
    points: MONTHS.map((m) => {
      running += m.deaths[cause];
      return { i: m.i, label: m.label, cause, total: running };
    }),
  };
});

const rows = series.flatMap((s) => s.points);
const END = Object.fromEntries(series.map((s) => [s.cause, s.points.at(-1).total]));
const AT_COMMISSION = Object.fromEntries(
  series.map((s) => [s.cause, s.points[COMMISSION_INDEX].total]),
);
const COLOR = { disease: SERIES[0], wounds: ACCENT };
const YMAX = Math.ceil(END.disease / 2000) * 2000 + 1000;
const afterShare = Math.round(((END.disease - AT_COMMISSION.disease) / END.disease) * 100);
const ratio = (END.disease / END.wounds).toFixed(1);

export const caption = `The same table as the rose, adding the deaths up rather than averaging them. Across the two years ${END.disease.toLocaleString()} men died of preventable disease and ${END.wounds.toLocaleString()} of wounds and injuries, a ratio of ${ratio} to one.`;

export function render() {
  return plot({
    height: 340,
    marginTop: 26,
    marginLeft: 64,
    marginRight: 132,
    marginBottom: 50,
    ariaLabel: title,
    x: {
      label: null,
      domain: [0, MONTHS.length - 1],
      ticks: [0, 9, 21],
      tickFormat: (i) => MONTHS[i].label,
    },
    y: { label: "Deaths so far", domain: [0, YMAX], ticks: 5 },
    marks: [
      Plot.ruleX([COMMISSION_INDEX], { stroke: GUIDE, strokeWidth: 1.5, strokeDasharray: "4,3" }),
      Plot.text([{}], {
        x: COMMISSION_INDEX,
        y: YMAX,
        text: () => "Sanitary Commission\narrives",
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.35,
        textAnchor: "start",
        dx: 8,
        dy: 4,
        ...HALO,
      }),
      Plot.areaY(series[0].points, {
        x: "i",
        y: "total",
        fill: SERIES[0],
        fillOpacity: 0.11,
        clip: true,
      }),
      Plot.line(rows, {
        x: "i",
        y: "total",
        z: "cause",
        stroke: (d) => COLOR[d.cause],
        strokeWidth: 2.2,
        clip: true,
      }),
      Plot.dot(
        series.map((s) => s.points.at(-1)),
        { x: "i", y: "total", fill: (d) => COLOR[d.cause], r: 4 },
      ),
      Plot.text([series[0].points.at(-1)], {
        x: "i",
        y: "total",
        text: () => `Preventable disease\n${END.disease.toLocaleString()} dead`,
        fill: SERIES[0],
        fontSize: 11,
        fontWeight: 600,
        lineHeight: 1.35,
        textAnchor: "start",
        dx: 9,
        ...HALO,
      }),
      Plot.text([series[1].points.at(-1)], {
        x: "i",
        y: "total",
        text: () => `Wounds\n${END.wounds.toLocaleString()} dead`,
        fill: ACCENT,
        fontSize: 11,
        fontWeight: 600,
        lineHeight: 1.35,
        textAnchor: "start",
        dx: 9,
        dy: 6,
        ...HALO,
      }),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
