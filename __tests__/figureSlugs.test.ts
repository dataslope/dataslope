// Guards the `<Figure>` placements across content/ (the optimized raster
// images pipeline, scripts/build-images.mjs + app/_components/mdx/Figure.tsx).
//
// In production a `<Figure>` whose slug has no generated image renders
// nothing at all (by design, so placements can be authored before artwork
// lands), which means a typo'd slug ships an invisibly missing image with
// zero signal. This suite turns that silent failure into a red test: every
// placed slug must be "known", i.e. present in the generated manifest
// (lib/generated/images.js) or listed as pending in the assets/images/README
// table. It also enforces the component contract MDX can't type-check
// (required alt) and pins the slugify rules that map source filenames to
// slugs/URLs.
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

import imageManifest from "../lib/generated/images";
// build-images.mjs only runs its build when executed directly, so importing
// the helper here is side-effect free.
import { slugify } from "../scripts/build-images.mjs";

const CONTENT_DIR = path.join(process.cwd(), "content");
const README_FILE = path.join(process.cwd(), "assets", "images", "README.md");

interface Placement {
  file: string;
  tag: string;
  slug: string | null;
  hasAlt: boolean;
}

async function mdxFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await mdxFiles(full)));
    else if (entry.name.endsWith(".mdx")) files.push(full);
  }
  return files;
}

/** Every `<Figure …>` opening tag across content/, with its slug and whether
 *  an alt attribute is present. JSX attribute blocks contain no `>`, so the
 *  `[^>]*` body matches multi-line tags too. */
async function figurePlacements(): Promise<Placement[]> {
  const placements: Placement[] = [];
  for (const file of await mdxFiles(CONTENT_DIR)) {
    const text = await readFile(file, "utf-8");
    for (const match of text.matchAll(/<Figure\b[^>]*>/g)) {
      const tag = match[0];
      placements.push({
        file: path.relative(process.cwd(), file),
        tag,
        slug: tag.match(/\bslug="([^"]*)"/)?.[1] ?? null,
        hasAlt: /\balt="/.test(tag),
      });
    }
  }
  return placements;
}

/** Slugs listed in the README's pending-images table (`| `slug` | … |`). */
async function readmePendingSlugs(): Promise<Set<string>> {
  const text = await readFile(README_FILE, "utf-8");
  const slugs = new Set<string>();
  for (const match of text.matchAll(/^\|\s*`([^`]+)`\s*\|/gm)) {
    slugs.add(match[1]);
  }
  return slugs;
}

describe("<Figure> placements", () => {
  it("places at least one figure (regex smoke check)", async () => {
    const placements = await figurePlacements();
    expect(placements.length).toBeGreaterThan(0);
  });

  it("gives every figure a non-empty slug and an alt attribute", async () => {
    for (const p of await figurePlacements()) {
      expect(p.slug, `missing/empty slug in ${p.file}: ${p.tag}`).toBeTruthy();
      expect(p.hasAlt, `missing alt in ${p.file}: ${p.tag}`).toBe(true);
    }
  });

  it("only references known slugs (manifest or README pending table)", async () => {
    const known = new Set([
      ...Object.keys(imageManifest),
      ...(await readmePendingSlugs()),
    ]);
    for (const p of await figurePlacements()) {
      expect(
        known.has(p.slug ?? ""),
        `${p.file} references slug "${p.slug}", which is neither in ` +
          `lib/generated/images.js nor in the assets/images/README.md table, ` +
          `it would silently render nothing in production`,
      ).toBe(true);
    }
  });

  it("uses slugs already in canonical form (what a source filename maps to)", async () => {
    for (const p of await figurePlacements()) {
      if (!p.slug) continue;
      expect(slugify(p.slug), `non-canonical slug in ${p.file}`).toBe(p.slug);
    }
  });
});

describe("slugify", () => {
  it("lowercases, strips diacritics, and hyphenates", () => {
    expect(slugify("Café Été")).toBe("cafe-ete");
    expect(slugify("US Map (v2)")).toBe("us-map-v2");
    expect(slugify("  panda__in--shades  ")).toBe("panda-in-shades");
  });

  it("trims leading/trailing separators", () => {
    expect(slugify("--penguins--")).toBe("penguins");
    expect(slugify("(playground)")).toBe("playground");
  });
});
