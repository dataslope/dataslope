// The thumbnail variants build-images writes, and the srcset the catalogs
// build from the manifest, have to agree on one path. The two sides are an
// .mjs script and a TS module that cannot share code, so this pins them:
// every width a manifest entry lists names a file that exists, and every
// thumbnail has its variants. A failure means build-images has not been run
// since a thumbnail was promoted or trimmed: `node scripts/build-images.mjs`.
import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import imageManifest from "../lib/generated/images.js";
import { imageSrcSet, imageVariantSrc } from "../lib/imageVariants";

const PUBLIC_DIR = path.join(process.cwd(), "public");
const entries = Object.entries(imageManifest);

describe("thumbnail variants", () => {
  it("gives every course and interview-prep thumbnail a variant", () => {
    const thumbnails = entries.filter(([slug]) => slug.endsWith("-thumbnail-cutout"));
    expect(thumbnails.length).toBeGreaterThan(30);
    const bare = thumbnails
      .filter(([, entry]) => !entry.widths?.length)
      .map(([slug]) => slug);
    expect(bare, "thumbnails with no downscaled variant").toEqual([]);
  });

  it("lists only files that exist", () => {
    const missing = entries.flatMap(([slug, entry]) =>
      (entry.widths ?? [])
        .map((w) => imageVariantSrc(slug, w))
        .filter((src) => !existsSync(path.join(PUBLIC_DIR, src))),
    );
    expect(missing, "variants in the manifest but not on disk").toEqual([]);
  });

  it("offers the original as the widest candidate", () => {
    const [slug, entry] = entries.find(([, e]) => e.widths?.length)!;
    const candidates = imageSrcSet(slug, entry)!.split(", ");
    expect(candidates.at(-1)).toBe(`/images/${slug}.webp ${entry.width}w`);
    expect(candidates).toHaveLength(entry.widths!.length + 1);
  });
});
