import { colors, ds } from "../../theme/brand";

export const VIDEO = "event-loop";

/** `color-mix()` of a brand color with transparent (or another color). */
export const mix = (color: string, pct: number, other = "transparent") =>
  `color-mix(in srgb, ${color} ${pct}%, ${other})`;

const blue950 = ds("blue", 950);

/**
 * The blueprint's inks. Paper is the deep end of the blue ramp; every line is
 * a pale tint (blue-100 / blue-200 / teal-200), the way a print reads white
 * on cyanotype. Yellow keeps its site meaning ("look here"), and red is the
 * checker's red pen, used only for the one "not now" markup.
 */
export const BP = {
  paper: ds("blue", 900),
  paperDeep: blue950,
  /** Primary linework and lettering. */
  line: ds("blue", 100),
  /** Secondary linework: frames, ticks, row guides. */
  line2: ds("blue", 200),
  /** Construction and leader lines. */
  faint: mix(ds("blue", 200), 42),
  /** Pale cyan: whatever is moving or active right now. */
  cyan: ds("teal", 200),
  white: colors.page,
  /** The palest flat wash inside a drafted box. */
  wash: mix(ds("blue", 100), 9),
  washStrong: mix(ds("blue", 100), 16),
  mark: ds("yellow", 300),
  red: ds("red", 300),
  grid: mix(colors.page, 6),
  gridMajor: mix(colors.page, 13),
} as const;

// Sheet geometry (1080p CSS px). The drawing border's inner line, and the
// title block that sits in its bottom-right corner, next to the caption strip.
export const SHEET = {
  w: 1920,
  h: 1080,
  outer: 14,
  inner: 36,
  titleBlock: { x: 1420, y: 912, w: 464, h: 132 },
} as const;
