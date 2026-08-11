/**
 * The same four groups as `groups-by-colour-one-panel`, one per panel.
 *
 * Nothing has been added and nothing removed: the points, the colours, the
 * fitted lines and both scales are identical. The only change is that the
 * grouping variable has stopped being a colour and become a *position* — which
 * panel a point is in — and that is enough to make each maker's own slope
 * readable, because reading one no longer means ignoring three others.
 *
 * Two by two rather than one by four, and four groups rather than a dozen:
 * this figure is about what faceting does to a group mapping, so the grid is
 * the smallest one that is still a grid. The figure about small multiples at
 * scale, with the tangle ghosted behind every panel, is `spaghetti-vs-facets`.
 *
 * The panels are titled by a text mark rather than by the facet axes. Plot puts
 * `fx` titles across the top and `fy` titles down the right, so a two-by-two
 * grid faceted on a row key and a column key would be labelled "left / right"
 * and "top / bottom" — the layout, not the data. Both facet axes are therefore
 * off and each panel carries its own name.
 */
import { Plot, plot, HALO, MUTED } from "./_theme.mjs";
import {
  MAKER_CELL,
  MAKER_COLOR,
  MAKER_KEYS,
  MAKER_SLOPE,
  FITS,
  POINTS,
  X_DOMAIN,
  Y_DOMAIN,
} from "./_makers.mjs";

export const title =
  "The same 136 cars as the previous chart, split into a two-by-two grid of panels, one manufacturer each, on the same pair of axes. Each panel holds one point cloud and one fitted line, and the four slopes, steep for the first maker and nearly flat for the fourth, are now readable one at a time.";

export const caption =
  "The same points, the same colours, the same axes: the only change is that the maker is now a position (which panel) rather than a hue. Because every panel is scaled identically, a difference between panels is a difference in the data: Northwind loses 4.8 mpg per extra litre and Brightside only 1.0, which was in the chart above as well and could not be read there.";

const cell = (k) => MAKER_CELL[k];
const withCell = (rows) => rows.map((d) => ({ ...d, ...cell(d.key) }));

const PANEL_POINTS = withCell(POINTS);
const PANEL_FITS = withCell(FITS);
const PANEL_LABELS = MAKER_KEYS.map((key) => ({ key, ...cell(key) }));

export function render() {
  return plot({
    height: 420,
    marginTop: 22,
    marginLeft: 54,
    marginRight: 16,
    marginBottom: 46,
    ariaLabel: title,
    fx: { domain: ["left", "right"], axis: null },
    fy: { domain: ["top", "bottom"], axis: null },
    x: { label: "Engine size (litres)", labelAnchor: "center", domain: X_DOMAIN, ticks: 5 },
    y: { label: "Highway mpg", domain: Y_DOMAIN, ticks: 4 },
    marks: [
      Plot.frame({ stroke: "currentColor", strokeOpacity: 0.1 }),
      Plot.dot(PANEL_POINTS, {
        fx: "col",
        fy: "row",
        x: "displ",
        y: "hwy",
        fill: (d) => MAKER_COLOR[d.key],
        fillOpacity: 0.8,
        r: 3.2,
        clip: true,
      }),
      Plot.line(PANEL_FITS, {
        fx: "col",
        fy: "row",
        x: "displ",
        y: "hwy",
        z: "key",
        stroke: (d) => MAKER_COLOR[d.key],
        strokeWidth: 2.5,
        clip: true,
      }),
      Plot.text(PANEL_LABELS, {
        fx: "col",
        fy: "row",
        x: X_DOMAIN[0] + 0.2,
        y: Y_DOMAIN[1] - 1.6,
        text: "key",
        fill: (d) => MAKER_COLOR[d.key],
        fontSize: 12,
        fontWeight: 600,
        textAnchor: "start",
        ...HALO,
      }),
      Plot.text(PANEL_LABELS, {
        fx: "col",
        fy: "row",
        x: X_DOMAIN[1] - 0.2,
        y: Y_DOMAIN[0] + 1.6,
        text: (d) => `${MAKER_SLOPE[d.key].toFixed(1)} mpg per litre`,
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "end",
        ...HALO,
      }),
    ],
  });
}
