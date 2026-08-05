/**
 * Shared, dependency-free helpers for the illustration-prompt system:
 *
 *   - the in-lesson `<IllustrationPrompt>` MDX card
 *     (app/_components/mdx/IllustrationPrompt.tsx),
 *   - the `/illustration-prompts` review gallery
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
 *  cuts out reliably. Risograph is reserved for simple mascot moments; see
 *  the "Illustrations" section of AGENTS.md. */
export const DEFAULT_STYLE = "isometric illustration";

/** The minimal shape needed to build a generation prompt. */
export interface IllustrationSpec {
  /** What to illustrate, phrased to read naturally after "An isometric
   *  illustration of " (e.g. "a marmot waving beside a monitor"). */
  subject: string;
  /** Illustration style descriptor, inserted after the article, e.g.
   *  "isometric illustration" (default) or "risograph". The other styles
   *  tried (flat geometric vector, line art, blueprint schematic, cut-paper
   *  collage) are discouraged, see AGENTS.md. */
  style?: string;
}

/** "An" before a vowel-initial style ("isometric"), "A" otherwise. */
function article(style: string): string {
  return /^[aeiou]/i.test(style) ? "An" : "A";
}

/**
 * Constraints every generated illustration carries, whatever its subject.
 *
 * **No text** because none of the illustrations should carry lettering (the
 * model bakes in garbled text otherwise).
 *
 * **Nothing beyond the objects described**, because the previous wording of
 * this rule — "draw dots, markers, and nodes as flat 2D circles" — named three
 * things to draw in all 879 prompts, including the ones with no dot, marker, or
 * node anywhere in the subject. An image model reads a named noun as content,
 * so it supplied them: a chest of drawers came back with a coloured dot on
 * every corner, a folder wore a constellation of dots joined by thin lines, and
 * a press had confetti scattered across its base. The clutter was not coming
 * from the subjects; it was coming from here.
 *
 * **Solid 3D forms**, because the same sentence asked for "flat 2D circles" and
 * flattened whole scenes with it. Isometric is the house style *because* it has
 * volume (AGENTS.md, "Illustrations"), so the constraint now says so outright
 * rather than pulling against it.
 *
 * The glossy-sphere guard survives, since it was a real failure — scatter dots,
 * chart markers and tree nodes rendering as a bag of marbles. It is phrased as
 * a treatment for round elements *the subject already calls for*, not as an
 * instruction to include any, and "low solid discs" keeps them three-
 * dimensional instead of trading marbles for stickers.
 *
 * **Light staging** because asking for solid form on its own overshot: the
 * first run under this rule came back as glossy plastic toys on heavy charcoal
 * plinths. The house look has always been bright colours on pale grey and white
 * platforms (see any illustration predating the regeneration rounds), so the
 * background and the plinths are pinned here rather than left to each subject
 * to remember — "heavy base" in a subject is otherwise taken literally.
 *
 * **One piece, one colour**, because the model cannot hold an assembly together.
 * Anything described as built from or filled with many small units — a cube made
 * of cubelets, a bin packed with blocks, a tower of stacked cubes — comes back
 * with the units fused, notched, or half-melted into each other, and their
 * colours bleeding into shades that are not in the palette at all (a four-colour
 * brand returning an orange face). The failure is the *assembly*, not the count:
 * three large blocks side by side render perfectly, while the same volume drawn
 * as forty cubelets does not. So each object is one solid piece in one flat
 * brand colour, and a container holds a few large items rather than a heap.
 *
 * **Animals are exempt from the colour half of that rule.** Without the
 * exception the model reads a creature as one more object and paints it a flat
 * brand colour: a run of 60 creature illustrations came back with 15 of them
 * carrying a solid blue marmot, a blue owl, and a green marmot. Fur, feathers
 * and skin keep their own colours; only the props obey the palette.
 */
const GLOBAL_CONSTRAINTS =
  "No text. Draw only the objects described — nothing scattered over, around, " +
  "or behind them: no speckled dots, no confetti, no stray connecting lines. " +
  "Render each object as a solid three-dimensional form with real thickness, " +
  "smooth matte shading, and clean edges; draw any repeated round elements the " +
  "subject calls for as low solid discs, never as glossy spheres or balls. " +
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
 * Build the exact GPT Image 2 generation prompt for an illustration spec, e.g.
 *
 *   An isometric illustration of a marmot waving beside a monitor. No text.
 *   Draw only the objects described — nothing scattered over, around, or
 *   behind them: no speckled dots, no confetti, no stray connecting lines.
 *   Render each object as a solid three-dimensional form with real thickness,
 *   flat matte shading, and clean edges; draw any repeated round elements the
 *   subject calls for as low solid discs, never as glossy spheres or balls.
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
    `${article(style)} ${style} of ${spec.subject}. ${GLOBAL_CONSTRAINTS}\n\n` +
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
