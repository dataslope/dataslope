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
 *
 * ── Why both curves are multiples and not their own units ───────────────────
 *
 * Throughput is requests per second and latency is milliseconds, and the first
 * version of this figure drew both against a single axis labelled "Requests
 * per second" — with the latency curve quietly rescaled by
 * `(d.latency / BIG.latency) * PEAK * 0.9` to make it fit. That is the dual
 * axis this site has a whole chart against (`dual-axis-illusion`), minus the
 * second axis: the red curve had no scale at all, so where it crossed the blue
 * one, and how steep it looked, were both artefacts of the constant chosen to
 * squeeze it into frame.
 *
 * Dividing each curve by its own value at batch size 1 gives them a shared,
 * real unit — "times what one request at a time gets you" — so one linear axis
 * is honest, and the comparison the figure is actually making (throughput
 * flattens, latency does not) is the thing the two shapes now show. The
 * absolute numbers behind the ratios are in the caption.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Throughput and per-request latency against batch size, each drawn as a multiple of its value at batch size 1. Throughput rises steeply to a knee at batch 32 and then flattens near nine times; latency keeps climbing and reaches nearly fourteen times.";

const SIZES = [1, 2, 4, 8, 16, 32, 64, 128];
const PEAK = 3200; // requests per second when fully compute bound

const raw = SIZES.map((b) => {
  // Amortising the weight read: saturating in the batch size.
  const throughput = PEAK * (b / (b + 9));
  return { b, throughput, latency: (b / throughput) * 1000 };
});

const ONE = raw[0];
const rows = raw.map((r) => ({
  ...r,
  throughputX: r.throughput / ONE.throughput,
  latencyX: r.latency / ONE.latency,
}));

/** The knee: the last size where an extra doubling still buys 20% more. */
const KNEE = rows.reduce((best, r, i) => {
  const prev = rows[i - 1];
  if (!prev) return best;
  return r.throughput / prev.throughput > 1.2 ? r : best;
}, rows[0]);

const BIG = rows.at(-1);
const YMAX = Math.ceil(BIG.latencyX) + 1;

export const caption = `One request at a time leaves the accelerator reading weights it barely uses: ${ONE.throughput.toFixed(0)} requests a second at ${ONE.latency.toFixed(1)} ms each. Batching amortises that read, so throughput climbs steeply to about batch ${KNEE.b} (${KNEE.throughput.toFixed(0)} a second) and then flattens. From there to batch ${BIG.b} it gains ${(((BIG.throughput - KNEE.throughput) / KNEE.throughput) * 100).toFixed(0)}% more while per-request latency rises ${(BIG.latency / KNEE.latency).toFixed(1)} times, from ${KNEE.latency.toFixed(0)} ms to ${BIG.latency.toFixed(0)} ms. Both curves are drawn against what batch 1 gets you, so they share one scale honestly; the knee is where throughput stops being nearly free.`;

export function render() {
  return plot({
    height: 320,
    marginTop: 32,
    marginLeft: 66,
    marginRight: 116,
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
    y: {
      label: "Times what batch size 1 gets you",
      domain: [0, YMAX],
      ticks: 5,
      tickFormat: (d) => `${d}×`,
    },
    marks: [
      Plot.areaY(rows, { x: "b", y: "throughputX", fill: PRIMARY, fillOpacity: 0.13, clip: true }),
      Plot.line(rows, { x: "b", y: "throughputX", stroke: PRIMARY, strokeWidth: 2, clip: true }),
      Plot.dot(rows, { x: "b", y: "throughputX", fill: PRIMARY, r: 3.5, clip: true }),
      Plot.line(rows, { x: "b", y: "latencyX", stroke: ACCENT, strokeWidth: 2, clip: true }),
      Plot.dot(rows, { x: "b", y: "latencyX", fill: ACCENT, r: 3.5, clip: true }),
      Plot.ruleX([KNEE.b], { stroke: GUIDE, strokeWidth: 1.5, strokeDasharray: "4,3" }),
      Plot.text([KNEE], {
        x: "b",
        y: "throughputX",
        text: (d) => `knee at batch ${d.b}:\n${(d.throughputX).toFixed(1)}× the throughput\nfor ${(d.latencyX).toFixed(1)}× the latency`,
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.35,
        textAnchor: "end",
        dx: -12,
        dy: -18,
        ...HALO,
      }),
      Plot.text([BIG], {
        x: "b",
        y: "throughputX",
        text: (d) => `throughput\n${d.throughputX.toFixed(1)}×`,
        fill: PRIMARY,
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.3,
        textAnchor: "start",
        dx: 8,
        ...HALO,
      }),
      Plot.text([BIG], {
        x: "b",
        y: "latencyX",
        text: (d) => `latency per request\n${d.latencyX.toFixed(1)}×`,
        fill: ACCENT,
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.3,
        textAnchor: "start",
        dx: 8,
        ...HALO,
      }),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
