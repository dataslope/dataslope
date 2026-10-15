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
export type Step = 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;

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
  accentInk: "var(--ds-blue-ink)",
  ok: ds("green"),
  okInk: "var(--ds-green-ink)",
  bad: ds("red"),
  badInk: "var(--ds-red-ink)",
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
