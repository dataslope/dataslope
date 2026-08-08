/**
 * Why "your eye did the work" is a measurable claim and not a figure of speech.
 *
 * `preattentive-popout` shows the effect: one red dot among grey ones is found
 * instantly, and the reader can verify that on themselves in a second. What it
 * cannot show is the property that makes the effect *useful*, which is how the
 * cost behaves as the display grows. That is the experiment Treisman ran, and
 * it produced two lines with different slopes rather than two pictures.
 *
 * A single distinguishing feature is found in constant time: doubling the
 * number of distractors does not make it slower, because the visual system
 * processes the whole field in parallel. A *conjunction* of two features, the
 * one item that is both this colour and this shape, has to be checked item by
 * item, so the cost rises with the count. Flat against sloped is the whole
 * finding, and it is what tells a chart author that colour-coding one series is
 * free while "find the blue square among blue circles and red squares" is not.
 *
 * The numbers are the shape of Treisman & Gelade (1980) rather than their exact
 * milliseconds: the point is the pair of slopes, and inventing precise reaction
 * times for a specific published condition would be dressing an illustration up
 * as a replication. The caption says so.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Search time against the number of items on screen, for two kinds of target. Finding an item that differs by one feature takes about the same time however many items there are, so its line is flat. Finding an item defined by a combination of two features gets steadily slower as items are added, so its line climbs.";

const COUNTS = [1, 5, 10, 15, 20, 25, 30];

/** Flat: parallel processing, so the count does not enter. Sloped: roughly a
 *  fixed cost per item checked. Both start from the same baseline reaction
 *  time, which is what makes the slopes the only difference. */
const BASE = 420;
const PER_ITEM = 22;

const SERIESES = [
  {
    key: "One feature",
    note: "colour alone,\nseen in parallel",
    color: PRIMARY,
    f: () => BASE + 8,
  },
  {
    key: "Two features",
    note: "colour and shape,\nchecked one by one",
    color: ACCENT,
    f: (n) => BASE + PER_ITEM * (n - 1),
  },
];

const ROWS = SERIESES.flatMap((s) => COUNTS.map((n) => ({ key: s.key, n, ms: s.f(n) })));

const at = (key, n) => ROWS.find((r) => r.key === key && r.n === n).ms;
const BIGGEST = COUNTS[COUNTS.length - 1];
const GAP = Math.round(at("Two features", BIGGEST) - at("One feature", BIGGEST));

export const caption = `Two ways of asking a reader to find something, and they scale differently. A target that differs by a single feature is found in about the same time whether there are five items on screen or thirty: the visual system takes the whole field at once, so the line is flat. A target defined by a *combination* of two features has to be checked item by item, so each extra item costs, and by ${BIGGEST} items the search is about ${GAP} ms slower. That is the practical rule behind popout: colouring one series differently is free at any size, while "the blue square, among blue circles and red squares" is work that grows with your data. Slopes after Treisman and Gelade's 1980 conjunction-search experiments; the shape is theirs, the exact milliseconds are illustrative.`;

export function render() {
  return plot({
    height: 330,
    marginTop: 28,
    marginLeft: 62,
    marginRight: 158,
    marginBottom: 50,
    ariaLabel: title,
    x: {
      label: "Items on screen",
      labelAnchor: "center",
      domain: [0, BIGGEST + 1],
      ticks: 6,
    },
    y: { label: "Time to find the target (ms)", domain: [380, 1080], ticks: 5 },
    marks: [
      ...SERIESES.map((s) =>
        Plot.line(ROWS.filter((r) => r.key === s.key), {
          x: "n",
          y: "ms",
          stroke: s.color,
          strokeWidth: 2.4,
        }),
      ),
      Plot.dot(ROWS, {
        x: "n",
        y: "ms",
        r: 3,
        fill: (d) => SERIESES.find((s) => s.key === d.key).color,
      }),

      ...SERIESES.map((s) =>
        Plot.text([{}], {
          x: BIGGEST,
          y: at(s.key, BIGGEST),
          text: () => `${s.key}\n${s.note}`,
          fill: s.color,
          fontSize: 10.5,
          fontWeight: 600,
          lineHeight: 1.35,
          textAnchor: "start",
          dx: 9,
          ...HALO,
        }),
      ),

      Plot.text([{}], {
        x: BIGGEST / 2,
        y: at("One feature", BIGGEST),
        text: () => "flat: the count does not matter",
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "middle",
        dy: -12,
        ...HALO,
      }),
    ],
  });
}
