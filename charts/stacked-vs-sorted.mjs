/**
 * Why a pie chart, and a stacked bar, lose to a plain sorted bar: only one of
 * the three lets you compare any two categories directly.
 *
 * The same six shares, drawn twice. In the stacked bar every segment after the
 * first starts somewhere different, so comparing two of them means comparing
 * two lengths that share no baseline, which is the same judgement a pie asks
 * for and people are measurably bad at. Sorted bars put every category on one
 * baseline, so the ranking is read rather than worked out.
 *
 * The two middle categories are within a point of each other on purpose:
 * ranking them in the stacked row is genuinely hard, and takes a second in the
 * sorted one. That difficulty *is* the argument.
 */
import { Plot, plot, HALO, MUTED, SERIES } from "./_theme.mjs";

export const title =
  "The same six shares drawn twice: once as a single stacked bar where each segment starts at a different point, and once as sorted bars all starting from zero. Two of the categories are nearly equal and can only be ranked in the sorted version.";

export const caption =
  "The same six numbers. Stacked, every segment after the first floats on a different baseline, which is the judgement a pie chart also asks for. Sorted from a common baseline, the ranking is simply there.";

const SHARES = [
  { key: "Direct", share: 0.27 },
  { key: "Search", share: 0.23 },
  { key: "Social", share: 0.185 },
  { key: "Email", share: 0.178 },
  { key: "Referral", share: 0.088 },
  { key: "Other", share: 0.049 },
];

const COLOR = Object.fromEntries(SHARES.map((s, i) => [s.key, SERIES[i % SERIES.length]]));

// Running offsets for the stacked row.
let acc = 0;
const STACKED = SHARES.map((s) => {
  const x1 = acc;
  acc += s.share;
  return { ...s, x1, x2: acc };
});

const SORTED = [...SHARES]
  .sort((a, b) => b.share - a.share)
  .map((s) => ({ ...s, x1: 0, x2: s.share }));

const ROW_STACKED = 0;
const BAR_H = 0.32;

export function render() {
  return plot({
    height: 400,
    marginTop: 34,
    marginLeft: 96,
    marginRight: 54,
    marginBottom: 46,
    ariaLabel: title,
    x: { label: "Share of traffic", labelAnchor: "center", domain: [0, 1], ticks: 5, tickFormat: "%" },
    // Reversed so row 0 (the stacked bar) is at the top and the sorted rows
    // read downward; Plot's continuous y is bottom-up by default, which put
    // the two halves in the opposite order to the labels.
    y: {
      label: null,
      domain: [-0.72, SORTED.length + 0.5],
      ticks: [],
      grid: false,
      reverse: true,
    },
    marks: [
      // ── Stacked: one bar, six segments, five different baselines ──────────
      Plot.rect(STACKED, {
        x1: "x1",
        x2: "x2",
        y1: ROW_STACKED - BAR_H,
        y2: ROW_STACKED + BAR_H,
        fill: (d) => COLOR[d.key],
        fillOpacity: 0.55,
      }),
      Plot.text(STACKED, {
        x: (d) => (d.x1 + d.x2) / 2,
        y: ROW_STACKED,
        text: (d) => (d.share > 0.07 ? d.key : ""),
        fill: MUTED,
        fontSize: 11,
        fontWeight: 600,
        ...HALO,
      }),
      Plot.text([{}], {
        x: 0,
        y: -0.62,
        text: () => "Stacked: which is bigger, Social or Email?",
        fill: MUTED,
        fontSize: 12,
        fontWeight: 600,
        textAnchor: "start",
        ...HALO,
      }),

      // ── Sorted: six bars, one baseline ───────────────────────────────────
      Plot.rect(SORTED, {
        x1: "x1",
        x2: "x2",
        y1: (d, i) => i + 1 - 0.3,
        y2: (d, i) => i + 1 + 0.3,
        fill: (d) => COLOR[d.key],
        fillOpacity: 0.55,
      }),
      Plot.text(SORTED, {
        x: 0,
        y: (d, i) => i + 1,
        text: "key",
        fill: MUTED,
        fontSize: 11.5,
        textAnchor: "end",
        dx: -10,
      }),
      Plot.text(SORTED, {
        x: "x2",
        y: (d, i) => i + 1,
        text: (d) => `${(d.share * 100).toFixed(1)}%`,
        fill: MUTED,
        fontSize: 11.5,
        fontWeight: 600,
        textAnchor: "start",
        dx: 8,
        ...HALO,
      }),
      Plot.text([{}], {
        x: 0,
        y: 0.46,
        text: () => "Sorted from a common baseline: read it off",
        fill: MUTED,
        fontSize: 12,
        fontWeight: 600,
        textAnchor: "start",
        ...HALO,
      }),
    ],
  });
}
