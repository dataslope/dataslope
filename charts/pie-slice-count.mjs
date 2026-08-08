/**
 * The same total split into three, six and eleven slices, which is where a pie
 * stops working.
 *
 * The usual argument against pies is about the channel: angle and area are
 * weak, position is strong. That argument is correct and it is not what kills
 * most pies in the wild. Most pies die of *slice count*. Three slices is a
 * shape a person can hold in their head at a glance. Six is a legend lookup
 * per slice. Eleven produces a ring of splinters where several are too thin to
 * carry a label at all, the labels have to be moved outside and joined by
 * leader lines, and the reader ends up reading a list that happens to have a
 * circle attached.
 *
 * The tell is the question underneath. "Which is third largest?" is trivial on
 * the left, slow in the middle and impossible on the right, and it is the same
 * data every time: the right-hand pie is the left-hand one with its largest
 * category broken out.
 *
 * A pie with more than about five slices is a sorted bar chart that has not
 * been drawn yet.
 */
import { Plot, plot, HALO, MUTED, SERIES } from "./_theme.mjs";

export const title =
  "One dataset drawn as three pies: three slices, six slices and eleven slices. The three-slice pie is instantly readable, the eleven-slice one is a ring of splinters whose labels no longer fit inside it.";

/** Eleven leaf categories. The coarser pies merge them, so all three pies show
 *  the same total split at different levels of a hierarchy. */
const LEAVES = [
  { key: "Search", group: 0, value: 21 },
  { key: "Social", group: 0, value: 12 },
  { key: "Referral", group: 0, value: 6 },
  { key: "Email", group: 0, value: 5 },
  { key: "Direct", group: 1, value: 15 },
  { key: "Affiliate", group: 1, value: 9 },
  { key: "Display", group: 1, value: 7 },
  { key: "Video", group: 2, value: 8 },
  { key: "Podcast", group: 2, value: 6 },
  { key: "Print", group: 2, value: 6 },
  { key: "Events", group: 2, value: 5 },
];

const GROUPS = ["Organic", "Owned", "Paid"];

const sum = (xs) => xs.reduce((s, d) => s + d.value, 0);
const TOTAL = sum(LEAVES);

/** Three levels of the same split: by group, by group crossed with a coarse
 *  bucket, and by leaf. */
const LEVELS = [
  {
    slices: GROUPS.map((g, i) => ({
      key: g,
      value: sum(LEAVES.filter((d) => d.group === i)),
    })),
    note: "readable",
  },
  {
    slices: [
      ...LEAVES.filter((d) => d.value >= 8),
      {
        key: "Other",
        value: sum(LEAVES.filter((d) => d.value < 8)),
      },
    ],
    note: "a lookup per slice",
  },
  { slices: LEAVES.map((d) => ({ key: d.key, value: d.value })), note: "a list with a circle" },
];

/** Rank the leaf level once, so the caption names the right categories even if
 *  the numbers above are edited. */
const ranked = [...LEAVES].sort((a, b) => b.value - a.value);
const THIN = LEAVES.filter((d) => (d.value / TOTAL) * 360 < 24).length;

export const caption = `The usual case against pies is about the channel: angle and area are weak, position is strong. That is true, and it is not what kills most pies. Most pies die of slice count. Three is a shape a reader holds at a glance. Six is a legend lookup per slice. Eleven is a ring of splinters, ${THIN} of them under 24 degrees, too thin to hold a label, so the labels move outside and the reader works through a list that happens to have a circle attached. The question underneath is the test, and it is the same data in all three: "which is third largest?" is trivial on the left, slow in the middle, and hopeless on the right, where the answer is ${ranked[2].key} at ${ranked[2].value} percent. A pie with more than about five slices is a sorted bar chart that has not been drawn yet.`;

const W = 680;
const H = 330;
const R = 62;
const CY = 132;
const CX = [116, 340, 564];

/** Wedge geometry per pie, in pixels: Plot has no arc mark, so the paths are
 *  built here and emitted through a render transform below. */
const pies = LEVELS.map((level, p) => {
  let angle = -Math.PI / 2;
  const total = sum(level.slices);
  return {
    ...level,
    cx: CX[p],
    wedges: level.slices.map((d, i) => {
      const span = (d.value / total) * 2 * Math.PI;
      const a0 = angle;
      const a1 = angle + span;
      angle = a1;
      const mid = (a0 + a1) / 2;
      return {
        ...d,
        span,
        color: SERIES[i % SERIES.length],
        path: [
          `M ${CX[p]} ${CY}`,
          `L ${CX[p] + R * Math.cos(a0)} ${CY + R * Math.sin(a0)}`,
          `A ${R} ${R} 0 ${span > Math.PI ? 1 : 0} 1 ${CX[p] + R * Math.cos(a1)} ${CY + R * Math.sin(a1)}`,
          "Z",
        ].join(" "),
        // Inside the wedge when it is wide enough to hold a word, outside on a
        // leader line when it is not, which is the failure made visible.
        inside: span > 0.62,
        lx: CX[p] + (span > 0.62 ? R * 0.62 : R + 12) * Math.cos(mid),
        ly: CY + (span > 0.62 ? R * 0.62 : R + 12) * Math.sin(mid),
        tickX1: CX[p] + R * 1.02 * Math.cos(mid),
        tickY1: CY + R * 1.02 * Math.sin(mid),
        anchor:
          span > 0.62
            ? "middle"
            : Math.cos(mid) < -0.1
              ? "end"
              : Math.cos(mid) > 0.1
                ? "start"
                : "middle",
      };
    }),
  };
});

const allWedges = pies.flatMap((p) => p.wedges);

export function render() {
  return plot({
    height: H,
    width: W,
    marginTop: 26,
    marginLeft: 0,
    marginRight: 0,
    marginBottom: 24,
    ariaLabel: title,
    // A pixel frame: a pie has no x or y, so there is nothing for a scale to
    // measure and nothing for a gridline to mean.
    x: { axis: null, grid: false, domain: [0, W] },
    y: { axis: null, grid: false, domain: [H, 0] },
    marks: [
      Plot.text(pies, {
        x: "cx",
        y: 16,
        text: (d) => `${d.slices.length} slices`,
        fill: MUTED,
        fontSize: 12,
        fontWeight: 600,
        textAnchor: "middle",
      }),
      Plot.frame({
        stroke: "none",
        render: (index, scales, values, dimensions, context) => {
          const { document } = context;
          const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
          for (const w of allWedges) {
            const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            path.setAttribute("d", w.path);
            path.setAttribute("fill", w.color);
            path.setAttribute("fill-opacity", "0.55");
            path.setAttribute("stroke", "var(--ds-chart-surface)");
            path.setAttribute("stroke-width", "1.5");
            g.appendChild(path);
          }
          return g;
        },
      }),
      // Leader lines, drawn only for the slices too thin to hold their label.
      Plot.link(
        allWedges.filter((w) => !w.inside),
        {
          x1: "tickX1",
          y1: "tickY1",
          x2: "lx",
          y2: "ly",
          stroke: MUTED,
          strokeOpacity: 0.6,
        },
      ),
      // One mark per anchor: textAnchor is a constant option, not a channel.
      ...["start", "middle", "end"].map((anchor) =>
        Plot.text(
          allWedges.filter((w) => w.anchor === anchor),
          {
            x: "lx",
            y: "ly",
            text: "key",
            fill: MUTED,
            fontSize: 10,
            fontWeight: 600,
            textAnchor: anchor,
            ...HALO,
          },
        ),
      ),
      Plot.text(pies, {
        x: "cx",
        y: 250,
        text: "note",
        fill: MUTED,
        fontSize: 11,
        fontWeight: 600,
        textAnchor: "middle",
      }),
      Plot.text([{}], {
        x: W / 2,
        y: 296,
        text: () => "same data, same total: which is third largest?",
        fill: MUTED,
        fontSize: 11.5,
        fontWeight: 600,
        textAnchor: "middle",
      }),
    ],
  });
}
