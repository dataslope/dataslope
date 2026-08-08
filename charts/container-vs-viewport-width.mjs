/**
 * Why a media query is the wrong tool for a component, in one line each.
 *
 * A media query asks the viewport. A card in a sidebar has a width the
 * viewport knows nothing about: it is whatever the sidebar's column happens to
 * be, and that is set by the grid, which changes at breakpoints of its own. So
 * the same card is 260 pixels wide on a 1400-pixel desktop and 700 wide on a
 * 760-pixel tablet where the layout has collapsed to one column. A rule that
 * says "stack below 700px of viewport" therefore stacks the card on exactly
 * the screen where it has the most room, and lays it out side by side on the
 * screen where it has the least.
 *
 * A container query asks the parent instead, so the threshold sits on the axis
 * the component actually cares about. The crossing where the two lines swap
 * order is the whole argument, and it is not a corner case: it is every
 * sidebar, every modal, every card that appears in two places.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Available width for the same card in a main column and in a sidebar, as the viewport widens. The two swap places at the breakpoint where the layout collapses to one column, so a viewport-based rule fires on the wrong one.";

const MAX = 1600;
const COLLAPSE = 900;

/** Below the collapse the layout is one column and everything is full width;
 *  above it the sidebar takes a fixed share. */
const main = (v) => (v < COLLAPSE ? v - 48 : (v - 72) * 0.68);
const side = (v) => (v < COLLAPSE ? v - 48 : (v - 72) * 0.32);

const rows = Array.from({ length: 161 }, (_, i) => {
  const v = 320 + (i * (MAX - 320)) / 160;
  return [
    { key: "The card in the main column", v, w: main(v), color: PRIMARY },
    { key: "The same card in the sidebar", v, w: side(v), color: ACCENT },
  ];
}).flat();

const AT = 760;
const WIDE = 1400;

export const caption = `A media query asks the viewport; a component lives inside a parent. On a ${AT}px tablet the layout here is one column, so the card has ${Math.round(side(AT))}px to work with. On a ${WIDE}px desktop the same card in the sidebar has ${Math.round(side(WIDE))}px. A rule reading "stack below 700px of viewport" therefore keeps the card side by side exactly where it is narrowest and stacks it where it is widest. A container query asks the parent, so the threshold sits on the axis the component actually responds to.`;

export function render() {
  return plot({
    height: 320,
    marginTop: 26,
    marginLeft: 66,
    marginRight: 176,
    marginBottom: 46,
    ariaLabel: title,
    x: { label: "Viewport width (px)", labelAnchor: "center", domain: [320, MAX], ticks: 6 },
    y: { label: "Width available to the card (px)", domain: [0, 1060], ticks: 5 },
    marks: [
      Plot.line(rows, { x: "v", y: "w", z: "key", stroke: "color", strokeWidth: 2 }),
      Plot.ruleX([COLLAPSE], { stroke: GUIDE, strokeDasharray: "4 3" }),
      Plot.text([{}], {
        x: COLLAPSE,
        y: 1010,
        text: () => "the layout collapses here",
        fill: MUTED,
        fontSize: 11,
        fontWeight: 600,
        textAnchor: "end",
        dx: -10,
        ...HALO,
      }),
      Plot.dot(
        [
          { v: AT, w: side(AT) },
          { v: WIDE, w: side(WIDE) },
        ],
        { x: "v", y: "w", fill: ACCENT, r: 4 },
      ),
      Plot.text([{}], {
        x: MAX,
        y: main(MAX),
        text: () => "The card in the\nmain column",
        fill: PRIMARY,
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.35,
        textAnchor: "start",
        dx: 8,
        ...HALO,
      }),
      Plot.text([{}], {
        x: MAX,
        y: side(MAX),
        text: () => "The same card\nin the sidebar",
        fill: ACCENT,
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.35,
        textAnchor: "start",
        dx: 8,
        ...HALO,
      }),
      Plot.text([{}], {
        x: 360,
        y: 110,
        text: () => `narrower at ${WIDE}px than at ${AT}px`,
        fill: MUTED,
        fontSize: 11,
        fontWeight: 600,
        textAnchor: "start",
        ...HALO,
      }),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
