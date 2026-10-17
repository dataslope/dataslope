/**
 * How much of the picture changes from one sampled frame to the next, and
 * where it stops changing. The check behind `npm run check:motion`: a video
 * whose picture holds still while the narrator keeps talking reads as static
 * and dull, even when every animation in it is right.
 *
 * Frames are compared in colour, two ways, because two kinds of change that
 * every viewer sees used to pass for stillness when they were compared in
 * grey:
 *
 *   - **A pale wash.** The highlight sweep and the pale bands change a pixel's
 *     hue far more than its brightness: the highlight at partial opacity moves
 *     the blue channel by about 45 levels and grey by under 12. So a pixel has
 *     changed when any channel moves by more than PIXEL_DELTA.
 *   - **A thin line drawing itself.** A 2 px ink line is under half a pixel
 *     wide at the sample size and adds a few dozen pixels a frame, under the
 *     0.05% bar, but each by a lot. So a frame also counts as moving when
 *     STRONG_SHARE of its pixels change by more than STRONG_DELTA.
 *
 * Measured on three voiced previews, the colour measure turned about a third
 * of the 2 s+ still stretches the grey one reported into motion, all of them
 * highlights, bands or line draws, and left the rest still.
 */
import { spawn } from "node:child_process";

/** Frames are compared at this size, which is plenty to see motion. */
export const SAMPLE = { width: 480, height: 270, fps: 4 };
/** A pixel has changed when one of its channels moves by more than this (of 255). */
export const PIXEL_DELTA = 12;
/** A pixel has changed a lot when a channel moves by more than this. */
export const STRONG_DELTA = 40;
/** A frame moves when this share of its pixels changed (about 65 at 480x270)… */
export const CHANGED_SHARE = 0.0005;
/** …or this share changed a lot (about 13 pixels: a thin line drawing on). */
export const STRONG_SHARE = 0.0001;

/**
 * Compares two RGB frames (3 bytes a pixel) and returns the share of pixels
 * that changed, and the share that changed a lot.
 */
export function compareFrames(a, b) {
  const pixels = a.length / 3;
  let changed = 0;
  let strong = 0;
  for (let i = 0; i < a.length; i += 3) {
    const d = Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2]));
    if (d > PIXEL_DELTA) changed++;
    if (d > STRONG_DELTA) strong++;
  }
  return { changed: changed / pixels, strong: strong / pixels };
}

/** Whether a sampled frame, as compareFrames measured it, counts as still. */
export const isStill = ({ changed, strong = 0 }, { threshold = CHANGED_SHARE, strongThreshold = STRONG_SHARE } = {}) =>
  changed < threshold && strong < strongThreshold;

/**
 * Decodes a video with Remotion's bundled ffmpeg and returns, for each
 * sampled frame after the first, its time and how much changed since the
 * frame before ({ t, changed, strong }).
 */
export function frameChanges(file, { width, height, fps } = SAMPLE) {
  return new Promise((resolve, reject) => {
    // Remotion's ffmpeg has no `fps` filter and no rawvideo muxer, so the
    // rate goes on the output and raw RGB frames go through image2pipe.
    const ff = spawn(
      "npx",
      ["remotion", "ffmpeg", "-hide_banner", "-loglevel", "error", "-i", file,
        "-r", String(fps), "-vf", `scale=${width}:${height}`, "-pix_fmt", "rgb24", "-c:v", "rawvideo", "-f", "image2pipe", "-"],
      { shell: process.platform === "win32" },
    );
    const size = width * height * 3;
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
        if (prev) out.push({ t: k / fps, ...compareFrames(frame, prev) });
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
 * in which every sampled frame is still by isStill (under 0.05% of its pixels
 * changed and under 0.01% changed a lot). Returns { start, end } in seconds.
 */
export function staticSpans(changes, { threshold = CHANGED_SHARE, strongThreshold = STRONG_SHARE, minSeconds = 3 } = {}) {
  const spans = [];
  let from = null;
  const close = (t) => {
    if (from !== null && t - from >= minSeconds) spans.push({ start: from, end: t });
    from = null;
  };
  for (let i = 0; i < changes.length; i++) {
    const { t } = changes[i];
    // A still frame means nothing changed in the interval that ended at t.
    const step = i > 0 ? t - changes[i - 1].t : t;
    if (isStill(changes[i], { threshold, strongThreshold })) from ??= t - step;
    else close(t - step);
  }
  if (changes.length) close(changes.at(-1).t);
  return spans;
}
