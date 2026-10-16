/**
 * How much of the picture changes from one sampled frame to the next, and
 * where it stops changing. The check behind `npm run check:motion`: a video
 * whose picture holds still while the narrator keeps talking reads as static
 * and dull, even when every animation in it is right.
 */
import { spawn } from "node:child_process";

/** Frames are compared at this size, in grey, which is plenty to see motion. */
export const SAMPLE = { width: 480, height: 270, fps: 4 };
/** A pixel has changed when it moves by more than this (of 255). */
const PIXEL_DELTA = 12;

/**
 * Decodes a video with Remotion's bundled ffmpeg and returns, for each
 * sampled frame after the first, its time and the fraction of pixels that
 * changed since the frame before.
 */
export function frameChanges(file, { width, height, fps } = SAMPLE) {
  return new Promise((resolve, reject) => {
    // Remotion's ffmpeg has no `fps` filter and no rawvideo muxer, so the
    // rate goes on the output and raw grey frames go through image2pipe.
    const ff = spawn(
      "npx",
      ["remotion", "ffmpeg", "-hide_banner", "-loglevel", "error", "-i", file,
        "-r", String(fps), "-vf", `scale=${width}:${height},format=gray`, "-c:v", "rawvideo", "-f", "image2pipe", "-"],
      { shell: process.platform === "win32" },
    );
    const size = width * height;
    const out = [];
    let pending = Buffer.alloc(0);
    let prev = null;
    let k = 0;
    let err = "";
    ff.stderr.on("data", (d) => (err += d));
    ff.stdout.on("data", (d) => {
      pending = pending.length ? Buffer.concat([pending, d]) : d;
      while (pending.length >= size) {
        const frame = pending.subarray(0, size);
        if (prev) {
          let n = 0;
          for (let i = 0; i < size; i++) if (Math.abs(frame[i] - prev[i]) > PIXEL_DELTA) n++;
          out.push({ t: k / fps, changed: n / size });
        }
        prev = Buffer.from(frame);
        pending = pending.subarray(size);
        k++;
      }
    });
    ff.on("error", reject);
    ff.on("close", (code) => (code === 0 ? resolve(out) : reject(new Error(`ffmpeg exited ${code}: ${err.trim()}`))));
  });
}

/**
 * The stretches where the picture holds still: runs of at least `minSeconds`
 * in which every sampled frame changed less than `threshold` of its pixels
 * (0.05% by default, about 65 pixels at 480x270, which a gently bobbing
 * illustration stays under). Returns { start, end } in seconds.
 */
export function staticSpans(changes, { threshold = 0.0005, minSeconds = 3 } = {}) {
  const spans = [];
  let from = null;
  const close = (t) => {
    if (from !== null && t - from >= minSeconds) spans.push({ start: from, end: t });
    from = null;
  };
  for (let i = 0; i < changes.length; i++) {
    const { t, changed } = changes[i];
    // A still frame means nothing changed in the interval that ended at t.
    const step = i > 0 ? t - changes[i - 1].t : t;
    if (changed < threshold) from ??= t - step;
    else close(t - step);
  }
  if (changes.length) close(changes.at(-1).t);
  return spans;
}
