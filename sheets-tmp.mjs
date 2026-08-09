import sharp from "sharp";
import { existsSync } from "node:fs";
const OUT = "/tmp/claude-0/-home-user-dataslope/2cd2cb4f-83df-59f4-8114-4000df3f5187/scratchpad";
const name = process.argv[2], ids = process.argv.slice(3).filter((id) => existsSync(`public/images/${id}-cutout.webp`));
if (!ids.length) { console.log(name, "0"); process.exit(0); }
const W = 520, PAD = 5;
const tiles = []; let y = PAD;
for (const id of ids) {
  const buf = await sharp(`public/images/${id}-cutout.webp`).resize({ width: W }).png().toBuffer();
  const { height } = await sharp(buf).metadata();
  const split = await sharp({ create: { width: W, height, channels: 3, background: "#ffffff" } })
    .composite([{ input: { create: { width: Math.round(W/2), height, channels: 3, background: "#121212" } }, left: Math.round(W/2), top: 0 }, { input: buf, left: 0, top: 0 }])
    .png().toBuffer();
  tiles.push({ input: split, left: PAD, top: y }); y += height + PAD;
}
await sharp({ create: { width: W + PAD*2, height: y, channels: 3, background: "#7a7a7a" } }).composite(tiles).png().toFile(`${OUT}/${name}.png`);
console.log(name, ids.length, ids.map((i) => i.replace(/-inline$/, "")).join(" "));
