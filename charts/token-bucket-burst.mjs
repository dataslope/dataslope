/**
 * A token bucket, which is how nearly every rate limiter actually works and
 * why "100 requests per minute" does not mean one request every 0.6 seconds.
 *
 * Tokens refill at a steady rate up to a cap. A request spends one. The top
 * panel is the bucket level over time and the bottom is the traffic hitting
 * it: an idle period lets the bucket fill, so a burst is served immediately,
 * and once it is empty the limiter admits requests only as fast as the refill.
 *
 * That is the design: burst tolerance is the bucket size, sustained rate is the
 * refill rate, and they are two separate numbers. A limiter with a bucket of
 * one is a very different product from one with a bucket of sixty, even at the
 * same requests per minute.
 *
 * Rejections are counted from the simulation rather than asserted.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "A token bucket over sixty seconds: the level refills during an idle period, drains during a burst, and then tracks the refill rate while excess requests are rejected.";

const CAPACITY = 20;
const REFILL = 1; // tokens per second
const SECONDS = 60;

/** Requests per second: quiet, then a burst, then sustained overload. */
const demand = Array.from({ length: SECONDS }, (_, t) => {
  if (t < 15) return 0;
  if (t < 22) return 6;
  return 2;
});

const sim = (() => {
  let tokens = CAPACITY;
  return demand.map((want, t) => {
    tokens = Math.min(CAPACITY, tokens + REFILL);
    const served = Math.min(want, Math.floor(tokens));
    tokens -= served;
    return { t, tokens, want, served, rejected: want - served };
  });
})();

const REJECTED = sim.reduce((s, r) => s + r.rejected, 0);
const BURST = sim.filter((r) => r.t >= 15 && r.t < 22).reduce((s, r) => s + r.served, 0);

export const caption =
  `The bucket holds ${CAPACITY} tokens and refills at ${REFILL} a second, which are two different promises. Fifteen quiet seconds fill it, so the burst is served in full: ${BURST} requests in seven seconds, far above the sustained rate. After that the bucket is empty and the limiter admits exactly the refill rate, rejecting ${REJECTED}. Burst tolerance is the capacity; the rate is the refill.`;

export function render() {
  return plot({
    height: 330,
    marginTop: 32,
    marginLeft: 58,
    marginRight: 30,
    marginBottom: 48,
    ariaLabel: title,
    x: { label: "Seconds", labelAnchor: "center", domain: [0, SECONDS], ticks: 5 },
    y: { label: "Tokens in the bucket / requests", domain: [0, CAPACITY * 1.15], ticks: 5 },
    marks: [
      Plot.areaY(sim, { x: "t", y: "tokens", fill: PRIMARY, fillOpacity: 0.14 }),
      Plot.line(sim, { x: "t", y: "tokens", stroke: PRIMARY, strokeWidth: 2 }),
      Plot.ruleX(sim, { x: "t", y1: 0, y2: "served", stroke: MUTED, strokeOpacity: 0.6, strokeWidth: 3 }),
      Plot.ruleX(
        sim.filter((r) => r.rejected > 0),
        { x: "t", y1: "served", y2: "want", stroke: ACCENT, strokeOpacity: 0.8, strokeWidth: 3 },
      ),
      Plot.ruleY([CAPACITY], { stroke: GUIDE, strokeWidth: 1.5, strokeDasharray: "4,3" }),
      Plot.text([{}], {
        x: 1,
        y: CAPACITY,
        text: () => `capacity ${CAPACITY}: the burst you can absorb`,
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "start",
        dy: -9,
        ...HALO,
      }),
      Plot.text([{}], {
        x: 24,
        y: 7,
        text: () => `rejected: ${REJECTED}`,
        fill: ACCENT,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "start",
        ...HALO,
      }),
      Plot.text([{}], {
        x: 18,
        y: CAPACITY * 1.1,
        text: () => "burst served in full",
        fill: PRIMARY,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "middle",
        ...HALO,
      }),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
