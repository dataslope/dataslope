/**
 * What `flex-grow` actually divides up, which is not the container.
 *
 * The number is read as a ratio of the whole row, and it is a ratio of the
 * *leftover*: the browser lays the items out at their base size first, then
 * shares whatever space remains in proportion to the grow factors. Three items
 * with bases of 200, 100 and 100 pixels and grow factors of 1, 1 and 2 are not
 * in the ratio 1:1:2 at any width, and at 400 pixels they are not growing at
 * all because there is nothing left over.
 *
 * The chart is each item's rendered width as the container widens. The kink at
 * 400 is where free space appears, and after it the three lines climb at rates
 * of one quarter, one quarter and one half of every pixel added, which is the
 * ratio the property really controls. `flex-basis: 0` is the way to make the
 * factors describe the whole width, because then the leftover *is* the whole
 * width, and it is why that is the idiom for an even split.
 */
import { Plot, plot, GUIDE, HALO, MUTED, SERIES } from "./_theme.mjs";

export const title =
  "Rendered width of three flex items as their container widens. Below four hundred pixels all three sit at their base sizes; beyond it each climbs at a rate set by its grow factor's share of the free space.";

const ITEMS = [
  { key: "basis 200, grow 1", basis: 200, grow: 1, color: SERIES[0] },
  { key: "basis 100, grow 1", basis: 100, grow: 1, color: SERIES[1] },
  { key: "basis 100, grow 2", basis: 100, grow: 2, color: SERIES[2] },
];

const BASIS = ITEMS.reduce((s, i) => s + i.basis, 0);
const GROW = ITEMS.reduce((s, i) => s + i.grow, 0);
const MAX = 1000;

const width = (item, container) =>
  item.basis + (item.grow / GROW) * Math.max(0, container - BASIS);

const rows = ITEMS.flatMap((item) =>
  Array.from({ length: 101 }, (_, i) => {
    const container = (i * MAX) / 100;
    return { key: item.key, color: item.color, container, w: width(item, container) };
  }),
);

export const caption = `\`flex-grow\` shares out the *leftover*, not the container. The browser lays the items out at their bases first (${ITEMS.map((i) => i.basis).join(" + ")} = ${BASIS}px here), and only what remains is divided in proportion to the grow factors. So below ${BASIS}px nothing grows at all, and above it each item takes its share of every added pixel: a quarter, a quarter and a half. The three items are never in the ratio 1:1:2 at any width. Setting \`flex-basis: 0\` makes the leftover *be* the whole width, which is why that is the idiom when you want the factors to describe the row.`;

export function render() {
  return plot({
    height: 320,
    marginTop: 26,
    marginLeft: 62,
    marginRight: 148,
    marginBottom: 46,
    ariaLabel: title,
    x: { label: "Container width (px)", labelAnchor: "center", domain: [0, MAX], ticks: 6 },
    y: { label: "Item width (px)", domain: [0, 460], ticks: 5 },
    marks: [
      Plot.line(rows, { x: "container", y: "w", z: "key", stroke: "color", strokeWidth: 2 }),
      Plot.ruleX([BASIS], { stroke: GUIDE, strokeDasharray: "4 3" }),
      Plot.text([{}], {
        x: BASIS,
        y: 430,
        text: () => "free space starts here",
        fill: MUTED,
        fontSize: 11,
        fontWeight: 600,
        textAnchor: "start",
        dx: 10,
        ...HALO,
      }),
      ...ITEMS.map((item) =>
        Plot.text([{}], {
          x: MAX,
          y: width(item, MAX),
          text: () => item.key,
          fill: item.color,
          fontSize: 10.5,
          fontWeight: 600,
          textAnchor: "start",
          dx: 8,
          ...HALO,
        }),
      ),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
