/**
 * The memoryless property, which is the thing about the exponential
 * distribution that people refuse to believe until they see it.
 *
 * The curve is the chance a wait lasts at least t more minutes. The three
 * marked pairs all ask the same question from different starting points: given
 * you have already waited 0, 10 or 30 minutes, what is the chance of another
 * 10? The answer is identical every time, because an exponential wait does not
 * accumulate. The bus is not "due".
 *
 * The conditional probabilities are computed from the distribution rather than
 * asserted, so the three matching numbers are the arithmetic. This is also
 * exactly why exponential holding times make queueing theory tractable, and why
 * they are a bad model for anything that wears out.
 */
import { Plot, plot, linspace, ACCENT, GUIDE, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "The survival curve of an exponential wait, with three pairs of points marked at zero, ten and thirty minutes. The chance of waiting another ten minutes is the same from all three.";

const MEAN = 12;
const rate = 1 / MEAN;
const survive = (t) => Math.exp(-rate * t);

const curve = linspace(0, 50, 200).map((t) => ({ t, s: survive(t) }));

const EXTRA = 10;
const STARTS = [0, 10, 30];
const conditionals = STARTS.map((t0) => ({
  t0,
  t1: t0 + EXTRA,
  s0: survive(t0),
  s1: survive(t0 + EXTRA),
  // P(wait > t0 + EXTRA | wait > t0)
  p: survive(t0 + EXTRA) / survive(t0),
}));

const SAME = conditionals[0].p;

export const caption =
  `The chance of another ${EXTRA} minutes is ${(SAME * 100).toFixed(0)}% whether you have waited ${STARTS.join(", ")} minutes already: identical to the last decimal, because an exponential wait carries no memory of what has passed. That is what makes queueing theory tractable and what makes the exponential a poor model for anything that wears out, where waiting really does change the odds.`;

export function render() {
  return plot({
    height: 320,
    marginTop: 32,
    marginLeft: 58,
    marginRight: 34,
    marginBottom: 48,
    ariaLabel: title,
    x: { label: "Minutes waited", labelAnchor: "center", domain: [0, 50], ticks: 5 },
    y: { label: "Chance the wait continues", domain: [0, 1.05], ticks: 5, tickFormat: "%" },
    marks: [
      Plot.areaY(curve, { x: "t", y: "s", fill: PRIMARY, fillOpacity: 0.12 }),
      Plot.line(curve, { x: "t", y: "s", stroke: PRIMARY, strokeWidth: 2 }),
      // Each pair: where you are, and where you would be ten minutes later.
      Plot.ruleX(conditionals, { x: "t0", y1: 0, y2: "s0", stroke: GUIDE, strokeOpacity: 0.5 }),
      Plot.ruleX(conditionals, { x: "t1", y1: 0, y2: "s1", stroke: GUIDE, strokeOpacity: 0.5 }),
      Plot.dot(conditionals, { x: "t0", y: "s0", fill: PRIMARY, r: 4 }),
      Plot.dot(conditionals, { x: "t1", y: "s1", fill: ACCENT, r: 4 }),
      // Short labels, because the three of them have to fit between a curve
      // that is falling away and each other. The full sentence used to be
      // repeated on every one, which made each about 150px wide: the last two
      // then overlapped in the flat right-hand stretch where there is least
      // room. The repeated half now sits once, in the corner note below, and
      // each mark carries only what differs.
      ...conditionals.map((c, i) =>
        Plot.text([c], {
          x: "t1",
          y: "s1",
          text: (d) => `after ${d.t0} min\n${(d.p * 100).toFixed(1)}%`,
          fill: ACCENT,
          fontSize: 10.5,
          fontWeight: 600,
          lineHeight: 1.3,
          textAnchor: "start",
          dx: 8,
          dy: -16,
          ...HALO,
        }),
      ),
      Plot.text([{}], {
        x: 49,
        y: 0.98,
        text: () => `each label is the chance of ${EXTRA} more minutes:\nthe same number, three times`,
        fill: MUTED,
        fontSize: 11,
        fontWeight: 600,
        lineHeight: 1.35,
        textAnchor: "end",
        ...HALO,
      }),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
