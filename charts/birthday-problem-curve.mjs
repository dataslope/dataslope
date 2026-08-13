/**
 * The birthday problem, drawn, because the number is not the surprising part.
 *
 * People hear "23" and check it against 365, which is the wrong comparison and
 * the whole reason the answer feels wrong. What matters is not how many people
 * there are but how many *pairs* of them: 23 people make 253 pairs, and each
 * pair is a chance to match. The curve is steep for exactly that reason, since
 * pairs grow as n².
 *
 * Two readings are worth marking. Fifty-fifty arrives at 23, and near-certainty
 * arrives not much later: 57 people put it over 99%, still less than a sixth
 * of 365. And the shape is the useful part, not the 23: the same
 * curve, with 365 swapped for the size of a hash space, is why collisions are
 * the normal state of a hash table rather than an edge case, and why a 64-bit
 * random identifier is not as unique as its width suggests.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "The probability that at least two people in a room share a birthday, against the number of people. It passes one half at 23 people and is over ninety-nine per cent by sixty, far short of the 365 days most intuitions compare against.";

const DAYS = 365;
const MAX_N = 80;

/** P(at least one shared birthday) = 1 - P(all distinct), computed as a running
 *  product so the whole curve costs one pass. */
const CURVE = [];
let distinct = 1;
for (let n = 1; n <= MAX_N; n += 1) {
  if (n > 1) distinct *= (DAYS - (n - 1)) / DAYS;
  CURVE.push({ n, p: 1 - distinct, pairs: (n * (n - 1)) / 2 });
}

const at = (n) => CURVE.find((d) => d.n === n);
const HALF = CURVE.find((d) => d.p >= 0.5);
const NEAR = CURVE.find((d) => d.p >= 0.99);
const pct = (v) => `${(v * 100).toFixed(v >= 0.99 ? 1 : 0)}%`;

export const caption = `The probability that some pair in the room matches, against the size of the room. It crosses a half at **${HALF.n} people** and reaches ${pct(NEAR.p)} by ${NEAR.n}, which is why the answer feels wrong: the intuition compares ${HALF.n} against 365, and the arithmetic is about pairs. ${HALF.n} people make ${HALF.pairs} pairs, and every pair is its own chance to collide, so the count of chances grows as the square of the room. The same curve with 365 replaced by the size of a hash space is why collisions are the normal state of a hash table, and why random identifiers need far more bits than the number of them suggests.`;

export function render() {
  return plot({
    height: 320,
    marginTop: 24,
    marginLeft: 56,
    marginRight: 24,
    marginBottom: 44,
    ariaLabel: title,
    x: { label: "People in the room", labelAnchor: "center", domain: [0, MAX_N], ticks: 8 },
    y: {
      label: "Chance that two share a birthday",
      domain: [0, 1],
      ticks: 5,
      tickFormat: (d) => `${Math.round(d * 100)}%`,
    },
    marks: [
      Plot.ruleY([0.5], { stroke: MUTED, strokeDasharray: "4 4" }),
      Plot.link([HALF], {
        x1: "n",
        x2: "n",
        y1: 0,
        y2: 0.5,
        stroke: GUIDE,
        strokeDasharray: "4 4",
      }),
      Plot.areaY(CURVE, { x: "n", y: "p", fill: PRIMARY, fillOpacity: 0.14, clip: true }),
      Plot.line(CURVE, { x: "n", y: "p", stroke: PRIMARY, strokeWidth: 2.2, clip: true }),
      Plot.dot([HALF, NEAR], { x: "n", y: "p", fill: ACCENT, r: 4 }),
      Plot.text([HALF], {
        x: "n",
        y: "p",
        text: (d) => `${d.n} people: ${pct(d.p)}`,
        fill: ACCENT,
        fontSize: 10.5,
        fontWeight: 700,
        textAnchor: "start",
        dx: 9,
        dy: 12,
        ...HALO,
      }),
      Plot.text([NEAR], {
        x: "n",
        y: "p",
        text: (d) => `${d.n} people: ${pct(d.p)}`,
        fill: ACCENT,
        fontSize: 10.5,
        fontWeight: 700,
        textAnchor: "end",
        dx: -9,
        dy: 14,
        ...HALO,
      }),
      Plot.text([{}], {
        x: MAX_N,
        y: 0.28,
        text: () => `the room has ${HALF.n} people\nand ${HALF.pairs} pairs, and it is\nthe pairs that collide`,
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.35,
        textAnchor: "end",
        dx: -8,
        ...HALO,
      }),
      Plot.text([at(1)], {
        x: 2,
        y: 0.5,
        text: () => "even odds",
        fill: MUTED,
        fontSize: 10,
        fontWeight: 600,
        textAnchor: "start",
        dy: -8,
        ...HALO,
      }),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
