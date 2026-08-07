/**
 * Why a hash table needs collision handling long before it is anywhere near
 * full: collisions are governed by the birthday problem, not by load factor
 * intuition.
 *
 * With `b` buckets and `n` keys hashed uniformly, the chance that *no* two keys
 * land together is the falling factorial b!/((b-n)! · b^n). It drops far faster
 * than people expect: with a thousand buckets it is even money by around forty
 * keys, which is a load factor of four percent. Any hash table that did not
 * handle collisions would break almost immediately, which is why every real one
 * chains or probes from the start.
 *
 * The curve is computed in log space, since the product underflows to zero long
 * before the interesting part of the chart. The annotated crossing is found by
 * scanning the curve rather than typed.
 *
 * Three bucket counts, faceted legitimately: the same probability against the
 * same key count, one parameter varying.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "The probability of at least one hash collision against the number of keys, for tables of 64, 1024 and 16384 buckets. Each curve rises from zero to near-certainty over a span far shorter than the number of buckets.";

const TABLES = [
  { buckets: 64, key: "64 buckets" },
  { buckets: 1024, key: "1,024 buckets" },
  { buckets: 16384, key: "16,384 buckets" },
];

const MAX_KEYS = 400;

/** P(at least one collision) for n keys in b buckets, in log space: the direct
 *  product underflows to zero well before the curve gets interesting. */
function collisionProb(n, b) {
  if (n > b) return 1;
  let logNone = 0;
  for (let i = 0; i < n; i++) logNone += Math.log(1 - i / b);
  return 1 - Math.exp(logNone);
}

const curves = TABLES.flatMap((t) =>
  Array.from({ length: MAX_KEYS + 1 }, (_, n) => ({
    panel: t.key,
    buckets: t.buckets,
    n,
    p: collisionProb(n, t.buckets),
  })),
);

/** First key count at which a collision is more likely than not. */
const HALF = TABLES.map((t) => {
  const row = curves.find((d) => d.panel === t.key && d.p >= 0.5);
  return { ...t, n: row ? row.n : MAX_KEYS, load: row ? row.n / t.buckets : 1 };
});

const MID = HALF[1];

export const caption =
  `With ${MID.key.replace(" buckets", "")} buckets it is already more likely than not that two keys share one by the ${MID.n}th key, a load factor of ${(MID.load * 100).toFixed(0)}%. Collisions are not an edge case a big enough table avoids; they are the normal state of a hash table, which is why every implementation chains or probes.`;

export function render() {
  return plot({
    height: 300,
    marginTop: 32,
    marginLeft: 54,
    marginBottom: 48,
    ariaLabel: title,
    fx: { label: null, domain: TABLES.map((t) => t.key) },
    x: { label: "Keys inserted", labelAnchor: "center", domain: [0, MAX_KEYS], ticks: 4 },
    y: { label: "Chance of a collision", domain: [0, 1.06], ticks: 5, tickFormat: "%" },
    marks: [
      Plot.areaY(curves, {
        x: "n",
        y: "p",
        fx: "panel",
        fill: PRIMARY,
        fillOpacity: 0.16,
      }),
      Plot.line(curves, { x: "n", y: "p", fx: "panel", stroke: PRIMARY, strokeWidth: 2 }),
      Plot.ruleY([0.5], { stroke: MUTED, strokeWidth: 1.25, strokeDasharray: "4,3" }),
      Plot.ruleX(HALF, { x: "n", fx: "key", y1: 0, y2: 0.5, stroke: ACCENT, strokeWidth: 1.5 }),
      Plot.dot(HALF, { x: "n", y: 0.5, fx: "key", fill: ACCENT, r: 4 }),
      Plot.text(HALF, {
        x: "n",
        y: 0.5,
        fx: "key",
        text: (d) => `even money at\n${d.n} keys (${(d.load * 100).toFixed(0)}% full)`,
        fill: ACCENT,
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.3,
        textAnchor: "start",
        dx: 8,
        dy: 22,
        ...HALO,
      }),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
