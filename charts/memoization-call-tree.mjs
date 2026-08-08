/**
 * What referential transparency buys, priced in function calls.
 *
 * `fib(n) = fib(n-1) + fib(n-2)` written directly recomputes the same
 * subproblems over and over: the call tree has roughly `2·fib(n+1) − 1` nodes,
 * which is exponential. Memoising it changes nothing about what the function
 * *means*, only how often it runs, and that is only a safe swap because the
 * function is pure: same arguments, same answer, no observable effect from
 * skipping the call.
 *
 * That is the whole practical argument for purity. An impure function cannot
 * be cached, cannot be reordered, cannot be run in parallel and cannot be
 * skipped when its result is unused, because any of those changes what the
 * program does. A pure one can be, and the difference at n = 30 is five
 * orders of magnitude.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Function calls made to compute the nth Fibonacci number, on a logarithmic scale. The naive recursion climbs exponentially into the millions while the memoised version stays a straight, nearly flat line of about two calls per n.";

const MAX_N = 32;
const AT = 30;

/** Exact node counts of the naive call tree, accumulated rather than
 *  approximated, so the caption can quote them. */
const naive = [1, 1];
for (let n = 2; n <= MAX_N; n++) naive[n] = naive[n - 1] + naive[n - 2] + 1;

const rows = Array.from({ length: MAX_N + 1 }, (_, n) => [
  { key: "Naive recursion", n, calls: naive[n] },
  { key: "Memoised", n, calls: 2 * n + 1 },
]).flat();

export const caption = `Computing \`fib(${AT})\` by direct recursion makes ${naive[AT].toLocaleString()} calls, because the same subproblems are recomputed all the way down. Memoising it makes ${2 * AT + 1}. Nothing about what the function *means* changed; only how often it ran, and that swap is legal only because the function is pure. An impure function cannot be cached, reordered, parallelised or skipped when its result is unused, because each of those changes what the program does. That is the practical argument for purity, and it is worth five orders of magnitude here.`;

export function render() {
  return plot({
    height: 320,
    marginTop: 26,
    marginLeft: 66,
    marginRight: 120,
    marginBottom: 46,
    ariaLabel: title,
    x: { label: "n", labelAnchor: "center", domain: [0, MAX_N], ticks: 6 },
    y: {
      label: "Function calls",
      type: "log",
      domain: [1, 20_000_000],
      ticks: [1, 100, 10_000, 1_000_000],
      tickFormat: (d) => (d >= 1e6 ? `${d / 1e6}M` : d >= 1000 ? `${d / 1000}k` : String(d)),
    },
    marks: [
      Plot.line(rows.filter((d) => d.key === "Naive recursion"), {
        x: "n",
        y: "calls",
        stroke: ACCENT,
        strokeWidth: 2,
      }),
      Plot.line(rows.filter((d) => d.key === "Memoised"), {
        x: "n",
        y: "calls",
        stroke: PRIMARY,
        strokeWidth: 2,
      }),
      Plot.ruleX([AT], { stroke: GUIDE, strokeDasharray: "4 3" }),
      Plot.text([{}], {
        x: MAX_N,
        y: naive[MAX_N],
        text: () => "Naive recursion",
        fill: ACCENT,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "start",
        dx: 8,
        ...HALO,
      }),
      Plot.text([{}], {
        x: MAX_N,
        y: 2 * MAX_N + 1,
        text: () => "Memoised",
        fill: PRIMARY,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "start",
        dx: 8,
        ...HALO,
      }),
      Plot.text([{}], {
        x: AT,
        y: 3_000_000,
        text: () => `fib(${AT}): ${naive[AT].toLocaleString()} calls\nagainst ${2 * AT + 1}`,
        fill: MUTED,
        fontSize: 11,
        fontWeight: 600,
        lineHeight: 1.35,
        textAnchor: "end",
        dx: -10,
        ...HALO,
      }),
    ],
  });
}
