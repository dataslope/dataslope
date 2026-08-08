/**
 * Odds against probability, and why the two get confused in exactly one place.
 *
 * They carry the same information: odds are p/(1−p) and probability is
 * odds/(1+odds). What differs is the scale. Probability is bounded, so it
 * compresses everything near certainty into a sliver: 0.90, 0.99 and 0.999 are
 * all "about one" to the eye, while their odds are 9, 99 and 999. Odds are
 * unbounded and blow up at the right-hand end.
 *
 * That is why the confusion is harmless in the middle and expensive at the
 * ends. Below about 10% the two are within a rounding error of each other,
 * which is precisely why "a 5% chance" and "odds of 1 in 20" get used
 * interchangeably and nobody is hurt. Near certainty they diverge without
 * limit, and a headline that reports one as the other is out by an order of
 * magnitude.
 *
 * It is also the reason logistic regression works in log-odds: a quantity
 * bounded at 0 and 1 cannot be modelled linearly, and its log-odds can.
 */
import { Plot, plot, sidedText, ACCENT, GUIDE, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Odds plotted against probability on a logarithmic odds axis. The two track each other closely below about ten per cent and diverge without limit as probability approaches one.";

const P = Array.from({ length: 397 }, (_, i) => 0.002 + i * 0.0025).filter((p) => p < 0.999);
const rows = P.map((p) => ({ p, odds: p / (1 - p) }));

const MARKS = [0.05, 0.5, 0.9, 0.99].map((p) => ({ p, odds: p / (1 - p) }));

export const caption =
  "Odds are p/(1−p) and probability is odds/(1+odds), so the two carry identical information on different scales. Probability is bounded and squashes everything near certainty into a sliver: 0.90, 0.99 and 0.999 all read as \"about one\" while their odds are 9, 99 and 999. That is why mixing them up is harmless in the middle and expensive at the ends. Below about 10% they agree to a rounding error, which is why \"a 5% chance\" and \"1 in 20\" get used interchangeably; near certainty they diverge without limit. It is also why logistic regression models log-odds: a quantity pinned between 0 and 1 cannot be linear in anything, and its log-odds can.";

export function render() {
  return plot({
    height: 330,
    marginTop: 26,
    marginLeft: 66,
    marginRight: 30,
    marginBottom: 46,
    ariaLabel: title,
    x: { label: "Probability", labelAnchor: "center", domain: [0, 1], ticks: 6, tickFormat: "%" },
    y: {
      label: "Odds (log scale)",
      type: "log",
      domain: [0.002, 1000],
      ticks: [0.01, 0.1, 1, 10, 100, 1000],
      tickFormat: (d) => (d >= 1 ? String(d) : String(d)),
    },
    marks: [
      // Even money: the one place the two scales cross.
      Plot.ruleY([1], { stroke: GUIDE, strokeDasharray: "4 3" }),
      Plot.ruleX([0.5], { stroke: GUIDE, strokeDasharray: "4 3" }),
      Plot.line(rows, { x: "p", y: "odds", stroke: PRIMARY, strokeWidth: 2 }),
      Plot.dot(MARKS, { x: "p", y: "odds", fill: ACCENT, r: 4 }),
      // Hung on whichever side has room: at p = 0.9 and above there is none to
      // the right, and a label that runs off the frame is a label nobody reads.
      ...sidedText(
        MARKS,
        {
          side: (d) => (d.p >= 0.9 ? "end" : "start"),
          x: "p",
          y: "odds",
          text: (d) =>
            `p = ${(d.p * 100).toFixed(0)}%, odds ${
              d.odds < 1 ? `1 to ${Math.round(1 / d.odds)}` : `${Math.round(d.odds)} to 1`
            }`,
          fill: MUTED,
          fontSize: 10.5,
          fontWeight: 600,
          ...HALO,
        },
        { start: { dx: 9, dy: -8 }, end: { dx: -9, dy: -8 } },
      ),
      Plot.text([{}], {
        x: 0.06,
        y: 120,
        text: () => "below about 10% the two numbers\nare nearly the same; near certainty\nthey are not even close",
        fill: MUTED,
        fontSize: 11,
        fontWeight: 600,
        lineHeight: 1.35,
        textAnchor: "start",
        ...HALO,
      }),
    ],
  });
}
