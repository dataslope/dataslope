/**
 * Four groups mapped to colour in one frame: the state faceting is the answer
 * to, drawn before the answer.
 *
 * Colour is a perfectly good channel for a grouping variable right up to the
 * point where the groups overlap. Here they do: four clouds of points sharing
 * the same band, four fitted lines leaving the same corner, and a legend the
 * eye has to keep travelling back to. Every maker's own trend is present in
 * the picture and none of them is readable, because reading one means mentally
 * deleting the other three.
 *
 * Its pair, `groups-in-a-facet-grid`, draws the identical points with the
 * identical scales and does nothing but give each maker its own frame.
 */
import { Plot, plot, HALO, MUTED } from "./_theme.mjs";
import { FITS, MAKER_COLOR, MAKER_KEYS, POINTS, X_DOMAIN, Y_DOMAIN } from "./_makers.mjs";

export const title =
  "One scatter of engine size against highway fuel economy for 136 cars from four manufacturers, told apart only by colour. All four clouds occupy the same band and their four fitted lines leave the same corner, so no single manufacturer's trend can be read on its own.";

export const caption =
  "Highway fuel economy against engine size for 136 cars from four invented manufacturers, with the manufacturer mapped to colour. That works while the groups sit in different parts of the chart and stops the moment they overlap: each of these four gives up a different amount of economy per extra litre, and picking any one of them out means ignoring the other three at the same time.";

const SPAN = X_DOMAIN[1] - X_DOMAIN[0];
/** Legend entries laid out as fractions of the x domain rather than at fixed
 *  data values, so changing the domain cannot push the last one off frame. */
const LEGEND = MAKER_KEYS.map((key, i) => ({ key, x: X_DOMAIN[0] + SPAN * (0.02 + i * 0.25) }));

export function render() {
  return plot({
    height: 330,
    marginTop: 30,
    marginLeft: 54,
    marginRight: 16,
    marginBottom: 46,
    ariaLabel: title,
    x: { label: "Engine size (litres)", labelAnchor: "center", domain: X_DOMAIN },
    y: { label: "Highway mpg", domain: Y_DOMAIN },
    marks: [
      Plot.dot(POINTS, {
        x: "displ",
        y: "hwy",
        fill: (d) => MAKER_COLOR[d.key],
        fillOpacity: 0.75,
        r: 3.2,
        clip: true,
      }),
      Plot.line(FITS, {
        x: "displ",
        y: "hwy",
        z: "key",
        stroke: (d) => MAKER_COLOR[d.key],
        strokeWidth: 2.5,
        clip: true,
      }),
      // A legend rather than direct labels, because a direct label needs
      // somewhere uncrowded to sit and this chart has nowhere: having to look
      // the colours up is part of what it is demonstrating.
      Plot.dot(LEGEND, {
        x: "x",
        y: Y_DOMAIN[1] - 1.2,
        fill: (d) => MAKER_COLOR[d.key],
        r: 3.5,
      }),
      Plot.text(LEGEND, {
        x: (d) => d.x + SPAN * 0.022,
        y: Y_DOMAIN[1] - 1.2,
        text: "key",
        fill: (d) => MAKER_COLOR[d.key],
        fontSize: 11,
        fontWeight: 600,
        textAnchor: "start",
        ...HALO,
      }),
      Plot.text([{}], {
        x: X_DOMAIN[1] - 0.1,
        y: Y_DOMAIN[0] + 1.4,
        text: () => "four different trends are in here",
        fill: MUTED,
        fontSize: 11,
        fontWeight: 600,
        textAnchor: "end",
        ...HALO,
      }),
    ],
  });
}
