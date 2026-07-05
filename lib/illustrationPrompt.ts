/**
 * Shared, dependency-free helpers for the `<IllustrationPrompt>` MDX component
 * (app/_components/mdx/IllustrationPrompt.tsx) and the `/illustration-prompts`
 * gallery collector (lib/illustrationPromptsGallery.ts).
 *
 * Keeping the prompt template AND the semantic-filename logic here means the
 * lesson card, the gallery card, and the deep-link anchor all agree on the
 * exact prompt text and the exact file slug for a given subject — there is one
 * source of truth, and no per-instance `name` prop has to be authored into the
 * 100+ MDX call sites.
 *
 * Pure (no Node/DOM APIs) so it can be imported from a client component, a
 * server component, and the esbuild-bundled gallery collector alike.
 */

/** Build the exact image-generation prompt for a subject. A specific named
 *  real person gets "(photo attached)" via `photo`; objects/animals/scenes
 *  do not. */
export function buildIllustrationPrompt(subject: string, photo: boolean): string {
  const reference = photo ? " (photo attached)" : "";
  return (
    `Create a line art-styled illustration of ${subject}${reference}. ` +
    `Use Recraft Vector V4.1. Use a transparent background. ` +
    `The illustration should work well in both light (#ffffff) and dark backgrounds (#121212).`
  );
}

/**
 * Curated slugs for the concrete-object/scene subjects (the ones without a
 * `photo` reference). Their authored subjects are long descriptive phrases, so
 * a naive slug would be unwieldy; these give each a short, stable filename.
 * Two Datasaurus phrasings intentionally map to the same file (one drawing).
 */
const OBJECT_SLUGS: Record<string, string> = {
  "Charles Babbage's Analytical Engine, a Victorian-era mechanical computer of brass gears and cylinders":
    "analytical-engine",
  "Napoleon's 1812 march flow-map": "napoleon-1812-march-map",
  "a Gentoo penguin standing on Antarctic ice": "gentoo-penguin",
  "a PDP-11 minicomputer, an early 1970s refrigerator-sized machine with switches and blinking lights":
    "pdp-11-minicomputer",
  "a Palmer penguin": "palmer-penguin",
  "a Therac-25 radiation therapy machine, a 1980s hospital medical linear accelerator with a patient couch":
    "therac-25",
  "a captured tank marked with a serial number (the German tank problem)":
    "german-tank-problem",
  "a cup of tea for Fisher's Lady Tasting Tea experiment": "lady-tasting-tea",
  "a duck (the DuckDB mascot) perched on a stack of database disks":
    "duckdb-duck-mascot",
  "a jar of green jelly beans (the xkcd #882 significance comic)":
    "xkcd-jelly-beans",
  "a prize ox at a country fair weight-guessing contest (Galton's wisdom of crowds)":
    "galton-ox-weight-guessing",
  "a scatter of points forming a cartoon dinosaur (the Datasaurus)": "datasaurus",
  "a whale surfacing beside the City of London skyline": "london-whale",
  "the 1947 Harvard Mark II logbook page with the first computer bug, an actual moth, taped onto it":
    "first-computer-bug-moth",
  "the Ariane 5 rocket": "ariane-5-rocket",
  "the Datasaurus dinosaur-shaped scatter plot": "datasaurus",
  "the Ishango bone, an ancient notched tally bone": "ishango-bone",
  "the Mars Climate Orbiter spacecraft approaching Mars": "mars-climate-orbiter",
  "the Mauna Loa Observatory atmospheric monitoring station on a Hawaiian volcano summit":
    "mauna-loa-observatory",
  "the Monty Python foot, nodding to Python's name": "monty-python-foot",
  "the three doors of the Monty Hall problem, one ajar with a goat behind it":
    "monty-hall-doors",
};

/** Display name for a person subject: drops a trailing descriptor after a
 *  comma/colon (so "Fred Brooks, author of …" → "Fred Brooks") and a leading
 *  "the " (so "the Gang of Four: …" → "Gang of Four"). Shared by the file-slug
 *  logic and the gallery's reference-photo links. */
function personDisplayName(subject: string): string {
  return subject
    .split(/[,:(]/)[0]
    .trim()
    .replace(/^the\s+/i, "");
}

/** Lowercase, strip diacritics, and hyphenate to a URL/file-safe slug. */
function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Semantic file-name stem (no extension) for a subject — e.g.
 * "Leland Wilkinson" → "leland-wilkinson-portrait",
 * "a duck (the DuckDB mascot)…" → "duckdb-duck-mascot".
 *
 * People (`photo`) become "<name>-portrait", dropping any trailing descriptor
 * after a comma/colon (so "Fred Brooks, author of …" → "fred-brooks-portrait")
 * and a leading "the " (so "the Gang of Four: …" → "gang-of-four-portrait").
 * Objects use the curated map above, with a truncated slug as a fallback.
 */
export function illustrationFileSlug(subject: string, photo: boolean): string {
  if (!photo) {
    const mapped = OBJECT_SLUGS[subject];
    if (mapped) return mapped;
    return slugify(subject).split("-").slice(0, 5).join("-");
  }
  return `${slugify(personDisplayName(subject))}-portrait`;
}

/** Full file name (with `.svg`) for a subject. */
export function illustrationFileName(subject: string, photo: boolean): string {
  return `${illustrationFileSlug(subject, photo)}.svg`;
}

/**
 * Wikipedia article link for a person subject — used as the "reference
 * photo" link on the `/illustration-prompts` gallery. Deterministic (no
 * network call, no hand-picked image URL to get wrong): almost every named
 * person here has a bio page with a lead photo in the infobox.
 */
export function personWikipediaUrl(subject: string): string {
  const title = personDisplayName(subject).replace(/ /g, "_");
  return `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`;
}

/** Google Images search link for a person subject. */
export function personImageSearchUrl(subject: string): string {
  const query = encodeURIComponent(personDisplayName(subject));
  return `https://www.google.com/search?q=${query}&tbm=isch`;
}
