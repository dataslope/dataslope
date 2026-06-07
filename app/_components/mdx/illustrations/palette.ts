/**
 * Shared color tokens for the `/learn` SVG illustrations.
 *
 * Every illustration is a pure, static SVG that themes itself with **CSS
 * variables only** — no JavaScript, no `useTheme`, no flash on load. Two
 * families of token make that work:
 *
 *   1. Brand hues (`--ds-blue-500` … and friends from app/brand.css) are
 *      *mode-agnostic*: the exact same hex in light and dark mode. A blue
 *      shape reads as the same blue on a white page or a near-black one, so
 *      we can use them as flat fills without a light/dark variant.
 *
 *   2. Theme-aware neutrals (`currentColor` and the Fumadocs `--color-fd-*`
 *      tokens) flip with the active theme. We route every *structural* part
 *      of an illustration — outlines, hairlines, knockouts, incidental text —
 *      through these so the line-art inverts cleanly between modes.
 *
 * Because the brand fills never change between modes, any detail drawn *on
 * top* of a fill must use a FIXED ink chosen for that fill — not
 * `currentColor`, which would invert and disappear in one mode:
 *
 *   • `onFill`   — white; legible on the saturated mid/dark hues (blue, red,
 *                  teal, purple, orange, and the 600+ greens).
 *   • `onLight`  — near-black; for the light fills (yellow-500, the 100–300
 *                  tints, green-300/400) where white would vanish.
 *
 * Authoring rule of thumb:
 *   – Flat brand shape            → `style={{ fill: P.blue }}`
 *   – Line-art that must invert   → `style={{ stroke: P.ink }}` (currentColor)
 *   – A "hole" punched in a shape  → `style={{ fill: P.paper }}`
 *   – Glyph on a saturated fill    → `style={{ fill: P.onFill }}`
 *   – Glyph on a yellow/light fill → `style={{ fill: P.onLight }}`
 */
export const P = {
  // ── Brand primaries (mode-agnostic) ──────────────────────────────────
  blue: "var(--ds-blue-500)",
  green: "var(--ds-green-500)",
  red: "var(--ds-red-500)",
  yellow: "var(--ds-yellow-500)",

  // ── Decorative / categorical hues (non-semantic) ─────────────────────
  teal: "var(--ds-teal-500)",
  purple: "var(--ds-purple-500)",
  orange: "var(--ds-orange-500)",

  // ── Selected tints & shades (use sparingly, for depth/duotone) ───────
  blue100: "var(--ds-blue-100)",
  blue200: "var(--ds-blue-200)",
  blue300: "var(--ds-blue-300)",
  blue400: "var(--ds-blue-400)",
  blue600: "var(--ds-blue-600)",
  blue700: "var(--ds-blue-700)",
  blue800: "var(--ds-blue-800)",
  blue900: "var(--ds-blue-900)",

  green100: "var(--ds-green-100)",
  green300: "var(--ds-green-300)",
  green400: "var(--ds-green-400)",
  green600: "var(--ds-green-600)",
  green700: "var(--ds-green-700)",

  red100: "var(--ds-red-100)",
  red300: "var(--ds-red-300)",
  red400: "var(--ds-red-400)",
  red600: "var(--ds-red-600)",
  red700: "var(--ds-red-700)",

  yellow100: "var(--ds-yellow-100)",
  yellow300: "var(--ds-yellow-300)",
  yellow400: "var(--ds-yellow-400)",
  yellow600: "var(--ds-yellow-600)",
  yellow700: "var(--ds-yellow-700)",
  yellow800: "var(--ds-yellow-800)",

  teal300: "var(--ds-teal-300)",
  teal700: "var(--ds-teal-700)",
  purple300: "var(--ds-purple-300)",
  purple700: "var(--ds-purple-700)",
  orange300: "var(--ds-orange-300)",
  orange700: "var(--ds-orange-700)",

  // ── Theme-aware neutrals (flip with light/dark) ──────────────────────
  ink: "currentColor", // inherits prose text color → inverts per theme
  paper: "var(--color-fd-background)", // page background (knockouts)
  surface: "var(--color-fd-muted)", // faint panel / framed background
  line: "var(--color-fd-border)", // hairline dividers
  muted: "var(--color-fd-muted-foreground)", // de-emphasised marks

  // ── Fixed inks for drawing ON a mode-agnostic brand fill ─────────────
  onFill: "#ffffff", // white — on blue/red/teal/purple/orange/green-600+
  onLight: "var(--ds-gray-900)", // near-black — on yellow & light tints
} as const;

export type Ink = (typeof P)[keyof typeof P];
