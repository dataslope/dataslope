/**
 * Checks that every composition is ready to render at 4K (--scale=2): walks
 * each one at that scale, a frame every half second, and collects what each
 * <Illustration> reports about itself when it loads (src/components/
 * Illustration.tsx). An image drawn across more device pixels than it has is
 * being stretched, and shows soft at 4K. Nothing is written to disk.
 *
 *   npm run check:4k                    # every composition
 *   npm run check:4k -- BaseRate,TfIdf  # just these
 *
 * Exits non-zero if any image is stretched.
 */
import { bundle } from "@remotion/bundler";
import { getCompositions, renderFrames } from "@remotion/renderer";
import path from "node:path";

const only = process.argv[2]?.split(",");
const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE ?? null;
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const compositions = (await getCompositions(serveUrl, { browserExecutable, inputProps: {} })).filter(
  (c) => c.durationInFrames > 1 && (!only || only.includes(c.id)),
);

const SCALE = 2;
const worst = new Map(); // "video/id" -> { stretch, report, comps }
for (const composition of compositions) {
  await renderFrames({
    serveUrl,
    composition,
    inputProps: {},
    outputDir: null,
    imageFormat: "none",
    scale: SCALE,
    everyNthFrame: Math.round(composition.fps / 2),
    concurrency: 2,
    browserExecutable,
    onStart: () => {},
    onFrameUpdate: () => {},
    onBrowserLog: ({ text }) => {
      const m = text.match(/^\[illustration\] (\S+) .*: ([0-9.]+)/);
      if (!m) return;
      const prev = worst.get(m[1]);
      const stretch = Number(m[2]);
      if (!prev || stretch > prev.stretch) worst.set(m[1], { stretch, report: text, comp: composition.id });
    },
  });
  const mine = [...worst.values()].filter((w) => w.comp === composition.id);
  console.log(`${composition.id.padEnd(22)} ${String(mine.length).padStart(2)} images seen, largest stretch ${mine.length ? Math.max(...mine.map((w) => w.stretch)).toFixed(2) : "-"}`);
}

const bad = [...worst.values()].filter((w) => w.stretch > 1).sort((a, b) => b.stretch - a.stretch);
console.log(`\n${worst.size} illustrations checked at ${SCALE}x.`);
for (const w of bad) console.log(`  ✗ ${w.report.replace(/^\[illustration\] /, "")}`);
if (bad.length) process.exit(1);
console.log("  ✓ none is drawn larger than its pixels");
