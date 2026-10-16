import { renderStill, selectComposition } from "@remotion/renderer";
import { createRequire } from "node:module";
const sharp = createRequire("/home/user/dataslope/package.json")("sharp");
const [, , B] = process.argv;
const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE;
const serveUrl = `${B}/paper`;
const composition = await selectComposition({ serveUrl, id: "BaseRate", browserExecutable, inputProps: {} });
const again = `${B}/parity-BaseRate-1-paper-again.png`;
await renderStill({ serveUrl, composition, frame: 400, output: again, scale: 1, browserExecutable, overwrite: true });
const cmp = async (x, y, label) => {
  const [a, b] = await Promise.all([x, y].map((f) => sharp(f).raw().toBuffer({ resolveWithObject: true })));
  const w = a.info.width, c = a.info.channels;
  let n = 0, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (let i = 0; i < a.data.length; i++) if (a.data[i] !== b.data[i]) { n++; const p = Math.floor(i / c), px = p % w, py = Math.floor(p / w); x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py); }
  console.log(label, "differing:", n, n ? `box x ${x0}-${x1}, y ${y0}-${y1}` : "");
};
await cmp(`${B}/parity-BaseRate-1-paper.png`, again, "live paper vs live paper (re-run):");
await cmp(`${B}/parity-BaseRate-1-paper.png`, `${B}/parity-BaseRate-1-image.png`, "live paper vs image paper:     ");
