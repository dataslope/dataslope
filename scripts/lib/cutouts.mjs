// The geometry of a cut-out: where its artwork is, how much frame to keep,
// and which pristine PNG in R2 a served illustration was made of. Shared by
// promote-illustrations.mjs, trim-cutouts.mjs, build-illustration-sources.mjs
// and prune-illustration-candidates.mjs.
//
// Source matching is done by pixels, not run recency: a redraw writes a new
// run prefix without being promoted, so the newest run is wrong for ~38% of
// ids. Both sides are first cropped to their own drawn content (both axes, so
// the comparison is blind to prior crops), because trim-cutouts.mjs changes
// the served file's shape — the question is "same artwork?", not "same
// rectangle?".
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { createR2Client, credentialsFromEnv } from "./r2.mjs";

const ROOT = dirname(dirname(dirname(fileURLToPath(import.meta.url))));

/** Premultiplied PSNR, in dB, above which a candidate is accepted. Real
 *  matches score 33-55, a different render of the same prompt 6-11, so
 *  anywhere in the thirties separates them; 30 is the floor. */
export const MATCH_FLOOR = 30;

/**
 * The rectangle of an RGBA image that carries drawn content.
 *
 * A pixel is drawn once alpha clears `alpha` (16 ignores a background
 * remover's halo); a line counts once `frac` of its pixels are (0.2%, so a
 * stray speck cannot defeat a trim). Thresholds pinned in
 * `__tests__/trimCutouts.test.ts`. Columns are measured only within surviving
 * rows, so a speck too small to make a row cannot drag the left/right bound
 * out either.
 */
export async function contentBounds(buf, { alpha = 16, frac = 0.002 } = {}) {
  const { data, info } = await sharp(buf)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const at = (x, y) => data[(y * width + x) * channels + 3];

  const rowNeed = Math.max(1, Math.round(width * frac));
  const rowDrawn = (y) => {
    let count = 0;
    for (let x = 0; x < width; x++) if (at(x, y) > alpha && ++count >= rowNeed) return true;
    return false;
  };

  let top = 0;
  let bottom = height - 1;
  while (top < height && !rowDrawn(top)) top++;
  while (bottom >= top && !rowDrawn(bottom)) bottom--;
  if (top > bottom) {
    return { width, height, top: 0, bottom: height - 1, left: 0, right: width - 1, empty: true };
  }

  const colNeed = Math.max(1, Math.round((bottom - top + 1) * frac));
  const colDrawn = (x) => {
    let count = 0;
    for (let y = top; y <= bottom; y++) if (at(x, y) > alpha && ++count >= colNeed) return true;
    return false;
  };

  let left = 0;
  let right = width - 1;
  while (left < width && !colDrawn(left)) left++;
  while (right >= left && !colDrawn(right)) right--;
  return { width, height, top, bottom, left, right, empty: false };
}

/**
 * Turn bounds into the crop to apply, or null when it isn't worth it.
 *
 * `axes: "vertical"` keeps the full width (the default; see trim-cutouts.mjs),
 * `"both"` takes left/right blank too. `removed` is the fraction of the frame
 * removed. Returns null for a fully transparent image or when the trim would
 * remove less than `minGain` of the area — which makes a re-run a no-op
 * rather than a fresh lossy generation. Exported for
 * `__tests__/trimCutouts.test.ts`.
 */
export function trimPlan(bounds, { pad = 0.02, minGain = 0.02, axes = "vertical" } = {}) {
  if (bounds.empty) return null;
  const padY = Math.round(bounds.height * pad);
  const top = Math.max(0, bounds.top - padY);
  const bottom = Math.min(bounds.height - 1, bounds.bottom + padY);
  const height = bottom - top + 1;

  let left = 0;
  let width = bounds.width;
  if (axes === "both") {
    // Padding is proportional per axis, not a fixed pixel count.
    const padX = Math.round(bounds.width * pad);
    left = Math.max(0, bounds.left - padX);
    const right = Math.min(bounds.width - 1, bounds.right + padX);
    width = right - left + 1;
  }

  const removed = 1 - (width * height) / (bounds.width * bounds.height);
  if (removed < minGain) return null;
  return { left, top, width, height, removed };
}

/**
 * Which margins a cut-out's crop should take, from its prompt id: thumbnails
 * (shown small in a fixed box) on both axes, everything else vertically only.
 * The category comes from `data/illustration-prompts.json`; an id the corpus
 * doesn't know falls back to the naming convention, and
 * `__tests__/trimCutouts.test.ts` pins the two in agreement.
 */
const THUMBNAIL_SUFFIX = "-thumbnail";
let categoryById = null;

export function trimAxesFor(id) {
  categoryById ??= new Map(
    JSON.parse(readFileSync(join(ROOT, "data", "illustration-prompts.json"), "utf8"))
      .prompts.map((p) => [p.id, p.category]),
  );
  return (categoryById.get(id) ?? id).endsWith(THUMBNAIL_SUFFIX) ? "both" : "vertical";
}

/** An image reduced to just its drawn content, at a fixed small size — the
 *  crop-invariant form the comparison below is defined on. */
export async function contentSignature(buf) {
  const bounds = await contentBounds(buf);
  const img = sharp(buf);
  if (!bounds.empty) {
    img.extract({
      left: bounds.left,
      top: bounds.top,
      width: bounds.right - bounds.left + 1,
      height: bounds.bottom - bounds.top + 1,
    });
  }
  return img.resize({ width: 128, height: 128, fit: "fill" }).ensureAlpha().raw().toBuffer();
}

/** Premultiplied PSNR between two content signatures, in dB. Premultiplied
 *  because RGB under fully transparent pixels is encoder-defined, and a naive
 *  comparison reports large differences across exactly the blank regions this
 *  pipeline removes. */
export function similarity(x, y) {
  let se = 0;
  const pixels = x.length / 4;
  for (let i = 0; i < pixels; i++) {
    const xa = x[i * 4 + 3] / 255;
    const ya = y[i * 4 + 3] / 255;
    for (let k = 0; k < 3; k++) {
      const d = x[i * 4 + k] * xa - y[i * 4 + k] * ya;
      se += d * d;
    }
    const da = x[i * 4 + 3] - y[i * 4 + 3];
    se += da * da;
  }
  const mse = se / (pixels * 4);
  return mse === 0 ? Infinity : 10 * Math.log10((255 * 255) / mse);
}

/** The layout every candidate object follows. */
export const CANDIDATE_KEY = /^illustrations\/([^/]+)\/([^/]+)\/v(\d+)\/(\w+)\.png$/;

/**
 * Read-only index of the cut-out candidates in R2. Nothing here puts or
 * deletes; deletion lives in `prune-illustration-candidates.mjs`.
 */
export function createCandidateIndex() {
  const client = createR2Client(credentialsFromEnv());

  // Cache the promise, not the resolved map: a half-filled map would let a
  // second worker conclude an id has no candidate and silently take its
  // fallback.
  let indexing = null;
  const load = () =>
    (indexing ??= (async () => {
      const byId = new Map();
      const all = [];
      for (const key of await client.list("illustrations/")) {
        all.push(key);
        const m = CANDIDATE_KEY.exec(key);
        if (!m || m[4] !== "cutout") continue;
        if (!byId.has(m[2])) byId.set(m[2], []);
        byId.get(m[2]).push(key);
      }
      return { byId, all };
    })());

  return {
    describe: `r2://${client.bucket}/illustrations/`,
    bucket: client.bucket,
    /** Every key under `illustrations/`, candidate-shaped or not. */
    async allKeys() {
      return (await load()).all;
    },
    /**
     * The pristine cut-out PNG a served image was encoded from, or null.
     *
     * Candidates are tried newest run first, stopping at the first score over
     * the floor — usually one download instead of every historical redraw
     * (~2 GB over 900 images); the floor's separation is wide enough that
     * "first over 30" and "best of all" cannot disagree. `bestDb` is null
     * when no candidate exists at all, a number when one exists but missed.
     */
    async sourceFor(id, servedSig) {
      const { byId } = await load();
      const keys = [...(byId.get(id) ?? [])].sort().reverse();
      let bestDb = null;
      for (const key of keys) {
        const buf = await client.get(key);
        const db = similarity(servedSig, await contentSignature(buf));
        if (db >= MATCH_FLOOR) return { hit: { key, buf, db }, bestDb: db };
        if (bestDb === null || db > bestDb) bestDb = db;
      }
      return { hit: null, bestDb };
    },
  };
}
