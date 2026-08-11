/**
 * One matrix, two row orders, and the structure that only one of them shows.
 *
 * A heatmap's cells carry the data; its *ordering* carries the reading. Rows
 * and columns in a matrix have no natural sequence unless the labels happen to
 * be time or a size, so whatever order they arrive in, usually alphabetical,
 * usually an accident of a `GROUP BY`, is the order the reader is handed. Sort
 * the rows so that similar ones sit together and the same numbers resolve into
 * blocks: two clusters of features used by two distinct kinds of account.
 *
 * Nothing is added and nothing is hidden. The alphabetical panel contains the
 * clusters too, scattered across the grid where no eye will assemble them.
 * This is the single highest-value edit available to a heatmap, and it is the
 * one most often skipped, because the default order looks tidy.
 */
import { Plot, plot, GUIDE, HALO, MUTED, PRIMARY, rng } from "./_theme.mjs";

export const title =
  "The same feature-by-segment matrix drawn twice, once with rows in alphabetical order and once with similar rows placed together. Only the sorted version shows the two blocks of features that belong to two kinds of account.";

const SEGMENTS = ["Free", "Team", "Growth", "Scale"];

/** Two latent groups: features that the small end of the market uses and
 *  features the large end uses. `group` is the truth the sorted panel exposes
 *  and the alphabetical panel scatters. */
const FEATURES = [
  { key: "Alerts", group: 1 },
  { key: "API keys", group: 1 },
  { key: "Audit log", group: 1 },
  { key: "Dashboards", group: 0 },
  { key: "Exports", group: 0 },
  { key: "Roles", group: 1 },
  { key: "Sharing", group: 0 },
  { key: "Templates", group: 0 },
  { key: "Webhooks", group: 1 },
];

const u = rng(2277);

/** Usage rises with segment size for the "large" group and falls for the
 *  "small" one, plus enough noise that the blocks are read rather than
 *  computed. */
const usage = new Map();
for (const f of FEATURES) {
  for (let s = 0; s < SEGMENTS.length; s++) {
    const t = s / (SEGMENTS.length - 1);
    const base = f.group === 1 ? 0.12 + t * 0.74 : 0.86 - t * 0.68;
    usage.set(`${f.key}|${s}`, Math.max(0.02, Math.min(0.98, base + (u() - 0.5) * 0.16)));
  }
}

const ALPHA = "Alphabetical";
const SORTED = "Similar rows together";

const alphaOrder = [...FEATURES].sort((a, b) => a.key.localeCompare(b.key));
const sortedOrder = [...FEATURES].sort(
  (a, b) => a.group - b.group || a.key.localeCompare(b.key),
);

/** Rows are positioned by index on a continuous y scale, because the two
 *  panels need *different* row orders and a facet shares every scale, band
 *  scales included. The labels are painted on per panel instead. */
const rows = [
  { panel: ALPHA, order: alphaOrder },
  { panel: SORTED, order: sortedOrder },
].flatMap(({ panel, order }) =>
  order.flatMap((f, r) =>
    SEGMENTS.map((seg, s) => ({
      panel,
      key: f.key,
      r,
      s,
      v: usage.get(`${f.key}|${s}`),
    })),
  ),
);

const labels = [
  { panel: ALPHA, order: alphaOrder },
  { panel: SORTED, order: sortedOrder },
].flatMap(({ panel, order }) => order.map((f, r) => ({ panel, r, key: f.key })));

const SMALL = FEATURES.filter((f) => f.group === 0).length;

export const caption = `A heatmap's cells carry the data; its ordering carries the reading. Rows in a matrix have no natural sequence unless the labels happen to be a time or a size, so the order they arrive in, usually alphabetical, usually an accident of a GROUP BY, is the order the reader is handed. Put similar rows next to each other and the identical numbers resolve into two blocks: ${SMALL} features that the small end of the market uses and ${FEATURES.length - SMALL} that the large end does. Nothing was added and nothing hidden, the alphabetical panel holds the same clusters scattered where no eye will assemble them. Reordering is the highest-value edit available to a heatmap and the one most often skipped, because the default order looks tidy.`;

export function render() {
  const H = FEATURES.length;
  return plot({
    height: 340,
    marginTop: 34,
    marginLeft: 86,
    marginRight: 96,
    marginBottom: 46,
    ariaLabel: title,
    // The gutter has to hold the right panel's row labels, which are its own
    // and cannot be shared: the two panels are the same rows in two orders.
    fx: { label: null, domain: [ALPHA, SORTED], padding: 0.3 },
    x: {
      label: null,
      domain: [-0.02, SEGMENTS.length + 0.02],
      ticks: SEGMENTS.map((_, i) => i + 0.5),
      tickFormat: (i) => SEGMENTS[Math.floor(i)],
    },
    y: { label: null, domain: [H, 0], ticks: [], grid: false },
    marks: [
      // Intensity as opacity on one token rather than a color scale: a two-stop
      // linear scale would need a literal low end, and the tokens are the only
      // colors that survive both themes.
      Plot.rect(rows, {
        fx: "panel",
        x1: "s",
        x2: (d) => d.s + 1,
        y1: "r",
        y2: (d) => d.r + 1,
        fill: PRIMARY,
        fillOpacity: (d) => 0.05 + d.v * 0.9,
        inset: 0.6,
      }),
      // Row labels, per panel, since the two orders differ.
      Plot.text(labels, {
        fx: "panel",
        x: 0,
        y: (d) => d.r + 0.5,
        text: "key",
        fill: MUTED,
        fontSize: 10,
        textAnchor: "end",
        dx: -6,
      }),
      // The block boundary the sorted panel reveals.
      Plot.ruleY([SMALL], {
        fx: () => SORTED,
        stroke: GUIDE,
        strokeWidth: 1.6,
      }),
      Plot.text([{ at: SMALL / 2 }], {
        fx: () => SORTED,
        x: SEGMENTS.length,
        y: "at",
        text: () => "small-account\nfeatures",
        fill: MUTED,
        fontSize: 10,
        fontWeight: 600,
        lineHeight: 1.3,
        textAnchor: "start",
        dx: 8,
        ...HALO,
      }),
      Plot.text([{ at: (SMALL + H) / 2 }], {
        fx: () => SORTED,
        x: SEGMENTS.length,
        y: "at",
        text: () => "large-account\nfeatures",
        fill: MUTED,
        fontSize: 10,
        fontWeight: 600,
        lineHeight: 1.3,
        textAnchor: "start",
        dx: 8,
        ...HALO,
      }),
    ],
  });
}
