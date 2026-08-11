/**
 * Two axes, one symbol, two different quantities.
 *
 * Both panels are labelled in per cent and both have a tick at 20. On the left
 * that tick means "a fifth of the total". On the right it means "twenty
 * percentage points more than before", which could be a move from 4% to 24% or
 * from 60% to 80%, and is not a share of anything.
 *
 * The two are so easy to confuse that the confusion has its own name in
 * journalism style guides. A drug that takes a risk from 2% to 3% has raised
 * it by *one percentage point* and by *fifty per cent*, and both figures are
 * correct. Which one appears in the headline is a choice, and the `%` symbol
 * is identical in both.
 *
 * A chart is a worse place for this than a sentence, because a sentence can
 * say "percentage points" and an axis usually cannot: the label is short by
 * design, the tick is a bare number, and the two panels sit side by side in
 * one dashboard where the reader will compare a 20 on the left with a 20 on
 * the right without noticing they are different animals.
 *
 * Three habits fix it. Write **pp** rather than **%** on any axis of
 * differences. Give a change axis a visible zero, which a share axis rarely
 * needs, because zero is the meaningful reference for a difference and not for
 * a share. And let a change axis go negative if the data can, which is the
 * strongest single tell that a reader is looking at a difference rather than a
 * proportion.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY } from "./_theme.mjs";
import { panel, panelAxis, panelBaseline, panelSpace, panelTitle } from "./_panels.mjs";

export const title =
  "Two panels of five regions, both with axes labelled in per cent. The first is each region's share of total revenue; the second is its change in market share in percentage points, which can be negative. The same tick value means two unrelated things.";

const REGIONS = [
  { key: "North", share: 31, change: 4 },
  { key: "South", share: 24, change: -6 },
  { key: "East", share: 21, change: 11 },
  { key: "West", share: 16, change: -2 },
  { key: "Islands", share: 8, change: 20 },
];

const N = REGIONS.length;
const SHARE = panel(0, { y: [0, 36] });
const CHANGE = panel(1, { y: [-10, 24] });

const BAR = 0.6;
const bars = (p, field) =>
  REGIONS.map((d, i) => ({
    ...d,
    v: d[field],
    x1: p.band(i, N) - (p.bandWidth(N) * BAR) / 2,
    x2: p.band(i, N) + (p.bandWidth(N) * BAR) / 2,
    y: p.py(d[field]),
  }));

const SHARE_TOTAL = REGIONS.reduce((s, d) => s + d.share, 0);
const CLASH = REGIONS.find((d) => d.change === 20);

export const caption = `Both axes say per cent and both have a tick at 20, and the two twenties are different animals. On the left, 20 means a fifth of the total, and the five bars add to ${SHARE_TOTAL}. On the right, 20 means twenty percentage *points* of change, which could be a move from 4 to 24 or from 60 to 80, and adds up to nothing in particular. The confusion is common enough to have its own entry in journalism style guides: a drug that takes a risk from 2% to 3% has raised it by one percentage point and by fifty per cent, both figures correct, and the symbol is the same either way. A chart is a worse place for this than a sentence, because a sentence can write "percentage points" and an axis label usually will not, so a reader comparing ${CLASH.key} on the left with ${CLASH.key} on the right sees an 8 and a 20 and draws the wrong conclusion about which is bigger. Three habits fix it. Write pp instead of % on any axis of differences. Give a change axis a visible zero, which a share axis rarely needs, because zero is the reference for a difference and not for a proportion. And let a change axis run negative when the data can, which is the clearest single signal that a reader is looking at a difference.`;

export function render() {
  return plot({
    height: 320,
    marginTop: 26,
    marginLeft: 44,
    marginRight: 18,
    marginBottom: 46,
    ariaLabel: title,
    ...panelSpace(2),
    marks: [
      ...panelAxis(SHARE, { ticks: [0, 10, 20, 30], format: (v) => `${v}%` }),
      ...panelAxis(CHANGE, {
        ticks: [-10, 0, 10, 20],
        format: (v) => `${v > 0 ? "+" : ""}${v} pp`,
      }),
      panelTitle(SHARE, "Share of total revenue"),
      panelTitle(CHANGE, "Change in market share"),
      panelBaseline(SHARE),
      panelBaseline(CHANGE, 0),

      Plot.rect(bars(SHARE, "share"), {
        x1: "x1",
        x2: "x2",
        y1: SHARE.py(0),
        y2: "y",
        fill: PRIMARY,
        fillOpacity: 0.62,
      }),
      Plot.rect(bars(CHANGE, "change"), {
        x1: "x1",
        x2: "x2",
        y1: CHANGE.py(0),
        y2: "y",
        fill: (d) => (d.v < 0 ? ACCENT : PRIMARY),
        fillOpacity: 0.62,
      }),

      ...[
        [SHARE, "share"],
        [CHANGE, "change"],
      ].map(([p, field]) =>
        Plot.text(
          REGIONS.map((d, i) => ({ key: d.key, x: p.band(i, N) })),
          {
            x: "x",
            y: p.py(field === "share" ? 0 : -10),
            text: (d) => d.key.slice(0, 5),
            fill: "currentColor",
            fillOpacity: 0.6,
            fontSize: 10,
            textAnchor: "middle",
            dy: 14,
          },
        ),
      ),

      Plot.text([{}], {
        x: (SHARE.left + SHARE.right) / 2,
        y: SHARE.py(0),
        text: () => `these five add to ${SHARE_TOTAL}%`,
        fill: MUTED,
        fontSize: 10,
        fontWeight: 600,
        textAnchor: "middle",
        dy: 32,
        ...HALO,
      }),
      Plot.text([{}], {
        x: (CHANGE.left + CHANGE.right) / 2,
        y: CHANGE.py(-10),
        text: () => "these add to nothing, and two are negative",
        fill: ACCENT,
        fontSize: 10,
        fontWeight: 600,
        textAnchor: "middle",
        dy: 32,
        ...HALO,
      }),
      Plot.text([{}], {
        x: CHANGE.band(4, N),
        y: CHANGE.py(20),
        text: () => "20 here is not\n20 over there",
        fill: ACCENT,
        fontSize: 10,
        fontWeight: 700,
        lineHeight: 1.35,
        textAnchor: "middle",
        dy: -18,
        ...HALO,
      }),
    ],
  });
}
