/**
 * Why exceptions are fine for exceptional and ruinous for control flow.
 *
 * Throwing is not a jump. The runtime captures a stack trace, walks the frames
 * looking for a handler, and runs whatever `finally` blocks it passes, which
 * costs microseconds where a returned status costs nanoseconds. That ratio is
 * irrelevant when failures are rare, because a thousandth of a percent of a
 * large number is still nothing, and it dominates completely once failure is
 * an ordinary outcome.
 *
 * The crossing is the useful part. Validating user input, parsing a file of
 * uncertain provenance, looking up a key that is often absent: these fail
 * often enough to sit on the right of this chart, which is why the framework
 * ships `TryParse` beside `Parse` and `TryGetValue` beside the indexer. The
 * pair is not a redundancy; it is this chart, in the API.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Throughput in operations per second against the share of calls that fail, on a logarithmic scale. Returning a status stays flat; throwing collapses by three orders of magnitude as the failure rate rises from one in a million to one in one.";

/** Nanoseconds per call. A throw with a captured trace and a handler walk is
 *  a few microseconds; a returned status is a branch. */
const OK_NS = 20;
const THROW_NS = 12_000;

const RATES = Array.from({ length: 61 }, (_, i) => Math.pow(10, -6 + (i * 6) / 60));

const rows = RATES.flatMap((p) => [
  { key: "Return a status", p, ops: 1e9 / OK_NS },
  { key: "Throw on failure", p, ops: 1e9 / (OK_NS + p * THROW_NS) },
]);

const AT = 0.05;
const atOps = 1e9 / (OK_NS + AT * THROW_NS);
const RATIO = Math.round(1e9 / OK_NS / atOps);

export const caption = `Throwing is not a jump: the runtime captures a stack trace, walks frames looking for a handler and runs the \`finally\` blocks it passes, which is microseconds against nanoseconds for a returned status. At one failure in a million that ratio is invisible. At ${AT * 100}% it is ${RATIO}× throughput. This is why the framework ships \`TryParse\` beside \`Parse\` and \`TryGetValue\` beside the indexer: not a redundancy, this chart, expressed as an API.`;

export function render() {
  return plot({
    height: 320,
    marginTop: 26,
    marginLeft: 74,
    marginRight: 140,
    marginBottom: 46,
    ariaLabel: title,
    x: {
      label: "Share of calls that fail",
      labelAnchor: "center",
      type: "log",
      domain: [1e-6, 1],
      ticks: [1e-6, 1e-4, 1e-2, 1],
      tickFormat: (d) => (d >= 0.01 ? `${d * 100}%` : `1 in ${(1 / d).toLocaleString()}`),
    },
    y: {
      label: "Operations per second",
      type: "log",
      domain: [50_000, 1e8],
      ticks: [1e5, 1e6, 1e7, 1e8],
      tickFormat: (d) => `${(d / 1e6).toLocaleString()}M`,
    },
    marks: [
      Plot.line(rows.filter((d) => d.key === "Return a status"), {
        x: "p",
        y: "ops",
        stroke: PRIMARY,
        strokeWidth: 2,
      }),
      Plot.line(rows.filter((d) => d.key === "Throw on failure"), {
        x: "p",
        y: "ops",
        stroke: ACCENT,
        strokeWidth: 2,
      }),
      Plot.ruleX([AT], { stroke: GUIDE, strokeDasharray: "4 3" }),
      Plot.dot([{}], { x: AT, y: atOps, fill: ACCENT, r: 4 }),
      Plot.text([{}], {
        x: 1,
        y: 1e9 / OK_NS,
        text: () => "Return a status",
        fill: PRIMARY,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "start",
        dx: 8,
        ...HALO,
      }),
      Plot.text([{}], {
        x: 1,
        y: 1e9 / (OK_NS + THROW_NS),
        text: () => "Throw on failure",
        fill: ACCENT,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "start",
        dx: 8,
        ...HALO,
      }),
      Plot.text([{}], {
        x: 1.6e-6,
        y: 2.2e5,
        text: () => "rare failures: free.\nordinary failures: not.",
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
