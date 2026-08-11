/**
 * The same three groups as boxes and as violins, where only one of the two
 * marks can answer the question the chart is being asked.
 *
 * A box reports five numbers. A violin reports the density, so it is the box
 * plus the shape, and the shape is exactly what the box discards: group B here
 * is bimodal (two populations measured together, which is a data problem
 * wearing a distribution costume) and its box is unremarkable. Group C is
 * heavily right-skewed and its box says "slightly wider".
 *
 * The trade is real and runs the other way too. A violin needs enough points
 * to estimate a density from, and its width is a kernel estimate with a
 * bandwidth, so on twenty observations it draws a confident smooth curve
 * through noise. Boxes for small samples and for many groups at once; violins
 * when the shape is the question and there is data enough to see it.
 */
import { Plot, plot, ACCENT, HALO, PRIMARY, normalSamples, rng } from "./_theme.mjs";

export const title =
  "Three groups drawn twice, as box plots and as violins. The boxes look similar; the violins reveal that the second group has two peaks and the third is heavily skewed.";

const N = 400;

const u = rng(4004);
/** Two populations reported as one: the failure a box cannot show. */
const BIMODAL = [
  ...normalSamples(N / 2, 34, 4.5, 11),
  ...normalSamples(N / 2, 58, 4.5, 22),
];
/** Right-skewed, the shape of every duration and every basket value. */
const SKEWED = Array.from({ length: N }, () => {
  const a = Math.max(u(), Number.EPSILON);
  const b = u();
  const z = Math.sqrt(-2 * Math.log(a)) * Math.cos(2 * Math.PI * b);
  return 30 + 14 * Math.exp(0.55 * z);
});

const GROUPS = [
  { key: "A", values: normalSamples(N, 46, 9, 33) },
  { key: "B", values: BIMODAL },
  { key: "C", values: SKEWED },
];

function quantile(xs, p) {
  const s = [...xs].sort((a, b) => a - b);
  const i = (s.length - 1) * p;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return lo === hi ? s[lo] : s[lo] + (s[hi] - s[lo]) * (i - lo);
}

const BOX = "Boxes: five numbers each";
const VIOLIN = "Violins: the whole shape";

const LO = 10;
const HI = 90;

/** Density by a Gaussian kernel, evaluated on a fixed grid. Written out rather
 *  than approximated with a histogram so the violin edge is smooth. */
const GRID = Array.from({ length: 121 }, (_, i) => LO + (i * (HI - LO)) / 120);
function density(xs, bw) {
  return GRID.map((g) => {
    let s = 0;
    for (const x of xs) {
      const z = (g - x) / bw;
      s += Math.exp(-0.5 * z * z);
    }
    return { g, d: s / (xs.length * bw * Math.sqrt(2 * Math.PI)) };
  });
}

/** Group centres on a *continuous* x scale. A band scale cannot carry the
 *  sub-band offsets a violin needs (each side of the curve sits a different
 *  distance from the centre at every y), so the categories are positions here
 *  and the axis labels are painted on by `tickFormat`. */
const CENTRE = Object.fromEntries(GROUPS.map((g, i) => [g.key, i]));
const HALF_MAX = 0.38;

const violins = GROUPS.flatMap((grp) => {
  const dens = density(grp.values, 3.2);
  const peak = Math.max(...dens.map((d) => d.d));
  return dens.map((d) => ({
    key: grp.key,
    g: d.g,
    x1: CENTRE[grp.key] - (d.d / peak) * HALF_MAX,
    x2: CENTRE[grp.key] + (d.d / peak) * HALF_MAX,
  }));
});

const boxes = GROUPS.map((grp) => ({
  key: grp.key,
  c: CENTRE[grp.key],
  q1: quantile(grp.values, 0.25),
  med: quantile(grp.values, 0.5),
  q3: quantile(grp.values, 0.75),
  lo: quantile(grp.values, 0.02),
  hi: quantile(grp.values, 0.98),
}));

const colorOf = (key) => (key === "B" ? ACCENT : PRIMARY);

export const caption = `Three groups, drawn both ways. A box reports five numbers; a violin reports the density, which is the box plus the thing the box throws away. Group B is two populations measured together and its box is unremarkable; group C is heavily right-skewed and its box says only "slightly wider". The trade runs both ways: a violin's width is a kernel estimate with a bandwidth, so on twenty observations it draws a confident smooth curve through noise. Boxes when the samples are small or the groups are many; violins when the shape is the question and there is data enough to see it.`;

export function render() {
  return plot({
    height: 330,
    marginTop: 34,
    marginLeft: 48,
    marginRight: 20,
    marginBottom: 46,
    ariaLabel: title,
    fx: { label: null, domain: [BOX, VIOLIN] },
    x: {
      label: null,
      domain: [-0.6, GROUPS.length - 0.4],
      ticks: GROUPS.map((_, i) => i),
      tickFormat: (i) => GROUPS[i].key,
    },
    y: { label: "Value", domain: [LO, HI], ticks: 5 },
    marks: [
      // ── Boxes ──────────────────────────────────────────────────────────
      Plot.ruleX(boxes, {
        fx: () => BOX,
        x: "c",
        y1: "lo",
        y2: "hi",
        stroke: (d) => colorOf(d.key),
        strokeWidth: 1.4,
      }),
      Plot.rect(boxes, {
        fx: () => BOX,
        x1: (d) => d.c - 0.2,
        x2: (d) => d.c + 0.2,
        y1: "q1",
        y2: "q3",
        fill: (d) => colorOf(d.key),
        fillOpacity: 0.25,
        stroke: (d) => colorOf(d.key),
        strokeWidth: 1.4,
      }),
      Plot.ruleY(boxes, {
        fx: () => BOX,
        y: "med",
        x1: (d) => d.c - 0.2,
        x2: (d) => d.c + 0.2,
        stroke: (d) => colorOf(d.key),
        strokeWidth: 2.4,
      }),

      // ── Violins ────────────────────────────────────────────────────────
      Plot.areaX(violins, {
        fx: () => VIOLIN,
        y: "g",
        x1: "x1",
        x2: "x2",
        z: "key",
        fill: (d) => colorOf(d.key),
        fillOpacity: 0.4,
        curve: "basis",
      }),
      Plot.line(violins, {
        fx: () => VIOLIN,
        y: "g",
        x: "x1",
        z: "key",
        stroke: (d) => colorOf(d.key),
        strokeWidth: 1.3,
        curve: "basis",
      }),
      Plot.line(violins, {
        fx: () => VIOLIN,
        y: "g",
        x: "x2",
        z: "key",
        stroke: (d) => colorOf(d.key),
        strokeWidth: 1.3,
        curve: "basis",
      }),

      Plot.text([{}], {
        fx: () => VIOLIN,
        x: CENTRE.B,
        y: 74,
        text: () => "two peaks,\ninvisible in the box",
        fill: ACCENT,
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.3,
        ...HALO,
      }),
    ],
  });
}
