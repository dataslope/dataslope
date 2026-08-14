/**
 * Shared helpers for the illustration-prompt system. The MDX card, the admin
 * review gallery, and the batch generator all build prompts through
 * `buildIllustrationPrompt` from `data/illustration-prompts.json`, so prompt
 * text and file names agree everywhere. Pure (no Node/DOM APIs) so it can be
 * imported from client, server, and build-script code alike.
 */

/** The four Dataslope brand colors, as named in every generation prompt. */
export interface BrandColors {
  blue: string;
  green: string;
  red: string;
  yellow: string;
}

/** Default Dataslope brand palette (see app/brand.css `--ds-*-500` tokens). */
export const BRAND_COLORS: BrandColors = {
  blue: "#148cff",
  green: "#20c621",
  red: "#ff4f59",
  yellow: "#ffdd6c",
};

/** House illustration style when a prompt does not name its own. Risograph is
 *  the only other style with its own constraints (see AGENTS.md,
 *  "Illustrations"). */
export const DEFAULT_STYLE = "isometric illustration";

/** Style name for the in-body historical figures. */
export const RISOGRAPH_STYLE = "risograph";

/** The minimal shape needed to build a generation prompt. */
export interface IllustrationSpec {
  /** What to illustrate, phrased to read naturally after "An isometric
   *  illustration of " (e.g. "a marmot waving beside a monitor"). */
  subject: string;
  /** Style descriptor, e.g. "isometric illustration" (default) or
   *  "risograph"; other styles fall back to the isometric constraints. */
  style?: string;
}

/** "An" before a vowel-initial style ("isometric"), "A" otherwise. */
function article(style: string): string {
  return /^[aeiou]/i.test(style) ? "An" : "A";
}

/**
 * Constraints every prompt carries. "No text" avoids garbled baked-in
 * lettering. The phrasing must stay purely prohibitive: the image model reads
 * any named noun as content to draw (a former "draw dots ... as flat 2D
 * circles" wording scattered dots and confetti across every scene).
 */
const SHARED_CONSTRAINTS =
  "No text. Draw only the objects described — nothing scattered over, around, " +
  "or behind them: no speckled dots, no confetti, no stray connecting lines.";

/**
 * Isometric house-style constraints. Each rule guards a real model failure:
 * the sphere/ball ban is prohibitive-only because naming a replacement shape
 * ("low solid discs") made the model draw discs everywhere; light staging is
 * pinned because "solid form" alone came back as toys on charcoal plinths;
 * one piece / one flat color because assemblies of small units render fused
 * with off-palette color bleed; animals are exempt from the color rule
 * because a flat brand color otherwise gets applied to creatures too.
 */
const ISOMETRIC_CONSTRAINTS =
  "Render each object as a solid three-dimensional form with real thickness, " +
  "smooth matte shading, and clean edges; never as a glossy sphere, a ball, or " +
  "a thin round counter. " +
  "Stage everything light and airy on a white background: pale grey and white " +
  "platforms, bright brand colors, no dark or black bases. Make every object a " +
  "single solid piece in one flat brand color: never build one object out of " +
  "many small blocks or cubelets, never pack a container with a heap of little " +
  "pieces, and never blend, mix, or bleed two colors into each other. Animals " +
  "are the exception and the focal point: draw each one as a rounded, " +
  "realistic creature with soft fur or feather texture and its own natural " +
  "coloring and markings, never a flat brand color and never a flat " +
  "silhouette. A bird has wings, a beak and feet and never hands or arms: it " +
  "perches, stands, or nudges things with its beak rather than holding them.";

/**
 * Risograph constraints, for inline historical figures. Flat inks, never
 * volume (asking a riso for volume yields a plastic render with grain on
 * top). Never black: the background is removed after generation, and a
 * dark-ink cutout vanishes on the near-black page. Blank paper — no panel,
 * frame, or shadow — is what makes the subject liftable by background
 * removal. Composed as a wide band to fill the 1536x768 `course-inline`
 * size. No likenesses of real people.
 */
const RISOGRAPH_CONSTRAINTS =
  "Print it as a risograph: a few flat spot-color inks, coarse halftone grain " +
  "inside every inked shape, and slight misregistration where two inks " +
  "overlap. No gradients, no photographic shading, no glossy highlights. " +
  "Ink every shape in one of the brand colors below and let two inks overprint " +
  "into a third; never key the scene off black, grey, or a single hue, and " +
  "never outline in black. Leave the paper blank white behind and between the " +
  "shapes: no printed panel, no frame, no border, no ground shadow, so the " +
  "whole subject lifts off the page in one piece. Compose it as a wide band " +
  "twice as long as it is tall, reading left to right across the full width " +
  "rather than centered in the middle. Draw any person as a small stylized " +
  "figure with minimal facial detail and no resemblance to a real individual.";

/** Constraint block per style; styles with no entry (retired experiments)
 *  fall back to the isometric block. */
const STYLE_CONSTRAINTS: Record<string, string> = {
  [DEFAULT_STYLE]: ISOMETRIC_CONSTRAINTS,
  [RISOGRAPH_STYLE]: RISOGRAPH_CONSTRAINTS,
};

/** The full constraint text for a style: the two shared rules, then the
 *  style's own. */
function constraintsFor(style: string): string {
  return `${SHARED_CONSTRAINTS} ${STYLE_CONSTRAINTS[style] ?? ISOMETRIC_CONSTRAINTS}`;
}

/**
 * Build the exact GPT Image 2 generation prompt for a spec:
 * "<Article> <style> of <subject>. <constraints>" plus the brand color lines.
 */
export function buildIllustrationPrompt(
  spec: IllustrationSpec,
  colors: BrandColors = BRAND_COLORS,
): string {
  const style = spec.style?.trim() || DEFAULT_STYLE;
  return (
    `${article(style)} ${style} of ${spec.subject}. ${constraintsFor(style)}\n\n` +
    `Blue: ${colors.blue}\n` +
    `Green: ${colors.green}\n` +
    `Red: ${colors.red}\n` +
    `Yellow: ${colors.yellow}`
  );
}

/** Lowercase, strip diacritics, and hyphenate to a URL/file-safe slug. */
export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Stable file stem (no extension) for a prompt id. */
export function illustrationFileSlug(id: string): string {
  return slugify(id);
}

/** Target asset file name. GPT Image 2 returns raster PNGs. */
export function illustrationFileName(id: string): string {
  return `${illustrationFileSlug(id)}.png`;
}
