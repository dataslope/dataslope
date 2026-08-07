/**
 * Why context length was a headline capability for years: attention work grows
 * with the *square* of the length.
 *
 * The lesson states the ratio (125× the tokens, ~15,000× the work) and the
 * number is easy to read past. Drawn against a linear reference — what the
 * cost would be if each extra token cost the same as the last — the gap opens
 * to two orders of magnitude across the frame, which is the difference between
 * "expensive" and "not buildable without new ideas".
 *
 * Both curves are normalised to 1 at 8k tokens, so the vertical axis reads as
 * "times more work than an 8k context" and needs no units.
 */
import { Plot, plot, linspace, ACCENT, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Two curves of relative work against context length on logarithmic axes, both starting at one for an eight-thousand-token context. The linear reference reaches 125 times at a million tokens; the quadratic attention curve reaches about 15,600 times.";

export const caption =
  "Every token attends to every other token, so doubling the context roughly quadruples the work. Going from 8k to 1M tokens is 125 times the text and about 15,600 times the naive attention, which is why long context took new engineering rather than a bigger budget.";

const BASE = 8000;
const MAX = 1000000;
const LENGTHS = linspace(Math.log10(BASE), Math.log10(MAX), 120).map((e) => Math.pow(10, e));

const CURVES = [
  { key: "quadratic", label: "attention work\n(grows with n²)", color: ACCENT, p: 2 },
  { key: "linear", label: "if each token\ncost the same", color: PRIMARY, p: 1 },
];

const lines = CURVES.flatMap((c) =>
  LENGTHS.map((n) => ({ key: c.key, color: c.color, n, work: Math.pow(n / BASE, c.p) })),
);

const ENDS = CURVES.map((c) => ({ ...c, n: MAX, work: Math.pow(MAX / BASE, c.p) }));

export function render() {
  return plot({
    height: 340,
    marginTop: 26,
    marginLeft: 62,
    marginRight: 134,
    ariaLabel: title,
    x: {
      label: "Context length (tokens)",
      labelAnchor: "center",
      type: "log",
      // Opened a hair past both ends so the 8k and 1M ticks clear the axes.
      domain: [BASE * 0.93, MAX * 1.06],
      ticks: [8000, 32000, 128000, 1000000],
      tickFormat: (d) => (d >= 1000000 ? "1M" : `${Math.round(d / 1000)}k`),
    },
    y: {
      label: "Work, relative to an 8k context",
      type: "log",
      domain: [1, 30000],
      ticks: [1, 10, 100, 1000, 10000],
      tickFormat: (d) => (d >= 1000 ? `${d / 1000}k×` : `${d}×`),
    },
    marks: [
      Plot.areaY(
        LENGTHS.map((n) => ({ n, lo: n / BASE, hi: Math.pow(n / BASE, 2) })),
        { x: "n", y1: "lo", y2: "hi", fill: ACCENT, fillOpacity: 0.1 },
      ),
      ...CURVES.map((c) =>
        Plot.lineY(lines.filter((d) => d.key === c.key), {
          x: "n",
          y: "work",
          stroke: c.color,
          strokeWidth: 2,
          strokeDasharray: c.p === 1 ? "4,3" : null,
        }),
      ),
      Plot.text(ENDS, {
        x: "n",
        y: "work",
        text: (d) => `${d.label}\n${Math.round(d.work).toLocaleString("en-US")}×`,
        fill: (d) => d.color,
        fontSize: 12,
        fontWeight: 600,
        lineHeight: 1.3,
        textAnchor: "start",
        dx: 10,
      }),
      Plot.text([{}], {
        x: 60000,
        y: 60,
        text: () => "everything in here is\nthe price of the square",
        fill: MUTED,
        fontSize: 11.5,
        fontWeight: 600,
        lineHeight: 1.3,
        textAnchor: "start",
        ...HALO,
      }),
    ],
  });
}
