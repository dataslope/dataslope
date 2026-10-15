/**
 * Renders the editorial page's paper grain (the PaperTexture still, from
 * <PaperSource> in src/editorial/ui.tsx) to public/editorial/paper@1x.webp
 * and paper@2x.webp, which <Paper> shows instead of drawing the noise
 * filters on every frame. Lossless, so a page looks exactly as it did when
 * the filters were live: 7.3 MB for the pair, against 14.7 MB as PNG.
 *
 * Re-run after any change to PaperSource, PAPER, INK or the yellow tone
 * (from video/; needs the repo root's `npm install` for sharp):
 *   npm run paper
 */
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { mkdirSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const sharp = createRequire(path.resolve("..", "package.json"))("sharp");
const out = path.resolve("public/editorial");
mkdirSync(out, { recursive: true });
const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE ?? null;
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const composition = await selectComposition({ serveUrl, id: "PaperTexture", browserExecutable, inputProps: {} });
for (const scale of [1, 2]) {
  const png = path.join(out, `paper@${scale}x.png`);
  const webp = path.join(out, `paper@${scale}x.webp`);
  await renderStill({ serveUrl, composition, output: png, scale, imageFormat: "png", browserExecutable, overwrite: true });
  const info = await sharp(png).webp({ lossless: true, effort: 6 }).toFile(webp);
  rmSync(png);
  console.log(`  ✓ ${path.relative(process.cwd(), webp)}  ${info.width}x${info.height}  ${(info.size / 1e6).toFixed(2)} MB`);
}
