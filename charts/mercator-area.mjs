/**
 * Why a Mercator map is not a picture of how big anywhere is.
 *
 * Mercator is conformal: it preserves angles, which is what made it a
 * navigator's projection, and it pays for that by stretching both directions by
 * sec(latitude). Area therefore scales as sec²(latitude), a factor that is 1 at
 * the equator, about 2 by 45°, and past 8 in the latitudes Greenland occupies.
 *
 * The curve is that factor, drawn. The bars underneath are what it does to
 * places people actually have intuitions about: how many times its true size
 * each is drawn, computed from the centroid latitude rather than asserted.
 *
 * Greenland is the standard example, and the standard example is not an
 * exaggeration: at 72°N a shape is drawn about ten times its true area, which
 * is why it comes out looking like Africa despite being a fourteenth of it.
 *
 * The bars are on the same figure as the curve, in pixel space, because the
 * two share an x meaning (latitude) and nothing else: one is a ratio and the
 * other is a place. Facets share every scale, so they cannot be panels.
 */
import { Plot, plot, linspace, sidedText, ACCENT, GUIDE, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "The Mercator area-inflation factor against latitude, rising from one at the equator to about ten at seventy degrees, with several countries marked at their own latitudes to show how many times their true size each is drawn.";

/** Area inflation on Mercator: the projection stretches both axes by
 *  sec(latitude), so area goes as its square. */
const inflation = (deg) => 1 / Math.cos((deg * Math.PI) / 180) ** 2;

const PLACES = [
  { name: "Greenland", lat: 72 },
  { name: "Sweden", lat: 62 },
  { name: "Britain", lat: 54 },
  { name: "United States", lat: 40 },
  { name: "Kenya", lat: 1 },
  // Five places, not more: at this width a sixth label lands on top of its
  // neighbour in the flat part of the curve, where they are closest together.
].map((p) => ({ ...p, factor: inflation(p.lat) }));

const GREENLAND = PLACES[0];

export const caption =
  `Mercator preserves angles, and pays for it in area: everything is drawn sec²(latitude) times its true size. At the equator that is 1. At ${GREENLAND.lat}°, where Greenland sits, it is about ${GREENLAND.factor.toFixed(0)}, which is why Greenland comes out looking like Africa while being roughly a fourteenth of it.`;

// Stopped at 75°: past that the curve is vertical and the extra headroom just
// squashes everything the labels are attached to.
const MAX_LAT = 75;
const CURVE = linspace(0, MAX_LAT, 160).map((lat) => ({ lat, factor: inflation(lat) }));
const YMAX = inflation(MAX_LAT);

export function render() {
  return plot({
    height: 360,
    marginTop: 32,
    marginLeft: 58,
    marginRight: 96,
    marginBottom: 48,
    ariaLabel: title,
    x: { label: "Latitude (degrees)", labelAnchor: "center", domain: [0, MAX_LAT], ticks: 6 },
    y: {
      label: "Times its true area",
      domain: [0, YMAX],
      ticks: [1, 5, 10, 15],
      tickFormat: (d) => `${d}×`,
    },
    marks: [
      Plot.areaY(CURVE, {
        x: "lat",
        y: "factor",
        fill: PRIMARY,
        fillOpacity: 0.14,
        clip: true,
      }),
      Plot.line(CURVE, { x: "lat", y: "factor", stroke: PRIMARY, strokeWidth: 2, clip: true }),

      // True size at the equator: the line every other value is a multiple of.
      Plot.ruleY([1], { stroke: MUTED, strokeWidth: 1.5, strokeDasharray: "4,3" }),
      Plot.text([{}], {
        x: MAX_LAT,
        y: 1,
        text: () => "true size",
        fill: MUTED,
        fontSize: 11,
        fontWeight: 600,
        textAnchor: "end",
        dy: -9,
        ...HALO,
      }),

      // Dropped verticals rather than dots alone: the reading is "this latitude
      // costs this much", and the eye needs the path down to the axis.
      Plot.ruleX(PLACES, {
        x: "lat",
        y1: 0,
        y2: "factor",
        stroke: GUIDE,
        strokeOpacity: 0.55,
      }),
      Plot.dot(PLACES, { x: "lat", y: "factor", fill: ACCENT, r: 4 }),
      // `textAnchor` is a constant channel, so the two sides are two marks:
      // a function here is stringified into the attribute and dropped.
      ...sidedText(
        PLACES,
        {
          x: "lat",
          y: "factor",
          text: (d) => `${d.name}  ${d.factor.toFixed(1)}×`,
          fill: MUTED,
          fontSize: 10.5,
          fontWeight: 600,
          dy: -8,
          ...HALO,
          // Near the equator there is no room to the left of the point.
          side: (d) => (d.lat < 25 ? "start" : "end"),
        },
        { start: { dx: 8 }, end: { dx: -8 } },
      ),

      Plot.text([GREENLAND], {
        x: "lat",
        y: "factor",
        text: () => "drawn about ten times\nits real area",
        fill: ACCENT,
        fontSize: 11,
        fontWeight: 600,
        lineHeight: 1.3,
        textAnchor: "end",
        dx: -10,
        dy: 26,
        ...HALO,
      }),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
