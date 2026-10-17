/**
 * What the audio checks share: rendering a composition's soundtrack, reading
 * a WAV, measuring loudness and finding pauses. Plain Node, with no ffmpeg
 * filters and no Python, so the checks run the same on Windows, macOS and
 * Linux. (Remotion's bundled ffmpeg has no `ebur128` filter, which is why
 * loudness is measured here.)
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const VIDEO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

/** "ThinkingStatistically" → "thinking-statistically", the video's folder. */
export const folderOf = (compositionId) =>
  compositionId
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
    .toLowerCase();

/** "thinking-statistically" → "ThinkingStatistically", its composition. */
export const compositionOf = (folder) => folder.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join("");

/**
 * Every registered video, read from src/Root.tsx: which composition id renders
 * the Video.tsx in which folder. A composition's id need not follow its
 * folder's name (the Statistics course's carry a "Stats-<unit>-" prefix), so
 * the registry is the authority, not the spelling.
 */
export function registry(root = VIDEO_ROOT) {
  const src = readFileSync(path.join(root, "src", "Root.tsx"), "utf8");
  const folderOfComponent = new Map(
    [...src.matchAll(/import \{ (\w+) \} from "\.\/videos\/([a-z0-9-]+)\/Video";/g)].map((m) => [m[1], m[2]]),
  );
  const videos = [];
  for (const m of src.matchAll(/<Composition\s+id="([^"]+)"\s+component=\{(\w+)\}/g)) {
    const folder = folderOfComponent.get(m[2]);
    if (folder) videos.push({ id: m[1], folder });
  }
  return videos;
}

/** Either name for a video (the composition, or the folder that narrate and
 *  cues take) as both. Registered videos are looked up; anything else falls
 *  back to the naming convention. */
export const videoNames = (name, videos = registry()) => {
  const hit =
    videos.find((v) => v.id === name) ??
    videos.find((v) => v.folder === name) ??
    // A name its folder was made from ("SamplingBias" for Stats-5-1-SamplingBias,
    // the id it had before the Statistics videos were prefixed).
    videos.find((v) => v.folder === folderOf(name));
  if (hit) return { id: hit.id, folder: hit.folder };
  return /^[a-z0-9-]+$/.test(name) ? { id: compositionOf(name), folder: name } : { id: name, folder: folderOf(name) };
};

let serveUrl;
/**
 * Renders a composition's soundtrack alone to out/<id>-<tag>.wav and returns
 * the path. `inputProps` are merged over the composition's defaultProps, so
 * `{ sfx: false }` renders it without sound effects.
 */
export async function renderAudio(compositionId, { tag, inputProps = {} }) {
  // Loaded here rather than at the top, so the measurements import without them.
  const { renderMedia, selectComposition } = await import("@remotion/renderer");
  const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE ?? null;
  const { bundleVideo } = await import("./bundle.mjs");
  serveUrl ??= await bundleVideo(path.join(VIDEO_ROOT, "src", "index.ts"));
  const composition = await selectComposition({ serveUrl, id: compositionId, inputProps, browserExecutable });
  const outputLocation = path.join(VIDEO_ROOT, "out", `${compositionId}-${tag}.wav`);
  mkdirSync(path.dirname(outputLocation), { recursive: true });
  let shown = -1;
  await renderMedia({
    serveUrl,
    composition,
    inputProps,
    codec: "wav",
    outputLocation,
    browserExecutable,
    onProgress: ({ progress }) => {
      const pct = Math.floor(progress * 10) * 10;
      if (pct !== shown) process.stdout.write(`\r  rendering ${tag} audio… ${(shown = pct)}%`);
    },
  });
  process.stdout.write(`\r  rendered ${path.relative(VIDEO_ROOT, outputLocation)}        \n`);
  return outputLocation;
}

/** Reads a PCM (16/24/32-bit) or float WAV into one Float32Array per channel. */
export function readWav(file) {
  const buf = readFileSync(file);
  if (buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WAVE") throw new Error(`${file} is not a WAV file`);
  let fmt, data;
  for (let o = 12; o + 8 <= buf.length; ) {
    const id = buf.toString("ascii", o, o + 4);
    let size = buf.readUInt32LE(o + 4);
    if (id === "data" && (size === 0 || size === 0xffffffff || o + 8 + size > buf.length)) size = buf.length - o - 8;
    if (id === "fmt ") fmt = buf.subarray(o + 8, o + 8 + size);
    if (id === "data") data = buf.subarray(o + 8, o + 8 + size);
    o += 8 + size + (size & 1);
  }
  if (!fmt || !data) throw new Error(`${file} has no fmt or data chunk`);
  let format = fmt.readUInt16LE(0);
  const channels = fmt.readUInt16LE(2);
  const rate = fmt.readUInt32LE(4);
  const bits = fmt.readUInt16LE(14);
  if (format === 0xfffe) format = fmt.readUInt16LE(24); // WAVE_FORMAT_EXTENSIBLE: the real format is in the GUID
  const step = bits / 8;
  const frames = Math.floor(data.length / (step * channels));
  const out = Array.from({ length: channels }, () => new Float32Array(frames));
  const read =
    format === 3 && bits === 32 ? (o) => data.readFloatLE(o)
    : format === 1 && bits === 16 ? (o) => data.readInt16LE(o) / 32768
    : format === 1 && bits === 24 ? (o) => data.readIntLE(o, 3) / 8388608
    : format === 1 && bits === 32 ? (o) => data.readInt32LE(o) / 2147483648
    : null;
  if (!read) throw new Error(`${file}: unsupported WAV format ${format}, ${bits}-bit`);
  for (let i = 0, o = 0; i < frames; i++) for (let c = 0; c < channels; c++, o += step) out[c][i] = read(o);
  return { rate, channels: out };
}

/** Writes channels as a 16-bit PCM WAV, at their own level (no normalizing). */
export function writeWav(file, { rate, channels }) {
  const n = channels[0].length;
  const k = channels.length;
  const buf = Buffer.alloc(44 + n * k * 2);
  buf.write("RIFF", 0, "ascii");
  buf.writeUInt32LE(36 + n * k * 2, 4);
  buf.write("WAVEfmt ", 8, "ascii");
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(k, 22);
  buf.writeUInt32LE(rate, 24);
  buf.writeUInt32LE(rate * k * 2, 28);
  buf.writeUInt16LE(k * 2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36, "ascii");
  buf.writeUInt32LE(n * k * 2, 40);
  for (let i = 0, o = 44; i < n; i++)
    for (const x of channels) {
      buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(x[i] * 32767))), o);
      o += 2;
    }
  writeFileSync(file, buf);
}

const biquad = (x, [b0, b1, b2, a1, a2]) => {
  const y = new Float64Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    let v = b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    // Flush the tail of a decay to zero: in a mostly silent track (the
    // effects alone) it would otherwise sink into denormals, which are slow.
    if (v < 1e-25 && v > -1e-25) v = 0;
    x2 = x1; x1 = x[i]; y2 = y1; y1 = v;
    y[i] = v;
  }
  return y;
};

/** The two K-weighting stages of ITU-R BS.1770, for any sample rate. */
const kWeighting = (rate) => {
  let K = Math.tan((Math.PI * 1681.974450955533) / rate);
  const Q1 = 0.7071752369554196;
  const Vh = 10 ** (3.999843853973347 / 20);
  const Vb = Vh ** 0.4996667741545416;
  let a0 = 1 + K / Q1 + K * K;
  const shelf = [(Vh + (Vb * K) / Q1 + K * K) / a0, (2 * (K * K - Vh)) / a0, (Vh - (Vb * K) / Q1 + K * K) / a0, (2 * (K * K - 1)) / a0, (1 - K / Q1 + K * K) / a0];
  K = Math.tan((Math.PI * 38.13547087602444) / rate);
  const Q2 = 0.5003270373238773;
  a0 = 1 + K / Q2 + K * K;
  const highpass = [1, -2, 1, (2 * (K * K - 1)) / a0, (1 - K / Q2 + K * K) / a0];
  return [shelf, highpass];
};

/**
 * Integrated loudness in LUFS (ITU-R BS.1770-4: K-weighted, 400 ms blocks
 * every 100 ms, gated at -70 LUFS and then 10 LU under the ungated mean), and
 * the sample peak in dBFS with the time it occurs. -Infinity for silence.
 */
export function loudness({ rate, channels }) {
  const [shelf, highpass] = kWeighting(rate);
  const weighted = channels.map((x) => biquad(biquad(x, shelf), highpass));
  // A 400 ms block is four 100 ms hops, so sum each hop once and add four.
  const hop = Math.round(rate * 0.1);
  const segments = Math.floor(channels[0].length / hop);
  const seg = new Float64Array(segments);
  for (const w of weighted)
    for (let k = 0; k < segments; k++) {
      let sum = 0;
      for (let i = k * hop; i < (k + 1) * hop; i++) sum += w[i] * w[i];
      seg[k] += sum;
    }
  const energies = [];
  for (let k = 0; k + 4 <= segments; k++) energies.push((seg[k] + seg[k + 1] + seg[k + 2] + seg[k + 3]) / (4 * hop));
  const lufs = (e) => -0.691 + 10 * Math.log10(e);
  const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const above = energies.filter((e) => lufs(e) > -70);
  let integrated = -Infinity;
  if (above.length) {
    const gate = lufs(mean(above)) - 10;
    const kept = above.filter((e) => lufs(e) > gate);
    integrated = lufs(mean(kept));
  }
  let peak = 0, at = 0;
  for (const x of channels)
    for (let i = 0; i < x.length; i++) {
      const a = Math.abs(x[i]);
      if (a > peak) [peak, at] = [a, i / rate];
    }
  return { integrated, peak: 20 * Math.log10(peak), peakAt: at };
}

/** RMS level in dB of the channel mix, in windows of `seconds`. */
export function windowLevels({ rate, channels }, seconds) {
  const win = Math.round(rate * seconds);
  const n = Math.floor(channels[0].length / win);
  const out = new Float64Array(n);
  for (let k = 0; k < n; k++) {
    let sum = 0;
    for (let i = k * win; i < (k + 1) * win; i++) {
      let v = 0;
      for (const x of channels) v += x[i];
      v /= channels.length;
      sum += v * v;
    }
    out[k] = 10 * Math.log10(sum / win + 1e-24);
  }
  return out;
}

/**
 * Every pause: a run of at least `minSeconds` in which no sample on any
 * channel rises above `thresholdDb`, as { start, end } in seconds. This is
 * exactly what ffmpeg's silencedetect reports at the same settings, and `end`
 * is where the next sound begins.
 */
export function silences({ rate, channels }, { thresholdDb = -30, minSeconds = 0.12 } = {}) {
  const limit = 10 ** (thresholdDb / 20);
  const n = channels[0].length;
  const out = [];
  let from = 0;
  for (let i = 0; i <= n; i++) {
    let loud = i === n;
    if (!loud) for (const x of channels) if (x[i] > limit || x[i] < -limit) loud = true;
    if (loud) {
      if (i - from >= minSeconds * rate) out.push({ start: from / rate, end: i / rate });
      from = i + 1;
    }
  }
  return out;
}
