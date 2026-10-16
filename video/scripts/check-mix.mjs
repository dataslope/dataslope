#!/usr/bin/env node
/**
 * Measures how a video's sound effects sit under its narration. Renders the
 * soundtrack twice, as the composition plays it and with `sfx: false`, and
 * subtracts the two, which leaves the effects alone:
 *
 *   npm run check:mix -- ThinkingStatistically            # or thinking-statistically
 *   npm run check:mix -- ThinkingStatistically --reuse    # measure the WAVs already in out/
 *
 * It prints the narration's and the effects' integrated loudness (LUFS, ITU-R
 * BS.1770), the effects' peak and when it happens, how far the speech stays
 * above the effects wherever both are sounding, and the moments where an
 * effect comes closest to the voice. The three renders stay in out/:
 * <id>-wet.wav, <id>-dry.wav, and <id>-fx.wav, the effects on their own at
 * their real level, for listening.
 *
 * For reference, measured with this script:
 *   SamplingBias           effects 17.6 LU under the narration, speech a median 20 dB above them
 *   ThinkingStatistically  effects 18.9 LU under, speech a median 22.5 dB above
 * About 15 LU under or more reads as subtle. Each line under "Closest to the
 * voice" names a time to look at if a sound feels too present. Those are
 * 50 ms readings, so a knock that lands in the gap between two words can
 * briefly match the voice there without masking anything: listen before
 * turning it down.
 */
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loudness, readWav, renderAudio, videoNames, windowLevels, writeWav } from "./lib/audio.mjs";

const VIDEO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const reuse = args.includes("--reuse");
const name = args.find((a) => !a.startsWith("--"));
if (!name) {
  console.error("Usage: npm run check:mix -- <video> [--reuse]");
  process.exit(1);
}
const { id } = videoNames(name);

const out = (tag) => path.join(VIDEO_ROOT, "out", `${id}-${tag}.wav`);
const render = async (tag, inputProps) => {
  if (reuse && existsSync(out(tag))) return out(tag);
  return renderAudio(id, { tag, inputProps });
};
const wet = readWav(await render("wet", {}));
const dry = readWav(await render("dry", { sfx: false }));

const n = Math.min(wet.channels[0].length, dry.channels[0].length);
const fx = {
  rate: wet.rate,
  channels: wet.channels.map((w, c) => {
    const d = dry.channels[c];
    const x = new Float32Array(n);
    for (let i = 0; i < n; i++) x[i] = w[i] - d[i];
    return x;
  }),
};
writeWav(out("fx"), fx);

const voice = loudness(dry);
const effects = loudness(fx);
const time = (t) => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, "0")}`;
console.log(`\nNarration (dry):  ${voice.integrated.toFixed(1)} LUFS, peak ${voice.peak.toFixed(1)} dBFS`);
if (!Number.isFinite(effects.integrated)) {
  console.log("Effects:          none. Does the composition set sfx: true in its defaultProps?");
  process.exit(0);
}
console.log(`Effects alone:    ${effects.integrated.toFixed(1)} LUFS, peak ${effects.peak.toFixed(1)} dBFS at ${time(effects.peakAt)}`);
console.log(`                  ${(voice.integrated - effects.integrated).toFixed(1)} LU under the narration`);

// Speech against effects in 50 ms windows: where both are sounding, and where
// the voice is actually speaking (not a breath or a word's tail).
const STEP = 0.05;
const sp = windowLevels(dry, STEP);
const ef = windowLevels(fx, STEP);
const margins = [];
for (let k = 0; k < Math.min(sp.length, ef.length); k++) if (sp[k] > -45 && ef[k] > -60) margins.push(sp[k] - ef[k]);
margins.sort((a, b) => a - b);
const pct = (p) => margins[Math.min(margins.length - 1, Math.floor((p / 100) * margins.length))];
if (margins.length) {
  console.log(
    `\nWhere both sound (${(margins.length * STEP).toFixed(1)} s in all), the speech is a median ` +
      `${pct(50).toFixed(1)} dB above the effects (5th percentile ${pct(5).toFixed(1)} dB).`,
  );
}

// The closest calls during real speech, one per moment (windows within half a
// second of each other count as one).
const close = [];
for (let k = 0; k < Math.min(sp.length, ef.length); k++) {
  if (sp[k] < -35 || ef[k] < -60) continue;
  const m = sp[k] - ef[k];
  const last = close.at(-1);
  if (last && k * STEP - last.t < 0.5) {
    if (m < last.m) Object.assign(last, { m, t: k * STEP });
  } else close.push({ t: k * STEP, m });
}
close.sort((a, b) => a.m - b.m);
if (close.length) {
  console.log("\nClosest to the voice, while it is speaking:");
  for (const c of close.slice(0, 5)) {
    const say = c.m >= 0 ? `speech ${c.m.toFixed(1)} dB above the effects` : `effects ${(-c.m).toFixed(1)} dB above the speech`;
    console.log(`  ${time(c.t).padStart(7)}  ${say} (50 ms)`);
  }
}
console.log(`\nThe effects alone are in ${path.relative(VIDEO_ROOT, out("fx"))}.`);
