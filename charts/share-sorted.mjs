/**
 * The same six shares as `share-stacked`, sorted and on a common baseline.
 *
 * Every bar starts at zero, so any two can be compared directly and the
 * ranking is read rather than worked out. The question the stacked chart could
 * not answer takes about a second here, and that difference is the whole case
 * against pie charts and stacked bars for this job.
 *
 * The numbers come from `_shares.mjs`, shared with the stacked version, so the
 * two can never drift apart.
 */
import { Plot, plot, HALO, MUTED } from "./_theme.mjs";
import { SHARES, SHARE_COLOR, CLOSEST } from "./_shares.mjs";

export const title =
  "The same six traffic sources as separate horizontal bars, sorted largest to smallest, every one starting at zero and labelled with its percentage.";

export const caption = `The same six numbers on a common baseline. ${CLOSEST.s.key} beats ${CLOSEST.next.key} by ${((CLOSEST.s.share - CLOSEST.next.share) * 100).toFixed(1)} of a point, which took a second to read here and was guesswork in the stack above.`;

const SORTED = [...SHARES].sort((a, b) => b.share - a.share);

export function render() {
  return plot({
    height: 320,
    marginTop: 30,
    marginLeft: 84,
    marginRight: 68,
    marginBottom: 46,
    ariaLabel: title,
    x: { label: "Share of traffic", labelAnchor: "center", domain: [0, 1], ticks: 5, tickFormat: "%" },
    y: { label: null, domain: SORTED.map((s) => s.key), padding: 0.3, grid: false },
    marks: [
      Plot.barX(SORTED, {
        x: "share",
        y: "key",
        fill: (d) => SHARE_COLOR[d.key],
        fillOpacity: 0.55,
      }),
      Plot.text(SORTED, {
        x: "share",
        y: "key",
        text: (d) => `${(d.share * 100).toFixed(1)}%`,
        fill: MUTED,
        fontSize: 11.5,
        fontWeight: 600,
        textAnchor: "start",
        dx: 8,
        ...HALO,
      }),
    ],
  });
}
