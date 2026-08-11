/**
 * The cheapest edit in data visualisation, and the one most often skipped.
 *
 * The two panels are pixel-for-pixel identical below the title. Same bars,
 * same axis, same color, no annotation, no highlight, no arrow. The only
 * difference is what the title says, and it changes what a reader takes away
 * from the chart, how long they spend on it, and whether they can repeat it
 * afterwards.
 *
 * "Revenue by month" is a *description of the data*, and it leaves the reader
 * to do the analysis. Most will not. They will glance, see bars going roughly
 * sideways, and move on, which is a rational response to being handed a
 * dataset instead of a claim.
 *
 * "Revenue fell 12% the month after the price rise" is a *claim*, and it does
 * three things at once. It says which comparison in the chart matters, out of
 * the sixty-six pairs of months available. It says what the answer is, so the
 * reader can check rather than derive. And it makes the chart falsifiable: a
 * reader who disagrees now has something specific to disagree with, which is
 * the whole point of showing them the data underneath.
 *
 * The usual objection is that this is editorialising. It is, and the
 * alternative is not neutrality. A chart with a descriptive title still has a
 * point of view, expressed in what was measured, what was left out, how it was
 * grouped and which axis it went on. Putting the claim in the title makes that
 * point of view visible and arguable instead of hiding it in the defaults.
 *
 * The rule: if you can say what the chart shows in a sentence, that sentence
 * is the title. If you cannot, the chart is not finished.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY } from "./_theme.mjs";
import { panel, panelAxis, panelBaseline, panelSpace } from "./_panels.mjs";

export const title =
  "The same twelve-bar revenue chart under two titles. Under 'Revenue by month' the reader is handed a dataset; under 'Revenue fell 12% the month after the price rise' the same bars carry a claim they can check. Nothing below the title differs between the panels.";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** Monthly revenue in thousands. A price rise lands at the start of July. */
const REVENUE = [412, 398, 425, 431, 419, 442, 389, 384, 397, 402, 411, 418];
const PRICE_RISE = 6; // index of July

const BEFORE = REVENUE[PRICE_RISE - 1];
const AFTER = REVENUE[PRICE_RISE];
const DROP = Math.round(((BEFORE - AFTER) / BEFORE) * 100);
/** How many month-to-month comparisons the reader would be picking from. */
const PAIRS = (MONTHS.length * (MONTHS.length - 1)) / 2;

const DOMAIN = [0, 470];
const PANELS = [0, 1].map((k) => panel(k, { y: DOMAIN }));
const TITLES = [
  "Revenue by month",
  `Revenue fell ${DROP}% the month\nafter the price rise`,
];

const BAR = 0.68;
const bars = (p) =>
  REVENUE.map((v, i) => ({
    v,
    i,
    x1: p.band(i, MONTHS.length) - (p.bandWidth(MONTHS.length) * BAR) / 2,
    x2: p.band(i, MONTHS.length) + (p.bandWidth(MONTHS.length) * BAR) / 2,
    y: p.py(v),
  }));

export const caption = `Identical bars, identical axis, identical color, no annotation and no highlight. The only edit is the sentence at the top, which picks one comparison out of the ${PAIRS} pairs of months on offer and states the answer.`;

export function render() {
  return plot({
    height: 320,
    marginTop: 24,
    marginLeft: 34,
    marginRight: 16,
    marginBottom: 32,
    ariaLabel: title,
    ...panelSpace(2),
    marks: [
      ...PANELS.flatMap((p, k) => [
        ...panelAxis(p, { ticks: [0, 200, 400], format: (v) => `£${v}k` }),
        panelBaseline(p),
        Plot.rect(bars(p), {
          x1: "x1",
          x2: "x2",
          y1: p.py(0),
          y2: "y",
          fill: PRIMARY,
          fillOpacity: 0.62,
        }),
        Plot.text([{}], {
          x: (p.left + p.right) / 2,
          y: 0.965,
          text: () => TITLES[k],
          fill: k === 1 ? ACCENT : MUTED,
          fontSize: k === 1 ? 13 : 13,
          fontWeight: 700,
          lineHeight: 1.3,
          textAnchor: "middle",
          ...HALO,
        }),
        Plot.text(
          MONTHS.filter((_, i) => i % 3 === 0).map((label, j) => ({
            label,
            x: p.band(j * 3, MONTHS.length),
          })),
          {
            x: "x",
            y: p.py(0),
            text: "label",
            fill: "currentColor",
            fillOpacity: 0.55,
            fontSize: 10,
            textAnchor: "middle",
            dy: 13,
          },
        ),
      ]),
      Plot.text([{}], {
        x: (PANELS[0].left + PANELS[0].right) / 2,
        y: PANELS[0].py(0),
        text: () => "here is a dataset",
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "middle",
        dy: 30,
        ...HALO,
      }),
      Plot.text([{}], {
        x: (PANELS[1].left + PANELS[1].right) / 2,
        y: PANELS[1].py(0),
        text: () => "here is a claim, and the evidence for it",
        fill: ACCENT,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "middle",
        dy: 30,
        ...HALO,
      }),
    ],
  });
}
