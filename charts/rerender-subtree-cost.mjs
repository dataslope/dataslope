/**
 * Why "where does this state live?" is a performance question as well as a
 * design one.
 *
 * React re-renders a component and everything beneath it when its state
 * changes. It does not diff props to decide whether to bother, unless you have
 * asked it to with `memo`. So the number of components that run on a keystroke
 * is the size of the subtree under whichever component holds the value, and
 * that is entirely a decision about where `useState` was called.
 *
 * Lifting state "just in case" is the usual way a small app gets slow. A
 * search box whose text lives in the page component re-runs the whole page on
 * every character; the same box owning its own text re-runs itself. Nothing
 * else about the code changed, and neither did the output.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Components re-rendered per keystroke for four placements of the same piece of state, from the root of a two-hundred-component page down to the input itself. Moving the state down cuts the count from two hundred to one.";

const PLACEMENTS = [
  { key: "The root component", n: 214, note: "the whole page, per character" },
  { key: "The page layout", n: 96, note: "everything below the header" },
  { key: "The results panel", n: 41, note: "the list and its rows" },
  { key: "The search box itself", n: 1, note: "the component that owns the text" },
];

const TOP = PLACEMENTS[0].n;
const BOTTOM = PLACEMENTS.at(-1).n;

export const caption = `React re-renders a component and everything under it when its state changes; it does not compare props first unless \`memo\` asks it to. So the cost of a keystroke is the size of the subtree beneath whoever holds the value. The same search box costs ${TOP} component renders per character with its text lifted to the root and ${BOTTOM} owning it directly. Nothing else about the code changes, and neither does the output, which is why "lift state just in case" is the usual way a small app gets slow.`;

export function render() {
  return plot({
    height: 300,
    marginTop: 26,
    marginLeft: 164,
    marginRight: 190,
    marginBottom: 46,
    ariaLabel: title,
    x: { label: "Components re-rendered per keystroke", labelAnchor: "center", domain: [0, 240], ticks: 5 },
    y: { label: null, domain: PLACEMENTS.map((d) => d.key), padding: 0.3, grid: false },
    marks: [
      Plot.barX(PLACEMENTS, {
        y: "key",
        x: "n",
        fill: (d) => (d.n === BOTTOM ? PRIMARY : ACCENT),
        fillOpacity: (d) => (d.n === BOTTOM ? 0.75 : 0.25 + (0.45 * d.n) / TOP),
      }),
      Plot.text(PLACEMENTS, {
        y: "key",
        x: "n",
        text: (d) => `${d.n}\n${d.note}`,
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.4,
        textAnchor: "start",
        dx: 9,
        ...HALO,
      }),
      Plot.ruleX([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
