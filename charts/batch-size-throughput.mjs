/**
 * Why inference servers batch, and why they stop.
 *
 * Throughput against batch size. A GPU running one request at a time is
 * memory-bandwidth bound and mostly idle: the weights have to be read whichever
 * way, and one request's worth of arithmetic does not cover the trip. Batching
 * amortises that read across requests, so throughput climbs steeply at first.
 * Past the point where the work becomes compute bound it flattens, and latency
 * per request has been climbing the whole time.
 *
 * That is the tradeoff a serving stack is configured around: the knee is where
 * throughput stops being nearly free, and beyond it every extra request in the
 * batch is paid for entirely in latency.
 *
 * The knee is found by scanning the curve rather than marked by eye.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Throughput and per-request latency against batch size. Throughput rises steeply to a knee and then flattens, while latency rises throughout.";

const SIZES = [1, 2, 4, 8, 16, 32, 64, 128];
const PEAK = 3200; // requests per second when fully compute bound

const rows = SIZES.map((b) => {
  // Amortising the weight read: saturating in the batch size.
  const throughput = PEAK * (b / (b + 9));
  return { b, throughput, latency: (b / throughput) * 1000 };
});

/** The knee: the last size where an extra doubling still buys 20% more. */
const KNEE = rows.reduce((best, r, i) => {
  const prev = rows[i - 1];
  if (!prev) return best;
  return r.throughput / prev.throughput > 1.2 ? r : best;
}, rows[0]);

const BIG = rows.at(-1);

export const caption =
  `One request at a time leaves the accelerator reading weights it barely uses. Batching amortises that read, so throughput climbs steeply to about batch ${KNEE.b} and then flattens: from there to ${BIG.b} it gains ${(((BIG.throughput - KNEE.throughput) / KNEE.throughput) * 100).toFixed(0)}% while per-request latency rises ${(BIG.latency / KNEE.latency).toFixed(1)} times. The knee is where throughput stops being nearly free.`;

export function render() {
  return plot({
    height: 320,
    marginTop: 32,
    marginLeft: 66,
    marginRight: 110,
    marginBottom: 48,
    ariaLabel: title,
    x: {
      type: "log",
      label: "Batch size",
      labelAnchor: "center",
      domain: [1, 128],
      ticks: SIZES.length,
      tickFormat: String,
    },
    y: { label: "Requests per second", domain: [0, PEAK], ticks: 5 },
    marks: [
      Plot.areaY(rows, { x: "b", y: "throughput", fill: PRIMARY, fillOpacity: 0.13 }),
      Plot.line(rows, { x: "b", y: "throughput", stroke: PRIMARY, strokeWidth: 2 }),
      Plot.dot(rows, { x: "b", y: "throughput", fill: PRIMARY, r: 3.5 }),
      // Latency on the same frame, scaled and labelled as such.
      Plot.line(rows, { x: "b", y: (d) => (d.latency / BIG.latency) * PEAK * 0.9, stroke: ACCENT, strokeWidth: 2 }),
      Plot.ruleX([KNEE.b], { stroke: GUIDE, strokeWidth: 1.5, strokeDasharray: "4,3" }),
      Plot.dot([KNEE], { x: "b", y: "throughput", fill: ACCENT, r: 5 }),
      Plot.text([KNEE], {
        x: "b",
        y: "throughput",
        text: (d) => `knee at batch ${d.b}`,
        fill: ACCENT,
        fontSize: 11,
        fontWeight: 600,
        textAnchor: "start",
        dx: 10,
        dy: 14,
        ...HALO,
      }),
      Plot.text([BIG], {
        x: "b",
        y: "throughput",
        text: () => "throughput",
        fill: PRIMARY,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "start",
        dx: 8,
        dy: -16,
        ...HALO,
      }),
      Plot.text([BIG], {
        x: "b",
        y: PEAK * 0.9,
        text: () => "latency\nper request",
        fill: ACCENT,
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.3,
        textAnchor: "start",
        dx: 8,
        dy: 18,
        ...HALO,
      }),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
