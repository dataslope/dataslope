/**
 * The Dataslope mark's geometry, from the site's own
 * public/dataslope-logo-blue.svg (copied as public/brand/dataslope-logo-blue.svg),
 * so anything that animates the mark draws the real file rather than a
 * look-alike. Plain TypeScript with no JSX: the series intro and the logo
 * reveals both draw from it.
 *
 * The mark is two mirrored slopes that share a peak. Each one is, in effect,
 * a single round-capped stroke 272 units wide laid along a curve from its
 * foot to the peak: that curve is SPINE, measured from the file (the band is
 * 271.6 to 273.0 units across along its whole length), which is what lets a
 * reveal draw a slope as a pen stroke, or scatter points inside it.
 */

/** The file's viewBox. */
export const VIEW = { w: 1087.59, h: 682.55 } as const;

/** The slope that runs from the peak down to the left foot. */
export const LEFT =
  "M679.63,139.57c.05-1.45.06-2.21.06-3.67C679.69,60.84,618.85,0,543.79,0s-132.49,57.51-135.75,129.67h0s-2.99,129.29-85.67,205.52c-73.47,67.75-167.89,74.85-188,75.59-1.2.01-2.39.04-3.58.09-.2,0-.3,0-.3,0h0C57.94,413.72,0,473.42,0,546.66s60.84,135.89,135.89,135.89c3.22,0,6.41-.12,9.57-.34h0s278.11,3.51,437.31-237.01c100.12-151.26,96.85-304.24,96.85-304.24v-1.4Z";
/** Its mirror image, down to the right foot. */
export const RIGHT =
  "M407.96,139.57c-.05-1.45-.06-2.21-.06-3.67C407.91,60.84,468.75,0,543.8,0s132.49,57.51,135.75,129.67h0s2.99,129.29,85.67,205.52c73.47,67.75,167.89,74.85,188,75.59,1.2.01,2.39.04,3.58.09.2,0,.3,0,.3,0h0c72.55,2.85,130.49,62.55,130.49,135.79s-60.84,135.89-135.89,135.89c-3.22,0-6.41-.12-9.57-.34h0s-278.11,3.51-437.31-237.01c-100.12-151.26-96.85-304.24-96.85-304.24v-1.4Z";

/** The file's radial gradients: [offset, opacity] of the one color. */
export const LEFT_GRADIENT = { cx: 339.84, cy: 341.28, r: 340.56 } as const;
export const LEFT_STOPS: readonly [number, number][] = [
  [0.19, 0.6],
  [0.32, 0.62],
  [0.51, 0.69],
  [0.72, 0.81],
  [0.96, 0.97],
  [1, 1],
];
export const RIGHT_GRADIENT = { cx: 798.17, cy: 382.86, r: 318.51 } as const;
export const RIGHT_STOPS: readonly [number, number][] = [
  [0.14, 1],
  [0.34, 0.89],
  [0.76, 0.68],
  [0.96, 0.6],
];

/** How wide each slope's band is, in viewBox units. */
export const BAND = 272;

/** Where the two slopes meet: the centre of the round cap at the peak. */
export const PEAK = [543.8, 135.9] as const;

/**
 * The left slope's centre line, from its foot up to the peak, as 25 points
 * evenly spaced along it (642 units long). Measured as the midpoints between
 * the slope's two edges, so a stroke BAND wide along it covers the slope.
 */
export const SPINE: readonly (readonly [number, number])[] = [
  [135.9, 546.7], [162.6, 545.2], [189.1, 541.8], [215.4, 536.9], [241.4, 530.5],
  [266.9, 522.6], [292, 513.2], [316.4, 502.3], [340.1, 489.9], [362.9, 476],
  [384.7, 460.6], [405.5, 443.6], [424.9, 425.3], [443, 405.6], [459.5, 384.6],
  [474.6, 362.4], [488.1, 339.4], [500.2, 315.5], [510.8, 291], [519.9, 265.8],
  [527.6, 240.2], [534, 214.2], [538.9, 187.9], [542.3, 161.4], [543.8, 135.9],
];

/** The right slope's centre line, from the peak down to its foot. */
export const SPINE_RIGHT = [...SPINE].reverse().map(([x, y]) => [VIEW.w - x, y] as const);

/** A polyline through points, as SVG path data. */
export const polyline = (pts: readonly (readonly [number, number])[]) =>
  pts.map(([x, y], i) => `${i ? "L" : "M"}${x},${y}`).join(" ");
