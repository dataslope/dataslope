/**
 * Simpson's paradox, drawn: a treatment that wins in every subgroup and loses
 * overall.
 *
 * Both readings are correct arithmetic on the same rows, so both have to be on
 * the page — the reversal is not a trick of one view. Split by stone size,
 * treatment A has the higher recovery rate in *both* groups. Pooled, B wins.
 *
 * A paired dot plot rather than grouped bars, because the fact to see is a
 * *direction*: in the first two rows the A dot sits to the right of B, and in
 * the third the pair swaps. Bars make that a comparison of four lengths; dots
 * on one axis make it a single flip. The group sizes are printed under each
 * dot because the lopsided mix — A given mostly to the large stones, B mostly
 * to the small ones — is the entire explanation.
 *
 * Numbers are the kidney-stone study (Charig et al., 1986), the standard
 * real-world example, so the reversal is observed rather than constructed.
 */
import { Plot, plot, sidedText, ACCENT, HALO, MUTED, SERIES } from "./_theme.mjs";

export const title =
  "Recovery rates for two treatments across three rows: small stones, large stones, and everyone pooled. Treatment A's dot is to the right of treatment B's in the first two rows and to the left in the third.";

export const caption =
  "Treatment A wins in both subgroups and loses overall. Nothing is wrong with the arithmetic: A was given mostly to the large stones, which are harder to treat, so pooling drags its rate down. Always ask what a total is averaging over.";

const GROUPS = ["Small stones", "Large stones", "Everyone pooled"];

const RAW = [
  { group: "Small stones", t: "A", success: 81, n: 87 },
  { group: "Small stones", t: "B", success: 234, n: 270 },
  { group: "Large stones", t: "A", success: 192, n: 263 },
  { group: "Large stones", t: "B", success: 55, n: 80 },
  { group: "Everyone pooled", t: "A", success: 273, n: 350 },
  { group: "Everyone pooled", t: "B", success: 289, n: 350 },
];

const COLOR = { A: SERIES[0], B: SERIES[1] };

const POINTS = RAW.map((d) => {
  const rate = d.success / d.n;
  const other = RAW.find((o) => o.group === d.group && o.t !== d.t);
  // The lower rate of each pair labels to its left and the higher to its
  // right, so the two labels always open away from each other however close
  // the dots sit.
  return { ...d, rate, leads: rate > other.success / other.n };
});

// One segment per row, spanning the pair, so the eye reads the gap as a length.
const SPANS = GROUPS.map((group) => {
  const pair = POINTS.filter((p) => p.group === group);
  return { group, x1: Math.min(...pair.map((p) => p.rate)), x2: Math.max(...pair.map((p) => p.rate)) };
});

export function render() {
  return plot({
    height: 300,
    marginTop: 26,
    marginBottom: 46,
    marginLeft: 120,
    marginRight: 62,
    ariaLabel: title,
    x: {
      label: "Patients who recovered",
      labelAnchor: "center",
      domain: [0.6, 1],
      ticks: [0.6, 0.7, 0.8, 0.9, 1],
      tickFormat: "%",
    },
    y: { label: null, domain: GROUPS, padding: 0.5, grid: false },
    marks: [
      Plot.ruleY(SPANS, { y: "group", x1: "x1", x2: "x2", stroke: MUTED, strokeWidth: 1.5 }),
      Plot.dot(POINTS, { x: "rate", y: "group", r: 11, fill: (d) => COLOR[d.t], stroke: null }),
      // The treatment letter rides inside its own dot, so the chart needs no
      // legend and every row is readable on its own.
      Plot.text(POINTS, {
        x: "rate",
        y: "group",
        text: "t",
        fill: "var(--ds-chart-surface)",
        fontSize: 11,
        fontWeight: 700,
      }),
      ...sidedText(
        POINTS,
        {
          side: (d) => (d.leads ? "start" : "end"),
          x: "rate",
          y: "group",
          text: (d) => `${Math.round(d.rate * 100)}%`,
          fill: (d) => COLOR[d.t],
          fontSize: 12.5,
          fontWeight: 600,
          ...HALO,
        },
        { start: { dx: 26 }, end: { dx: -26 } },
      ),
      Plot.text(POINTS, {
        x: "rate",
        y: "group",
        text: (d) => `n = ${d.n}`,
        fill: MUTED,
        fontSize: 11,
        dy: 24,
        ...HALO,
      }),
      Plot.text([POINTS.find((p) => p.group === "Everyone pooled" && p.t === "B")], {
        x: "rate",
        y: "group",
        text: () => "the winner flips",
        fill: ACCENT,
        fontSize: 12,
        fontWeight: 600,
        textAnchor: "start",
        dx: 17,
        dy: -20,
        ...HALO,
      }),
    ],
  });
}
