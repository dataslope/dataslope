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
 * a risograph illustration of a subject, rendered in the four brand colors. See
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

/** The house illustration style when a prompt does not name its own. */
export const DEFAULT_STYLE = "risograph";

/** The minimal shape needed to build a generation prompt. */
export interface IllustrationSpec {
  /** What to illustrate, phrased to read naturally after "A risograph of "
   *  (e.g. "a friendly python snake coiled around a monitor"). */
  subject: string;
  /** Illustration style, e.g. "risograph" (default) or "line art". */
  style?: string;
  /** When set, appends "No text. Just an abstract art." so the model avoids
   *  baking in (usually garbled) lettering. */
  noText?: boolean;
}

/**
 * Build the exact GPT Image 2 generation prompt for an illustration spec, e.g.
 *
 *   A risograph of a programmer duck. No text. Just an abstract art.
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
  const abstract = spec.noText ? " No text. Just an abstract art." : "";
  return (
    `A ${style} of ${spec.subject}.${abstract}\n\n` +
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
