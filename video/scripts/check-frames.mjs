/**
 * Checks what only a render can see: walks every composition at 4K
 * (--scale=2), a frame every half second, and collects what two components
 * report about themselves as they draw. Nothing is written to disk.
 *
 * - Every <Illustration> reports how far it is stretched
 *   (src/components/Illustration.tsx). An image drawn across more device
 *   pixels than it has shows soft at 4K.
 * - Every arrowhead reports how far its line turns underneath it
 *   (arrowHead() in src/components/arrow.ts). A head can only sit on a line
 *   that is nearly straight under it; past MAX_HEAD_BEND degrees no angle
 *   fits, and the head reads as crooked.
 *
 *   npm run check:frames                    # every composition
 *   npm run check:frames -- BaseRate,TfIdf  # just these
 *
 * Exits non-zero if any image is stretched or any arrowhead sits on a bend.
 */
import { bundle } from "@remotion/bundler";
import { getCompositions, renderFrames } from "@remotion/renderer";
import path from "node:path";
import { MAX_HEAD_BEND } from "../src/components/arrow.ts";

const only = process.argv[2]?.split(",");
const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE ?? null;
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const compositions = (await getCompositions(serveUrl, { browserExecutable, inputProps: {} })).filter(
  (c) => c.durationInFrames > 1 && (!only || only.includes(c.id)),
);

const SCALE = 2;
const images = new Map(); // "video/id" -> { stretch, report, comp }
const arrows = new Map(); // "Comp: from to tip" -> { bend, report, comp }
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
      const img = text.match(/^\[illustration\] (\S+) .*: ([0-9.]+)/);
      if (img) {
        const prev = images.get(img[1]);
        const stretch = Number(img[2]);
        if (!prev || stretch > prev.stretch) images.set(img[1], { stretch, report: text, comp: composition.id });
      }
      const arrow = text.match(/^\[arrowhead\] (.*) turns ([0-9.]+)°/);
      if (arrow) {
        const key = `${composition.id}: ${arrow[1]}`;
        const bend = Number(arrow[2]);
        const prev = arrows.get(key);
        if (!prev || bend > prev.bend) arrows.set(key, { bend, report: `${composition.id}: ${text.replace(/^\[arrowhead\] /, "")}`, comp: composition.id });
      }
    },
  });
  const mine = [...images.values()].filter((w) => w.comp === composition.id);
  const heads = [...arrows.values()].filter((a) => a.comp === composition.id);
  const most = (xs, k) => (xs.length ? Math.max(...xs.map((x) => x[k])).toFixed(k === "bend" ? 1 : 2) : "-");
  console.log(
    `${composition.id.padEnd(20)} ${String(mine.length).padStart(2)} images, largest stretch ${most(mine, "stretch")}` +
      (heads.length ? ` · arrowheads up to ${most(heads, "bend")}° of bend` : ""),
  );
}

const stretched = [...images.values()].filter((w) => w.stretch > 1).sort((a, b) => b.stretch - a.stretch);
const bent = [...arrows.values()].filter((a) => a.bend > MAX_HEAD_BEND).sort((a, b) => b.bend - a.bend);
console.log(`\n${images.size} illustrations checked at ${SCALE}x.`);
for (const w of stretched) console.log(`  ✗ ${w.report.replace(/^\[illustration\] /, "")}`);
if (!stretched.length) console.log("  ✓ none is drawn larger than its pixels");
const heads = new Set([...arrows.values()].map((a) => a.report.replace(/ to \S+ turns.*/, "")));
console.log(`${heads.size} arrows checked, each at every tip it drew to.`);
for (const a of bent) console.log(`  ✗ ${a.report}`);
if (!bent.length) console.log(`  ✓ every line is within ${MAX_HEAD_BEND}° of straight under its head`);
if (stretched.length || bent.length) process.exit(1);
