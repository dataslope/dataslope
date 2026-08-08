/**
 * What a `key` is actually for, which is not silencing the warning.
 *
 * React matches the previous children of a list against the next ones by key.
 * With a stable id per item, inserting at the front matches every existing
 * element to itself and creates exactly one: n DOM nodes stay put. With the
 * array index as the key, every item's key shifts by one, so React reads it as
 * "item 0's content changed, and item 1's, and item 2's…" and updates all of
 * them, then appends one more.
 *
 * The updates are the visible half. The invisible half is worse: uncontrolled
 * state attached to those nodes (focus, scroll position, text typed into an
 * input, a CSS transition mid-flight) belongs to the *position* under index
 * keys, so it stays behind while the content moves. That is the bug that makes
 * this worth a chart rather than a footnote, and it does not show up until
 * something is inserted anywhere but the end.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "DOM elements touched when one row is inserted at the top of a list, against list length. With index keys the count rises with the list; with stable keys it stays flat at one.";

const MAX = 500;
const AT = 200;

const rows = Array.from({ length: 51 }, (_, i) => {
  const n = i * 10;
  return [
    { key: "key={index}", n, touched: n + 1 },
    { key: "key={item.id}", n, touched: n === 0 ? 0 : 1 },
  ];
}).flat();

export const caption = `React matches a list's previous children against the next ones by key. Insert a row at the front with stable ids and every existing element matches itself: one element is created and ${AT} are left alone. With the array index as the key, every key shifts by one, so React reads it as "item 0's content changed, and item 1's, and item 2's" and updates all ${AT + 1}. The wasted updates are the visible half. The half that becomes a bug report is that focus, scroll position, text typed into an input and an in-flight transition all belong to the *position* under index keys, so they stay behind while the content moves past them.`;

export function render() {
  return plot({
    height: 300,
    marginTop: 26,
    marginLeft: 62,
    marginRight: 128,
    marginBottom: 46,
    ariaLabel: title,
    x: { label: "Rows already in the list", labelAnchor: "center", domain: [0, MAX], ticks: 6 },
    y: { label: "DOM elements touched", domain: [0, MAX + 20], ticks: 5 },
    marks: [
      Plot.line(rows.filter((d) => d.key === "key={index}"), {
        x: "n",
        y: "touched",
        stroke: ACCENT,
        strokeWidth: 2,
      }),
      Plot.line(rows.filter((d) => d.key !== "key={index}"), {
        x: "n",
        y: "touched",
        stroke: PRIMARY,
        strokeWidth: 2,
        curve: "step-after",
      }),
      Plot.text([{}], {
        x: MAX,
        y: MAX,
        text: () => "key={index}",
        fill: ACCENT,
        fontSize: 11,
        fontWeight: 600,
        textAnchor: "start",
        dx: 8,
        ...HALO,
      }),
      Plot.text([{}], {
        x: MAX,
        y: 1,
        text: () => "key={item.id}",
        fill: PRIMARY,
        fontSize: 11,
        fontWeight: 600,
        textAnchor: "start",
        dx: 8,
        ...HALO,
      }),
      Plot.text([{}], {
        x: 20,
        y: MAX * 0.78,
        text: () =>
          "the wasted updates are the visible half;\nfocus and scroll staying behind is the other one",
        fill: MUTED,
        fontSize: 11,
        fontWeight: 600,
        lineHeight: 1.35,
        textAnchor: "start",
        ...HALO,
      }),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
