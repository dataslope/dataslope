/**
 * The same twenty-four months as `nightingale-rose-1858`, on a length scale.
 *
 * Nothing has been added and nothing removed. The rose encodes each rate as an
 * area and asks the eye to compare wedges; this encodes it as a bar height and
 * asks the eye to compare lengths, which is the one comparison people make
 * accurately (`encoding-accuracy`). Everything the rose implies is here, and
 * three things it cannot show are here too:
 *
 *   • the *scale* of the peak. In the rose January 1855 reaches about six
 *     times as far as an ordinary month while being thirty-four times as
 *     deadly, because the radius is a square root. Here it is thirty-four
 *     times as tall, which is what happened;
 *   • the *timing*. A circle has no beginning, so the rose cannot show that
 *     the collapse follows the Sanitary Commission. A time axis can, and the
 *     rule marking March 1855 is the whole causal claim;
 *   • the *sum*. Stacked from a common baseline, the total death rate is the
 *     top of the bar, which in the rose is nowhere at all: overlapping wedges
 *     sharing a vertex cannot be added by eye.
 *
 * This is the honest chart and the rose is the one that changed British
 * military medicine, which is the tension the lesson is really about. It is
 * not obvious that Nightingale chose wrong.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, SERIES } from "./_theme.mjs";
import { COMMISSION_INDEX, MONTHS, PEAK } from "./_nightingale.mjs";

export const title =
  "The twenty-four months of Nightingale's rose redrawn as stacked bars on a time axis: annual death rate per 1,000, split into preventable disease, wounds and other causes. Disease towers over everything until March 1855, when the Sanitary Commission arrives, and the bars collapse to near nothing within a year.";

const CAUSE_COLOUR = { disease: SERIES[0], wounds: ACCENT, other: MUTED };
const STACK_ORDER = ["other", "wounds", "disease"];

const rows = MONTHS.flatMap((m) =>
  STACK_ORDER.map((cause) => ({
    i: m.i,
    label: m.label,
    cause,
    rate: m[cause],
  })),
);

const LEGEND = [
  { cause: "disease", label: "Preventable disease" },
  { cause: "wounds", label: "Wounds" },
  { cause: "other", label: "All other causes" },
// Anchored to real band values. A band scale maps discrete domain entries and
// nothing else, so an annotation placed at `10.5` or `0.4` resolves to
// undefined and is silently dropped: the rule, its label and this legend all
// vanished from the first render that way.
].map((d, k) => ({ ...d, i: MONTHS[0].i, y: 1195 - k * 76 }));

const COMMISSION = MONTHS[COMMISSION_INDEX];
const LAST = MONTHS.at(-1);
const ratio = Math.round(PEAK.disease / (PEAK.wounds || 1));

export const caption = `The same table as the rose above, encoded as length instead of area. Three things arrive with the change. The peak is now its real size: ${Math.round(PEAK.disease).toLocaleString()} per 1,000 per year in ${PEAK.label}, about ${ratio} times the wounds rate in the same month, where the rose could only show it reaching about six times as far. The bars sum, so the top of each one is the total death rate, which overlapping wedges sharing a vertex can never show. And a circle has no beginning, so only a time axis can put the Sanitary Commission's arrival in ${COMMISSION.label} where it belongs: everything to the right of that rule is the argument the chart was made to win. By ${LAST.label} the disease rate was ${LAST.disease.toFixed(1)}.`;

export function render() {
  return plot({
    height: 350,
    marginTop: 26,
    marginLeft: 56,
    marginRight: 20,
    marginBottom: 54,
    ariaLabel: title,
    x: {
      label: null,
      domain: MONTHS.map((m) => m.i),
      type: "band",
      tickFormat: (i) => (MONTHS[i].month === 1 || MONTHS[i].i === 0 ? MONTHS[i].label : ""),
      tickSize: 0,
    },
    y: { label: "Deaths per 1,000 per year", domain: [0, 1260], ticks: 5 },
    marks: [
      Plot.rectY(rows, {
        x: "i",
        y: "rate",
        fill: (d) => CAUSE_COLOUR[d.cause],
        fillOpacity: 0.85,
        order: STACK_ORDER,
        clip: true,
      }),
      // The rule is the causal claim. It sits on the month the commission
      // reached Scutari; a band scale has no coordinate between two bands, so
      // the boundary is not addressable.
      Plot.ruleX([MONTHS[COMMISSION_INDEX].i], {
        stroke: GUIDE,
        strokeWidth: 1.5,
        strokeDasharray: "4,3",
      }),
      Plot.text([{}], {
        x: MONTHS[COMMISSION_INDEX].i,
        y: 1195,
        text: () => "Sanitary Commission\narrives, March 1855",
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.35,
        textAnchor: "start",
        dx: 8,
        ...HALO,
      }),
      Plot.dot(LEGEND, { x: "i", y: "y", fill: (d) => CAUSE_COLOUR[d.cause], r: 4 }),
      Plot.text(LEGEND, {
        x: "i",
        y: "y",
        text: "label",
        fill: (d) => CAUSE_COLOUR[d.cause],
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "start",
        dx: 10,
        ...HALO,
      }),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
