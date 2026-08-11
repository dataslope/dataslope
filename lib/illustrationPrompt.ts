/**
 * Shared, dependency-free helpers for the illustration-prompt system:
 *
 *   - the in-lesson `<IllustrationPrompt>` MDX card
 *     (app/_components/mdx/IllustrationPrompt.tsx),
 *   - the `/dashboard/admin/illustration-prompts` review gallery
 *     (lib/illustrationPromptsGallery.ts), and
 *   - the batch image generator (scripts/generate-illustrations.mjs).
 *
 * All three read the same prompt definitions from `data/illustration-prompts.json`
 * and build the exact generation prompt through `buildIllustrationPrompt` here,
 * so the card, the gallery, and the generated PNG all agree on the prompt text
 * and the target file name. One source of truth, no per-call-site duplication.
 *
 * The prompts target OpenAI's GPT Image 2 and follow the Dataslope house style:
 * an isometric illustration of a subject, rendered in the four brand colors. See
 * `data/illustration-prompts.json` `meta.brandColors`.
 *
 * Pure (no Node/DOM APIs) so it can be imported from a client component, a
 * server component, and a plain Node build script alike.
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

/** The house illustration style when a prompt does not name its own.
 *  Isometric is the default because it was the one style that survived every
 *  test: it isolates a subject cleanly, reads on both page backgrounds, and
 *  cuts out reliably. It is the only style used for the art that opens a
 *  lesson; the one other style with constraints of its own is `risograph`,
 *  reserved for the inline figures that sit beside a passage of history. See
 *  the "Illustrations" section of AGENTS.md. */
export const DEFAULT_STYLE = "isometric illustration";

/** Style name for the in-body historical figures. */
export const RISOGRAPH_STYLE = "risograph";

/** The minimal shape needed to build a generation prompt. */
export interface IllustrationSpec {
  /** What to illustrate, phrased to read naturally after "An isometric
   *  illustration of " (e.g. "a marmot waving beside a monitor"). */
  subject: string;
  /** Illustration style descriptor, inserted after the article, e.g.
   *  "isometric illustration" (default) or "risograph". Those two are the
   *  only styles with constraints written for them; the others tried (flat
   *  geometric vector, line art, blueprint schematic, cut-paper collage) are
   *  discouraged and fall back to the isometric constraints, see AGENTS.md. */
  style?: string;
}

/** "An" before a vowel-initial style ("isometric"), "A" otherwise. */
function article(style: string): string {
  return /^[aeiou]/i.test(style) ? "An" : "A";
}

/**
 * The two constraints every generated illustration carries, whatever its
 * subject and whatever its style.
 *
 * **No text** because none of the illustrations should carry lettering (the
 * model bakes in garbled text otherwise).
 *
 * **Nothing beyond the objects described**, because the previous wording of
 * this rule — "draw dots, markers, and nodes as flat 2D circles" — named three
 * things to draw in all 879 prompts, including the ones with no dot, marker, or
 * node anywhere in the subject. An image model reads a named noun as content,
 * so it supplied them: a chest of drawers came back with a colored dot on
 * every corner, a folder wore a constellation of dots joined by thin lines, and
 * a press had confetti scattered across its base. The clutter was not coming
 * from the subjects; it was coming from here.
 */
const SHARED_CONSTRAINTS =
  "No text. Draw only the objects described — nothing scattered over, around, " +
  "or behind them: no speckled dots, no confetti, no stray connecting lines.";

/**
 * What the isometric house style adds to those two, and what every prompt
 * authored before the risograph pilot carries verbatim.
 *
 * **Solid 3D forms**, because the same sentence asked for "flat 2D circles" and
 * flattened whole scenes with it. Isometric is the house style *because* it has
 * volume (AGENTS.md, "Illustrations"), so the constraint now says so outright
 * rather than pulling against it.
 *
 * The glossy-sphere guard survives, since it was a real failure — scatter dots,
 * chart markers and tree nodes rendering as a bag of marbles. What does NOT
 * survive is the cure: telling the model to draw round elements "as low solid
 * discs" was a positive instruction naming a shape, the same mistake as the
 * "draw dots as flat 2D circles" line that once littered every scene. It duly
 * drew discs everywhere — rows of colored coins standing in for data points,
 * cells, and steps — until a reviewer asked why everything looked like tokens.
 * The rule is now purely prohibitive: no spheres, no balls, no thin counters,
 * and no opinion about what a round thing should be instead. Subjects that
 * genuinely need a round object name one.
 *
 * **Light staging** because asking for solid form on its own overshot: the
 * first run under this rule came back as glossy plastic toys on heavy charcoal
 * plinths. The house look has always been bright colors on pale grey and white
 * platforms (see any illustration predating the regeneration rounds), so the
 * background and the plinths are pinned here rather than left to each subject
 * to remember — "heavy base" in a subject is otherwise taken literally.
 *
 * **One piece, one color**, because the model cannot hold an assembly together.
 * Anything described as built from or filled with many small units — a cube made
 * of cubelets, a bin packed with blocks, a tower of stacked cubes — comes back
 * with the units fused, notched, or half-melted into each other, and their
 * colors bleeding into shades that are not in the palette at all (a four-color
 * brand returning an orange face). The failure is the *assembly*, not the count:
 * three large blocks side by side render perfectly, while the same volume drawn
 * as forty cubelets does not. So each object is one solid piece in one flat
 * brand color, and a container holds a few large items rather than a heap.
 *
 * **Animals are exempt from the color half of that rule.** Without the
 * exception the model reads a creature as one more object and paints it a flat
 * brand color: a run of 60 creature illustrations came back with 15 of them
 * carrying a solid blue marmot, a blue owl, and a green marmot. Fur, feathers
 * and skin keep their own colors; only the props obey the palette.
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
