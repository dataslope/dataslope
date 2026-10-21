// Brand colors come from the site's own token file, so a video can never drift
// from the palette in AGENTS.md. Reference them as CSS variables; never write
// a hex value in a scene.
import "../../../app/brand.css";

/** `var(--ds-<hue>-<step>)` for one step of a brand ramp. */
export const ds = (hue: Hue, step: Step = 500) => `var(--ds-${hue}-${step})`;

export type Hue =
  | "blue"
  | "green"
  | "red"
  | "yellow"
  | "teal"
  | "purple"
  | "orange"
  | "gray";
/** Every step app/brand.css defines. Blue alone has the 550-950 half-steps
 *  and 950; the rest stop at 900. */
export type Step =
  | 50
  | 100
  | 200
  | 300
  | 400
  | 500
  | 550
  | 600
  | 650
  | 700
  | 750
  | 800
  | 850
  | 900
  | 950;

/**
 * Each hue as type on the white page: its brand 500 wherever that clears 3:1
 * on white, the WCAG bar for large text, which every label in a video meets.
 * Blue, red, purple and orange do. Green, teal and yellow fall short at 500
 * (2.3, 2.8 and 1.3:1) and take the nearest step that clears it. The site's
 * `--ds-*-ink` anchors are darker still, because they are set for 4.5:1 body
 * text; on a video's page they read as off-brand shades of the hue.
 */
export const inkOf = {
  blue: ds("blue"),
  red: ds("red"),
  purple: ds("purple"),
  orange: ds("orange"),
  green: ds("green", 600),
  teal: ds("teal", 600),
  yellow: ds("yellow", 700),
} as const;

/**
 * The roles the videos share. Green, red and yellow keep their site meaning
 * (works, fails, look here); teal, purple and orange are non-semantic and only
 * tell categories apart.
 */
export const colors = {
  page: "var(--ds-white)",
  surface: ds("gray", 50),
  line: ds("gray", 200),
  ink: ds("gray", 900),
  inkSoft: ds("gray", 600),
  inkFaint: ds("gray", 400),
  accent: ds("blue"),
  accentInk: inkOf.blue,
  ok: ds("green"),
  okInk: inkOf.green,
  bad: ds("red"),
  badInk: inkOf.red,
  highlight: ds("yellow"),
  /** Code panels: the site's dark surface, so code reads like the editor. */
  codeBg: ds("gray", 900),
  codeInk: ds("gray", 100),
  codeDim: ds("gray", 500),
} as const;

/** Four categorical colors for series (groups, customers, files…). */
export const categorical = [ds("blue"), ds("teal"), ds("purple"), ds("orange")];

/** Code-token colors on the dark code panel (the `400` steps read on it). */
export const syntax = {
  keyword: ds("blue", 400),
  fn: ds("purple", 300),
  string: ds("green", 400),
  number: ds("orange", 300),
  operator: ds("gray", 300),
  plain: ds("gray", 100),
  comment: ds("gray", 500),
} as const;
