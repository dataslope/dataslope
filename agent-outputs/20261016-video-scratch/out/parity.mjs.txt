import { renderStill, selectComposition } from "@remotion/renderer";
import { createRequire } from "node:module";
const sharp = createRequire("/home/user/dataslope/package.json")("sharp");
const [, , B] = process.argv;
const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE;
const cases = [["BaseRate", 400], ["SimpsonsParadox", 900], ["ListVsSet", 600]];
for (const [id, frame] of cases) for (const scale of [1, 2]) {
  const outs = [];
  for (const v of ["paper", "image"]) {
    const serveUrl = `${B}/${v}`;
    const composition = await selectComposition({ serveUrl, id, browserExecutable, inputProps: {} });
    const output = `${B}/parity-${id}-${scale}-${v}.png`;
    await renderStill({ serveUrl, composition, frame, output, scale, browserExecutable, overwrite: true });
    outs.push(output);
  }
  const [a, b] = await Promise.all(outs.map((f) => sharp(f).raw().toBuffer({ resolveWithObject: true })));
  let diff = 0, max = 0;
  for (let i = 0; i < a.data.length; i++) { const d = Math.abs(a.data[i] - b.data[i]); if (d) diff++; if (d > max) max = d; }
  console.log(id, `scale ${scale}`, `${a.info.width}x${a.info.height}`, `differing channel values: ${diff}`, `max diff: ${max}`);
}
