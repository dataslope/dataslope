// Scratch (gitignored): one bundle of DbDesign-2-Entities alone (its private
// entry), then the renders the checks read: the soundtrack with and without
// sound effects (for check:mix --reuse and check:sync --audio) and the
// half-size preview with sound (for check:motion --file). Run from video/
// through out/render-slot.sh.
import path from "node:path";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { bundleVideo } from "../scripts/lib/bundle.mjs";

const id = "DbDesign-2-Entities";
const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE ?? null;
const serveUrl = await bundleVideo(path.resolve("out/DbDesign-2-Entities-entry.tsx"));
const want = new Set(process.argv.slice(2).length ? process.argv.slice(2) : ["wet", "dry", "preview"]);
const jobs = [
  { tag: "wet", inputProps: {}, codec: "wav", file: `out/${id}-wet.wav` },
  { tag: "dry", inputProps: { sfx: false }, codec: "wav", file: `out/${id}-dry.wav` },
  { tag: "preview", inputProps: {}, codec: "h264", file: `out/${id}-preview.mp4`, scale: 0.5 },
].filter((j) => want.has(j.tag));
for (const j of jobs) {
  const composition = await selectComposition({ serveUrl, id, inputProps: j.inputProps, browserExecutable });
  let shown = -1;
  await renderMedia({
    serveUrl,
    composition,
    inputProps: j.inputProps,
    codec: j.codec,
    scale: j.scale ?? 1,
    outputLocation: path.resolve(j.file),
    browserExecutable,
    onProgress: ({ progress }) => {
      const pct = Math.floor(progress * 10) * 10;
      if (pct !== shown) console.log(`${j.tag} ${(shown = pct)}%`);
    },
  });
  console.log(`rendered ${j.file}`);
}
