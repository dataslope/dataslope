/**
 * Six shares as a single stacked bar, which is the judgement a pie chart also
 * asks for.
 *
 * Only the first segment starts at zero. Every one after it begins wherever
 * the previous one happened to end, so comparing two of them means comparing
 * two lengths that share no baseline, and people are measurably bad at that.
 * Social and Email are within a point of each other here; ranking them from
 * this chart is guesswork.
 *
 * `share-sorted` is the same six numbers on a common baseline, and belongs
 * immediately after this one. They are two charts rather than one figure
 * because the comparison is the reader's to make, and a single frame would let
 * the eye cheat by measuring the sorted bars and reading the answer back off
 * the stack.
 */
import { Plot, plot, HALO, MUTED } from "./_theme.mjs";
import { SHARES, SHARE_COLOR, CLOSEST } from "./_shares.mjs";

export const title =
  "Six traffic sources as one stacked horizontal bar spanning the full width. Each segment begins where the previous one ended, so only the leftmost starts at zero.";

export const caption = `Stacked, only the first segment starts at zero. Ranking ${CLOSEST.s.key} against ${CLOSEST.next.key} means comparing two lengths that share no baseline, which is exactly what a pie chart asks of you.`;

let acc = 0;
const SEGMENTS = SHARES.map((s) => {
  const x1 = acc;
  acc += s.share;
  return { ...s, x1, x2: acc };
});

export function render() {
  return plot({
    height: 190,
    marginTop: 54,
    marginLeft: 24,
    marginRight: 24,
    marginBottom: 46,
    ariaLabel: title,
    x: { label: "Share of traffic", labelAnchor: "center", domain: [0, 1], ticks: 5, tickFormat: "%" },
    y: { label: null, domain: [-1, 1], ticks: [], grid: false },
    marks: [
      Plot.rect(SEGMENTS, {
        x1: "x1",
        x2: "x2",
        y1: -0.42,
        y2: 0.42,
        fill: (d) => SHARE_COLOR[d.key],
        fillOpacity: 0.55,
      }),
      Plot.text(SEGMENTS, {
        x: (d) => (d.x1 + d.x2) / 2,
        y: 0,
        text: (d) => (d.share > 0.07 ? d.key : ""),
        fill: MUTED,
        fontSize: 11.5,
        fontWeight: 600,
        ...HALO,
      }),
      Plot.text([{}], {
        x: 0,
        y: 0.82,
        text: () => `Which is bigger, ${CLOSEST.s.key} or ${CLOSEST.next.key}?`,
        fill: MUTED,
        fontSize: 12.5,
        fontWeight: 600,
        textAnchor: "start",
        ...HALO,
      }),
    ],
  });
}
