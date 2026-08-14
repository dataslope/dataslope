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
 * What `risograph` adds instead, for the inline figures that sit beside a
 * passage of history rather than at the top of a lesson.
 *
 * **Why a second style at all**, when the isometric rule is "do not
 * reintroduce one". Because these illustrate a different kind of thing. The
 * art that opens a lesson stands for its *idea* — a sorted stack, a call
 * stack, a marmot at a keyboard — and isometric props say that well. An inline
 * figure stands for something that *happened*: a launcher breaking up in 1996,
 * an orbiter coming in too low in 1999. Print stock and flat spot inks are the
 * register an editorial aside is drawn in, and they hold the two apart on the
 * page, which is the point of the pilot.
 *
 * **Flat inks, not shading.** The isometric block asks for volume; asking a
 * risograph for it too produces a plastic 3D render with grain sprinkled on
 * top, which is neither style. So the volume clauses are dropped here and
 * replaced with what actually makes a risograph legible: a few flat inks,
 * halftone texture inside the shapes, and the slight misregistration where two
 * inks overlap.
 *
 * **Still the brand palette, and still never black.** This is the transparency
 * constraint (AGENTS.md), not an aesthetic preference: the background is
 * removed after generation, so a cut-out drawn in one dark ink would read on
 * the white page and vanish on the near-black one. Risograph's usual
 * black-key line work is therefore banned outright.
 *
 * **Blank paper, no printed panel.** The reason AGENTS.md retired risograph
 * the first time is that a full-bleed riso scene has no isolable subject:
 * background removal returns the whole rectangle. Pinning the paper blank —
 * no frame, no border, no ground shadow — is what makes the subject liftable,
 * and it is the difference between this working and the earlier attempt.
 *
 * **A wide band.** These are generated at 1536x768 (`course-inline` in
 * `meta.sizes`), so the composition is asked for in the prompt too; a scene
 * composed square and letterboxed into a 2:1 frame wastes half the width.
 *
 * **No likenesses.** Several of these passages name a real person. The figures
 * are deliberately anonymous — an image model's attempt at a specific face is
 * both unreliable and not something to publish next to their name.
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

/** Constraint block per style. A style with no entry (the retired experiments:
 *  flat geometric vector, line art, blueprint schematic, cut-paper collage)
 *  falls back to the isometric block, which is what it got before this map
 *  existed. */
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
 * Build the exact GPT Image 2 generation prompt for an illustration spec, e.g.
 *
 *   An isometric illustration of a marmot waving beside a monitor. No text.
 *   Draw only the objects described — nothing scattered over, around, or
 *   behind them: no speckled dots, no confetti, no stray connecting lines.
 *   Render each object as a solid three-dimensional form with real thickness,
 *   smooth matte shading, and clean edges; never as a glossy sphere, a ball,
 *   or a thin round counter.
 *
 *   Blue: #148cff
 *   Green: #20c621
 *   Red: #ff4f59
 *   Yellow: #ffdd6c
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

/** Stable file stem (no extension) for a prompt id, e.g.
 *  "python-basics-thumbnail". Ids are authored slug-like already; this just
 *  normalises any stray casing/spacing. */
export function illustrationFileSlug(id: string): string {
  return slugify(id);
}

/** Target asset file name. GPT Image 2 returns raster PNGs. */
export function illustrationFileName(id: string): string {
  return `${illustrationFileSlug(id)}.png`;
}
