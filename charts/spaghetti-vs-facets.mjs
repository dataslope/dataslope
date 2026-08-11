/**
 * Twelve series as small multiples, with the tangle they came from ghosted
 * behind each panel.
 *
 * The grey lines are the spaghetti chart: all twelve drawn over each other,
 * which is a picture of one tangle rather than of twelve series. No line can
 * be followed end to end, and the one series that behaves differently from the
 * rest is invisible in it. Splitting them gives each series its own frame, and
 * keeping the ghost behind every panel means the comparison to the group
 * survives the split.
 *
 * Faceting is the honest use of the technique here: every panel plots the same
 * quantity on the same axes, which is what makes them comparable.
 */
import { Plot, plot, rng, ACCENT, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Twelve small multiples over twenty-four months, each showing one series in color with all twelve ghosted behind it in grey. The grey tangle is unreadable; in the split panels one series is clearly falling while the rest drift upward.";

export const caption =
  "The grey behind every panel is all twelve series drawn together, which is the tangle small multiples exist to undo. Splitting them costs the direct overlay and buys back the ability to read any single series, and to spot the one that is not behaving like the others.";

const MONTHS = 24;
const SERIES_COUNT = 12;
const ODD_ONE = 6; // the series that falls while the rest drift up

const series = Array.from({ length: SERIES_COUNT }, (_, s) => {
  const next = rng(3000 + s * 61);
  const drift = s === ODD_ONE ? -1.6 : 0.55 + next() * 0.5;
  let level = 50 + next() * 14;
  return Array.from({ length: MONTHS }, (_, t) => {
    level += drift + (next() - 0.5) * 5;
    return { key: String(s + 1), s, t, value: level, odd: s === ODD_ONE };
  });
}).flat();

const DOMAIN = [
  Math.floor(Math.min(...series.map((d) => d.value)) / 10) * 10 - 4,
  Math.ceil(Math.max(...series.map((d) => d.value)) / 10) * 10 + 4,
];

// Every panel carries a ghost of all twelve, so splitting them up does not
// throw away the comparison to the group.
const ghosts = Array.from({ length: SERIES_COUNT }, (_, panel) =>
  series.map((d) => ({ ...d, panel: String(panel + 1), ghostKey: `${panel}/${d.s}` })),
).flat();

export function render() {
  return plot({
    height: 300,
    marginTop: 30,
    marginLeft: 40,
    marginBottom: 34,
    ariaLabel: title,
    // Numbers, not names: twelve "Region N" titles across 680px overlap.
    fx: {
      label: null,
      domain: Array.from({ length: SERIES_COUNT }, (_, s) => String(s + 1)),
    },
    x: { label: null, domain: [0, MONTHS - 1], ticks: [] },
    y: { label: null, domain: DOMAIN, ticks: 3 },
    marks: [
      Plot.lineY(ghosts, {
        x: "t",
        y: "value",
        z: "ghostKey",
        fx: "panel",
        stroke: MUTED,
        strokeOpacity: 0.22,
        strokeWidth: 1,
        clip: true,
      }),
      Plot.lineY(series, {
        x: "t",
        y: "value",
        z: "key",
        fx: "key",
        stroke: (d) => (d.odd ? ACCENT : PRIMARY),
        strokeWidth: 2,
        clip: true,
      }),
      Plot.text([{ key: String(ODD_ONE + 1) }], {
        x: (MONTHS - 1) / 2,
        y: DOMAIN[0] + 4,
        fx: "key",
        text: () => "fell",
        fill: ACCENT,
        fontSize: 11,
        fontWeight: 600,
        ...HALO,
      }),
      Plot.frame({ stroke: "currentColor", strokeOpacity: 0.1 }),
    ],
  });
}
