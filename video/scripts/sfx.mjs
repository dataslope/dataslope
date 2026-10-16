#!/usr/bin/env node
/**
 * Synthesizes the sound effects in public/sfx/: short, soft sounds built from
 * damped sines and filtered noise. Nothing to license, nothing to pay for, and
 * a rerun writes the same bytes.
 *
 *   npm run sfx
 *
 * Every file is a 44.1 kHz, 16-bit stereo WAV normalized to a 0 dBFS peak, so
 * `<Sfx level={-26}>` (src/sound/Sfx.tsx) means "peaks at -26 dBFS in the
 * mix". sounds.json records each file's length, which <Sfx> sizes its
 * Sequence by, and which types the sound names.
 *
 * The palette is deliberately small and quiet: wooden knocks for a value
 * landing, pen strokes for a line being drawn, grains for many dots at once,
 * and one bell for a conclusion. Most of the energy sits above 2 kHz or in
 * short transients, out of the way of the narrator's voice.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "sfx");
const SR = 44100;

const mulberry32 = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const samples = (sec) => new Float64Array(Math.ceil(sec * SR));
const noise = (sec, seed) => {
  const r = mulberry32(seed);
  return samples(sec).map(() => r() * 2 - 1);
};

/** RBJ cookbook biquad coefficients. Band-pass is the 0 dB peak-gain form. */
const coeffs = (type, f, q) => {
  const w = (2 * Math.PI * Math.min(f, SR * 0.45)) / SR;
  const cw = Math.cos(w);
  const a = Math.sin(w) / (2 * q);
  const b =
    type === "lp" ? [(1 - cw) / 2, 1 - cw, (1 - cw) / 2] : type === "hp" ? [(1 + cw) / 2, -(1 + cw), (1 + cw) / 2] : [a, 0, -a];
  const a0 = 1 + a;
  return [b[0] / a0, b[1] / a0, b[2] / a0, (-2 * cw) / a0, (1 - a) / a0];
};

/** Filters x; `f` may be a function of time in seconds (recomputed every 32 samples). */
const filter = (x, type, f, q = Math.SQRT1_2) => {
  const y = new Float64Array(x.length);
  let c = coeffs(type, typeof f === "function" ? f(0) : f, q);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    if (typeof f === "function" && i % 32 === 0) c = coeffs(type, f(i / SR), q);
    const v = c[0] * x[i] + c[1] * x1 + c[2] * x2 - c[3] * y1 - c[4] * y2;
    x2 = x1; x1 = x[i]; y2 = y1; y1 = v;
    y[i] = v;
  }
  return y;
};

const env = (x, fn) => x.map((v, i) => v * fn(i / SR));
const add = (into, x, at = 0, gain = 1) => {
  const o = Math.round(at * SR);
  for (let i = 0; i < x.length && o + i < into.length; i++) into[o + i] += x[i] * gain;
  return into;
};
/** Constant-power pan, -1 (left) to 1 (right), into a stereo pair. */
const place = (pair, x, at, pan, gain = 1) => {
  const a = ((pan + 1) * Math.PI) / 4;
  add(pair[0], x, at, gain * Math.cos(a));
  add(pair[1], x, at, gain * Math.sin(a));
  return pair;
};
const stereo = (sec) => [samples(sec), samples(sec)];

/**
 * A wooden knock: three damped modes at a free bar's ratios (1, 2.76, 5.40),
 * a pitch that settles in its first 10 ms, and a few ms of filtered noise for
 * the strike.
 */
const knock = (f0, { tau = 0.055, click = 0.22, seed = 1, len = 0.3 } = {}) => {
  const out = samples(len);
  const modes = [
    [1, 1, tau],
    [2.76, 0.3, tau * 0.4],
    [5.4, 0.09, tau * 0.18],
  ];
  for (const [ratio, amp, t] of modes) {
    let ph = 0;
    for (let i = 0; i < out.length; i++) {
      const s = i / SR;
      ph += (2 * Math.PI * f0 * ratio * (1 + 0.035 * Math.exp(-s / 0.01))) / SR;
      out[i] += amp * Math.exp(-s / t) * Math.sin(ph);
    }
  }
  const strike = env(filter(noise(0.012, seed), "hp", 2200), (s) => Math.exp(-s / 0.0015));
  add(out, strike, 0, click);
  const attack = 0.0012;
  return filter(env(out, (s) => (s < attack ? s / attack : 1)), "lp", 6500);
};

/** Pen on paper: bright noise, a scratchy flutter, rising and falling once. */
const swish = (len, seed) => {
  const r = mulberry32(seed + 99);
  const flutter = filter(samples(len).map(() => r() * 2 - 1), "lp", 28);
  const peak = flutter.reduce((m, v) => Math.max(m, Math.abs(v)), 0) || 1;
  const n = filter(filter(noise(len, seed), "bp", 4200, 0.7), "hp", 1800);
  return env(n, (s) => {
    const u = s / len;
    const shape = Math.sin(Math.PI * Math.min(1, u ** 0.8)) ** 1.5;
    return shape * (0.72 + 0.28 * (flutter[Math.min(flutter.length - 1, Math.round(s * SR))] / peak));
  });
};

/** Many tiny dots at once: high, short grains scattered in time and across the field. */
const grains = (len, count, seed, { spread = 0.6, over = len * 0.8, lo = 3800, hi = 7000, decay = 0.006 } = {}) => {
  const r = mulberry32(seed);
  const pair = stereo(len);
  for (let k = 0; k < count; k++) {
    const at = r() * over;
    const f = lo + (hi - lo) * r();
    const g = samples(0.03);
    for (let i = 0; i < g.length; i++) g[i] = Math.exp(-i / SR / decay) * Math.sin((2 * Math.PI * f * i) / SR);
    const tick = add(g, env(filter(noise(0.004, seed * 1000 + k), "hp", 3000), (s) => Math.exp(-s / 0.0008)), 0, 0.5);
    place(pair, tick, at, (r() * 2 - 1) * spread, 0.35 + 0.65 * r());
  }
  return pair;
};

/** Soft paper taps at a fixed spacing, for squares filling in one after another. */
const taps = (count, spacing, seed) => {
  const r = mulberry32(seed);
  const pair = stereo(count * spacing + 0.25);
  for (let k = 0; k < count; k++) {
    const f = 300 + 40 * r();
    const thud = samples(0.16);
    for (let i = 0; i < thud.length; i++) thud[i] = Math.exp(-i / SR / 0.035) * Math.sin((2 * Math.PI * f * i) / SR);
    const paper = env(filter(noise(0.03, seed * 100 + k), "bp", 2400, 0.9), (s) => Math.exp(-s / 0.006));
    add(thud, paper, 0, 0.9);
    place(pair, thud, k * spacing + r() * 0.004, -0.55 + 0.1 * r(), 0.75 + 0.25 * r());
  }
  return pair;
};

/** A filtered-noise sweep: `from` to `to` Hz, shaped by `shape(u)` over its length. */
const sweep = (len, seed, from, to, q, shape) => {
  const n = filter(noise(len, seed), "bp", (s) => from * (to / from) ** (s / len), q);
  return env(n, (s) => shape(s / len));
};

/** A small glass bell: inharmonic partials, the fundamental beating slowly against a twin. */
const bell = (f0, len) => {
  const pair = stereo(len);
  const partials = [
    [1, 1, 0.9, -0.15],
    [1.0025, 0.6, 0.8, 0.15],
    [2.0, 0.18, 0.5, 0.25],
    [2.76, 0.28, 0.35, -0.25],
    [5.4, 0.08, 0.15, 0.3],
  ];
  for (const [ratio, amp, tau, pan] of partials) {
    const x = samples(len);
    for (let i = 0; i < x.length; i++) {
      const s = i / SR;
      x[i] = amp * Math.exp(-s / tau) * Math.sin(2 * Math.PI * f0 * ratio * s) * Math.min(1, s / 0.003);
    }
    place(pair, x, 0, pan);
  }
  return pair;
};

// ── The palette ──────────────────────────────────────────────────────────────

const mono = (x, pan = 0) => place(stereo(x.length / SR), x, 0, pan);

const SOUNDS = {
  // A value lands in its place: an average dropping into a chart, a dot on a scale.
  "tock-low": mono(knock(440, { seed: 3 }), -0.1),
  "tock-mid": mono(knock(494, { seed: 4 }), -0.1),
  "tock-high": mono(knock(587, { seed: 5 }), 0.3),
  // Two averages landing at once, one in each pile: the random one on the
  // left, the easy one on the right, a few ms apart so they never phase.
  ...Object.fromEntries(
    Array.from({ length: 6 }, (_, k) => {
      const r = mulberry32(700 + k);
      const pair = stereo(0.16);
      place(pair, knock(900 + 120 * r(), { tau: 0.026, click: 0.16, seed: 10 + k, len: 0.15 }), 0, -0.55);
      place(pair, knock(1170 + 160 * r(), { tau: 0.024, click: 0.16, seed: 20 + k, len: 0.15 }), 0.004, 0.55, 0.9);
      return [`pip-${k + 1}`, pair];
    }),
  ),
  // Five hundred dots appearing along a strip.
  "sprinkle-1": grains(0.8, 70, 31),
  "sprinkle-2": grains(0.8, 70, 32),
  "sprinkle-3": grains(0.8, 70, 33, { spread: 0.35 }),
  // Dots sliding together into their average.
  gather: (() => {
    const len = 0.5;
    const shape = (u) => (u < 0.88 ? (u / 0.88) ** 2 : Math.max(0, 1 - (u - 0.88) / 0.12));
    return [sweep(len, 41, 700, 2600, 1.4, shape), sweep(len, 42, 720, 2650, 1.4, shape)];
  })(),
  // A line being drawn: an underline or a bracket, and a longer arrow.
  swish: mono(swish(0.45, 51)),
  "swish-long": mono(swish(0.75, 52)),
  // A figure moving: the population shrinking up the page, a pile sliding.
  slide: (() => {
    const len = 0.9;
    const shape = (u) => Math.sin(Math.PI * u) ** 2;
    return [
      filter(sweep(len, 61, 280, 1100, 0.8, shape), "hp", 120),
      filter(sweep(len, 62, 300, 1150, 0.8, shape), "hp", 120),
    ];
  })(),
  // A pile narrowing as samples grow.
  tighten: (() => {
    const len = 1.1;
    const shape = (u) => Math.sin(Math.PI * Math.min(1, u * 1.05)) ** 2;
    return [sweep(len, 71, 900, 3600, 2.5, shape), sweep(len, 72, 920, 3650, 2.5, shape)];
  })(),
  // A hundred ballot outlines appearing in a riffle, and replies filling in.
  riffle: grains(1.4, 100, 81, { over: 1.15, lo: 1800, hi: 3600, decay: 0.004, spread: 0.3 }),
  "fill-roll": taps(24, 0.04, 91),
  // A conclusion lands. Short enough (1.8 s, down 17 dB by its end) to finish
  // inside the hold before a scene cut, since a scene's sounds stop with it.
  chime: bell(1046.5, 1.8),
  "chime-low": bell(784, 1.8),
};

// ── Write ────────────────────────────────────────────────────────────────────

const wav = ([l, r]) => {
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

mkdirSync(OUT, { recursive: true });
const lengths = {};
for (const [name, pair] of Object.entries(SOUNDS)) {
  const { bytes, seconds } = wav(pair);
  writeFileSync(join(OUT, `${name}.wav`), bytes);
  lengths[name] = Math.round(seconds * 1000) / 1000;
}
writeFileSync(join(OUT, "sounds.json"), JSON.stringify(lengths, null, 2) + "\n");
console.log(`${Object.keys(lengths).length} sounds in public/sfx/`);
