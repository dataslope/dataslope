/**
 * A palette that invents a ranking, and a reader who reads it.
 *
 * The six categories here are unordered. There is no sense in which "Support"
 * comes before "Billing"; they are names. The left panel colors them with a
 * sequential ramp, which is what happens when a plotting library is handed a
 * continuous color scale, or when somebody picks the palette that looks
 * tidiest, and the effect is not subtle: the eye reads light-to-dark as
 * low-to-high, because that is what lightness is *for*. The chart is now
 * asserting an order that does not exist, in a channel the reader trusts
 * without checking.
 *
 * Worse, the order it asserts is usually the alphabetical or insertion order
 * of the category names, so the ramp is a picture of how the dataframe was
 * sorted.
 *
 * The right panel is the same six values with a qualitative palette: hues of
 * roughly equal lightness, deliberately not in any sequence. Nothing about the
 * colors suggests one category outranks another, which is correct, and the
 * bar lengths, which *do* carry an order, are left to say so on their own.
 *
 * The rule generalises to a short table. Nominal data (names, types,
 * departments) takes a qualitative palette. Ordinal data (small/medium/large,
 * strongly disagree to strongly agree) takes a sequential one, and that is
 * exactly the case where the lightness ramp is doing real work. Data with a
 * meaningful middle (profit and loss, above and below a target) takes a
 * diverging palette. Choosing the family is the decision; choosing which
 * pretty colors are in it is not.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY, SERIES } from "./_theme.mjs";
import { panel, panelAxis, panelBaseline, panelSpace, panelTitle } from "./_panels.mjs";

export const title =
  "Six unordered support categories drawn twice: once shaded on a light-to-dark sequential ramp, which makes the eye read a ranking that is not in the data, and once in a qualitative palette of roughly equal lightness.";

/** Tickets by category. The categories are names, in alphabetical order,
 *  which is the order a groupby hands back and has nothing to do with size. */
const CATEGORIES = [
  { key: "Access", tickets: 214 },
  { key: "Billing", tickets: 388 },
  { key: "Data", tickets: 176 },
  { key: "Hardware", tickets: 291 },
  { key: "Network", tickets: 133 },
  { key: "Support", tickets: 340 },
];

const N = CATEGORIES.length;
const MAX = 420;
const alphabetical = CATEGORIES.map((d) => d.key);
const bySize = [...CATEGORIES].sort((a, b) => b.tickets - a.tickets).map((d) => d.key);
/** How far the ramp's implied ranking is from the real one. */
const MISLED = alphabetical.filter((k, i) => bySize[i] !== k).length;

const RAMP = panel(0, { y: [0, MAX] });
const HUES = panel(1, { y: [0, MAX] });

const BAR = 0.64;
const bars = (p) =>
  CATEGORIES.map((d, i) => ({
    ...d,
    i,
    x1: p.band(i, N) - (p.bandWidth(N) * BAR) / 2,
    x2: p.band(i, N) + (p.bandWidth(N) * BAR) / 2,
    y: p.py(d.tickets),
  }));

/** The sequential ramp, built from one hue at six lightnesses. Opacity stands
 *  in for lightness here, which is what a real sequential scale varies. */
const rampOpacity = (i) => 0.18 + (i / (N - 1)) * 0.75;

const DARKEST = CATEGORIES.at(-1);
const RANK_OF_DARKEST = bySize.indexOf(DARKEST.key) + 1;

export const caption = `Six unordered categories on a light-to-dark ramp, then in hues of roughly equal lightness. On the ramp all ${N} sit somewhere other than their size would put them, and the darkest bar, ${DARKEST.key}, is only ${RANK_OF_DARKEST}${RANK_OF_DARKEST === 1 ? "st" : RANK_OF_DARKEST === 2 ? "nd" : RANK_OF_DARKEST === 3 ? "rd" : "th"} by volume.`;

export function render() {
  return plot({
    height: 320,
    marginTop: 26,
    marginLeft: 42,
    marginRight: 18,
    marginBottom: 44,
    ariaLabel: title,
    ...panelSpace(2),
    marks: [
      ...panelAxis(RAMP, { ticks: [0, 100, 200, 300, 400] }),
      ...panelAxis(HUES, { ticks: [0, 100, 200, 300, 400] }),
      panelTitle(RAMP, "Sequential ramp on nominal data", { fill: ACCENT }),
      panelTitle(HUES, "Qualitative palette", { fill: PRIMARY }),
      panelBaseline(RAMP),
      panelBaseline(HUES),

      Plot.rect(bars(RAMP), {
        x1: "x1",
        x2: "x2",
        y1: RAMP.py(0),
        y2: "y",
        fill: PRIMARY,
        fillOpacity: (d) => rampOpacity(d.i),
      }),
      Plot.rect(bars(HUES), {
        x1: "x1",
        x2: "x2",
        y1: HUES.py(0),
        y2: "y",
        fill: (d) => SERIES[d.i % SERIES.length],
        fillOpacity: 0.75,
      }),

      ...[RAMP, HUES].map((p) =>
        Plot.text(bars(p), {
          x: (d) => (d.x1 + d.x2) / 2,
          y: p.py(0),
          text: (d) => d.key.slice(0, 8),
          fill: "currentColor",
          fillOpacity: 0.6,
          fontSize: 10,
          textAnchor: "middle",
          dy: 13,
        }),
      ),

      Plot.text([{}], {
        x: (RAMP.left + RAMP.right) / 2,
        y: RAMP.py(0),
        text: () => "the shading says these are ranked. They are alphabetical.",
        fill: ACCENT,
        fontSize: 10,
        fontWeight: 700,
        textAnchor: "middle",
        dy: 30,
        ...HALO,
      }),
      Plot.text([{}], {
        x: (HUES.left + HUES.right) / 2,
        y: HUES.py(0),
        text: () => "the color says nothing, and the bars say everything",
        fill: MUTED,
        fontSize: 10,
        fontWeight: 700,
        textAnchor: "middle",
        dy: 30,
        ...HALO,
      }),
    ],
  });
}
