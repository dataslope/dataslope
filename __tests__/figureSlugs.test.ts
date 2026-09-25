// Guards <Figure> placements across content/. A <Figure> whose slug has no
// generated image renders nothing in production (by design, so placements can
// precede artwork), so a typo'd slug ships an invisibly missing image. Every
// placed slug must be in the generated manifest or the assets/images/README
// pending table; also enforces required alt.
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

import imageManifest from "../lib/generated/images";

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

/** Every `<Figure …>` opening tag across content/ (JSX attribute blocks
 *  contain no `>`, so `[^>]*` matches multi-line tags). Read once and shared:
 *  every test wants the same list, and re-walking content/ per test blew
 *  the 5 s default timeout under disk contention. */
let cached: Promise<Placement[]> | null = null;
function figurePlacements(): Promise<Placement[]> {
  cached ??= (async () => {
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
  })();
  return cached;
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
});
