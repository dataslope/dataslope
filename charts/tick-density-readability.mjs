/**
 * Three ticks, eight ticks, twenty-five ticks, and the point at which the
 * reader's job changes.
 *
 * An axis tick is a landmark, and landmarks work by being sparse. With three
 * of them the axis is a scale you glance at once and then stop thinking about;
 * every value you read is an interpolation, which sounds like a cost and is
 * not, because reading "a bit above halfway between 40 and 60" is exactly what
 * a reader was going to do anyway.
 *
 * Eight is comfortable. Twenty-five is where something changes in kind rather
 * than in degree. The labels are now close enough that finding the one you
 * want is a *search* rather than a glance: the eye has to land, read, decide
 * whether that is the right one, and move. Worse, at that density the labels
 * start to collide, so the renderer either overlaps them, rotates them, or
 * quietly drops some, and all three outcomes are worse than having asked for
 * fewer in the first place.
 *
 * The rule of thumb worth carrying: an axis wants four to seven labelled
 * ticks, on round numbers a reader can do arithmetic with. Not the number of
 * data points, and not as many as fit.
 *
 * Round numbers matter as much as the count. Ticks at 0, 25, 50, 75, 100 are
 * usable; ticks at 0, 23, 46, 69, 92, which is what "give me five ticks" over
 * a maximum of 92 produces if nobody intervenes, are five numbers the reader
 * has to read individually because they cannot predict the next one.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY, rng } from "./_theme.mjs";
import { panel, panelSpace, panelTitle } from "./_panels.mjs";

export const title =
  "The same series drawn three times with three, eight and twenty-five labelled ticks on the vertical axis. At three the axis is a scale you glance at once; at twenty-five the labels collide and finding the right one becomes a search rather than a glance.";

const u = rng(9_207);
const N = 30;
const SERIES = Array.from({ length: N }, (_, i) => ({
  i,
  v: 34 + i * 1.7 + Math.sin(i / 3.4) * 9 + (u() - 0.5) * 6,
}));

const DOMAIN = [20, 100];
const step = (n) => {
  const [a, b] = DOMAIN;
  return Array.from({ length: n }, (_, k) => a + ((b - a) * k) / (n - 1));
};

const VARIANTS = [
  { ticks: [20, 60, 100], title: "3 ticks", verdict: "a scale you glance\nat once" },
  { ticks: step(5), title: "5 ticks", verdict: "comfortable" },
  { ticks: step(17), title: "17 ticks", verdict: "finding one is now\na search" },
];

const PANELS = VARIANTS.map((_, k) => panel(k, { x: [0, N - 1], y: DOMAIN }));
const GOOD = 1;

export const caption = `The same series three times, differing only in how many ticks the vertical axis was asked for: three, five and seventeen.`;

export function render() {
  return plot({
    height: 300,
    marginTop: 24,
    marginLeft: 30,
    marginRight: 16,
    marginBottom: 42,
    ariaLabel: title,
    ...panelSpace(VARIANTS.length),
    marks: [
      ...PANELS.flatMap((p, k) => {
        const v = VARIANTS[k];
        const rows = SERIES.map((d) => ({ x: p.px(d.i), y: p.py(d.v) }));
        const ticks = v.ticks.map((t) => ({ v: t, y: p.py(t) }));
        return [
          Plot.link(ticks, {
            x1: p.left,
            x2: p.right,
            y1: "y",
            y2: "y",
            stroke: "currentColor",
            strokeOpacity: 0.1,
          }),
          Plot.text(ticks, {
            x: p.left,
            y: "y",
            text: (d) => String(Math.round(d.v)),
            fill: "currentColor",
            fillOpacity: 0.62,
            fontSize: 10,
            textAnchor: "end",
            dx: -6,
          }),
          Plot.line(rows, { x: "x", y: "y", stroke: PRIMARY, strokeWidth: 2 }),
          panelTitle(p, v.title, { fill: k === GOOD ? PRIMARY : MUTED }),
          Plot.text([{}], {
            x: (p.left + p.right) / 2,
            y: p.bottom,
            text: () => v.verdict,
            fill: k === VARIANTS.length - 1 ? ACCENT : MUTED,
            fontSize: 10,
            fontWeight: 600,
            lineHeight: 1.35,
            textAnchor: "middle",
            dy: 20,
            ...HALO,
          }),
        ];
      }),
    ],
  });
}
