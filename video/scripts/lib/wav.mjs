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

/**
 * Where a sound's accent falls, in seconds: the attack of its loudest moment,
 * which is what the ear takes as "the hit" (a bell's strike, a knock, the
 * click of two halves meeting). Found as the steepest rise in the 10 ms
 * loudness envelope within the 250 ms before the loudest frame, so a whoosh
 * that swells into a chime is placed at the chime, not somewhere in the swell.
 * <Sfx accentAt> starts a sound this long before the frame it is cued to.
 */
export const measureAccent = ([l, r], sr = SR) => {
  const n = Math.round(0.01 * sr);
  const env = [];
  for (let at = 0; at + n <= l.length; at += n) {
    let e = 0;
    for (let i = at; i < at + n; i++) e += (l[i] * l[i] + r[i] * r[i]) / 2;
    env.push(Math.sqrt(e / n));
  }
  if (env.length < 2) return 0;
  let peak = 0;
  for (let i = 1; i < env.length; i++) if (env[i] > env[peak]) peak = i;
  let rise = peak;
  let steepest = -Infinity;
  for (let i = Math.max(1, peak - 25); i <= peak; i++) {
    const d = env[i] - env[i - 1];
    if (d > steepest) (steepest = d), (rise = i);
  }
  return Math.round(((rise * n) / sr) * 1000) / 1000;
};

/** The samples of a 16-bit WAV this module wrote, as two float channels. */
const readWav = (b) => {
  let at = 12;
  while (b.toString("ascii", at, at + 4) !== "data") at += 8 + b.readUInt32LE(at + 4);
  const channels = b.readUInt16LE(22);
  const bytes = b.readUInt32LE(at + 4);
  const count = bytes / 2 / channels;
  const l = new Float64Array(count);
  const r = new Float64Array(count);
  for (let i = 0; i < count; i++) {
    l[i] = b.readInt16LE(at + 8 + i * 2 * channels) / 32768;
    r[i] = channels > 1 ? b.readInt16LE(at + 8 + i * 2 * channels + 2) / 32768 : l[i];
  }
  return { rate: b.readUInt32LE(24), channels: [l, r], bytes };
};

/** Rewrites sounds.json from every WAV in `dir` (name to length in seconds),
 *  and accents.json beside it (name to the time of its accent, measureAccent). */
export const indexSounds = (dir) => {
  const lengths = {};
  const accents = {};
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".wav")).sort()) {
    const b = readFileSync(join(dir, file));
    const { rate, channels, bytes } = readWav(b);
    const frame = b.readUInt16LE(22) * (b.readUInt16LE(34) / 8);
    const name = file.slice(0, -4);
    lengths[name] = Math.round((bytes / frame / rate) * 1000) / 1000;
    accents[name] = measureAccent(channels, rate);
  }
  writeFileSync(join(dir, "sounds.json"), JSON.stringify(lengths, null, 2) + "\n");
  writeFileSync(join(dir, "accents.json"), JSON.stringify(accents, null, 2) + "\n");
  return lengths;
};
