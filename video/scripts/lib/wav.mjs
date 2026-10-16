/**
 * The 16-bit stereo WAVs in public/sfx/, shared by the two scripts that make
 * them: sfx.mjs (synthesized) and sfx-elevenlabs.mjs (generated). Both write
 * through encodeWav and index through indexSounds, so neither can drop the
 * other's entries from sounds.json.
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const SR = 44100;

/** A stereo pair as a WAV, normalized to a 0.99 peak, with a 1 ms fade in and
 *  a 12 ms fade out so no file starts or ends on a click. */
export const encodeWav = ([l, r]) => {
  const n = Math.max(l.length, r.length);
  const fadeIn = Math.round(0.001 * SR);
  const fadeOut = Math.round(0.012 * SR);
  let peak = 0;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(l[i] ?? 0), Math.abs(r[i] ?? 0));
  const k = 0.99 / (peak || 1);
  const data = Buffer.alloc(n * 4);
  for (let i = 0; i < n; i++) {
    const g = k * Math.min(1, i / fadeIn, (n - 1 - i) / fadeOut);
    data.writeInt16LE(Math.round((l[i] ?? 0) * g * 32767), i * 4);
    data.writeInt16LE(Math.round((r[i] ?? 0) * g * 32767), i * 4 + 2);
  }
  const head = Buffer.alloc(44);
  head.write("RIFF", 0);
  head.writeUInt32LE(36 + data.length, 4);
  head.write("WAVEfmt ", 8);
  head.writeUInt32LE(16, 16);
  head.writeUInt16LE(1, 20);
  head.writeUInt16LE(2, 22);
  head.writeUInt32LE(SR, 24);
  head.writeUInt32LE(SR * 4, 28);
  head.writeUInt16LE(4, 32);
  head.writeUInt16LE(16, 34);
  head.write("data", 36);
  head.writeUInt32LE(data.length, 40);
  return { bytes: Buffer.concat([head, data]), seconds: n / SR };
};

/** Rewrites sounds.json from every WAV in `dir`: name to length in seconds. */
export const indexSounds = (dir) => {
  const lengths = {};
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".wav")).sort()) {
    const b = readFileSync(join(dir, file));
    let at = 12;
    while (b.toString("ascii", at, at + 4) !== "data") at += 8 + b.readUInt32LE(at + 4);
    const frame = b.readUInt16LE(22) * (b.readUInt16LE(34) / 8);
    lengths[file.slice(0, -4)] = Math.round((b.readUInt32LE(at + 4) / frame / b.readUInt32LE(24)) * 1000) / 1000;
  }
  writeFileSync(join(dir, "sounds.json"), JSON.stringify(lengths, null, 2) + "\n");
  return lengths;
};
