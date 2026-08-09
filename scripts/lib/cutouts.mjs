// Answering "which pristine PNG in R2 is this served illustration made of?".
//
// Shared by the three scripts that need it: `trim-cutouts.mjs` re-crops from
// the source it names, `build-illustration-sources.mjs` writes the answers
// down as committed provenance, and `prune-illustration-candidates.mjs` uses
// those answers to decide what is safe to delete.
//
// ── Why matching, and not the run id ────────────────────────────────────────
//
// A prompt id usually exists in several R2 runs: a redraw writes a new run
// prefix and leaves the old one alone. Crucially, a redraw is *generated*
// before it is judged, and plenty were never promoted — so the newest run is
// routinely not the live one. Measured across 284 ids, "keep the newest run"
// disagrees with the truth for 107 of them, 38%. Anything built on run
// recency would delete the live source for a third of the artwork.
//
// So the question is answered from pixels. The separation is not close: the
// true source scores 33-55 dB against the file the site serves, and every
// other run of the same id lands at 6-11.
//
// ── Why content is normalised first ─────────────────────────────────────────
//
// `trim-cutouts.mjs` crops the transparent band off the served WebP, so it no
// longer has the same shape as the PNG it came from, and comparing whole
// frames would call them different pictures — matching would break the moment
// it was first used, and the pristine source would be unreachable from then
// on. Both sides are therefore cropped to their own drawn content before the
// comparison, which asks "is this the same artwork?" rather than "is this the
// same rectangle?".
import sharp from "sharp";
import { createR2Client, credentialsFromEnv } from "./r2.mjs";

/** Premultiplied PSNR, in dB, above which a candidate is accepted. Real
 *  matches score 33-55, a different render of the same prompt 6-11, so
 *  anywhere in the thirties separates them; 30 is the floor. */
export const MATCH_FLOOR = 30;

/**
 * First and last row of an RGBA image that carry drawn content.
 *
 * A pixel counts as drawn once its alpha clears `alpha` (16 by default, which
 * ignores the faint halo a background remover leaves), and a row counts once
 * `rowFrac` of its pixels are (0.2%, so a stray speck of leftover background
 * cannot defeat a trim). Both thresholds are pinned in
 * `__tests__/trimCutouts.test.ts` against synthetic images.
 */
export async function verticalBounds(buf, { alpha = 16, rowFrac = 0.002 } = {}) {
  const { data, info } = await sharp(buf)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const need = Math.max(1, Math.round(width * rowFrac));

  const drawn = (y) => {
    let count = 0;
    const row = y * width * channels;
    for (let x = 0; x < width; x++) {
      if (data[row + x * channels + 3] > alpha && ++count >= need) return true;
    }
    return false;
  };

  let top = 0;
  let bottom = height - 1;
  while (top < height && !drawn(top)) top++;
  while (bottom >= top && !drawn(bottom)) bottom--;
  return { width, height, top, bottom, empty: top > bottom };
}

/**
 * Turn bounds into the crop to apply, or null when it isn't worth it.
 *
 * Returns null for a fully transparent image (nothing to centre the crop on)
 * and for one already tight enough that the trim would remove less than
 * `minGain` of its height — which is what makes a re-run a no-op instead of a
 * fresh lossy generation for a percent of nothing.
 *
 * Exported for `__tests__/trimCutouts.test.ts`.
 */
export function trimPlan(bounds, { pad = 0.02, minGain = 0.02 } = {}) {
  if (bounds.empty) return null;
  const padPx = Math.round(bounds.height * pad);
  const top = Math.max(0, bounds.top - padPx);
  const bottom = Math.min(bounds.height - 1, bounds.bottom + padPx);
  const height = bottom - top + 1;
  const removed = 1 - height / bounds.height;
  if (removed < minGain) return null;
  return { top, height, removed };
}

/** An image reduced to just its drawn content, at a fixed small size — the
 *  crop-invariant form the comparison below is defined on. */
export async function contentSignature(buf) {
  const bounds = await verticalBounds(buf);
  const img = sharp(buf);
  if (!bounds.empty) {
    img.extract({
      left: 0,
      top: bounds.top,
      width: bounds.width,
      height: bounds.bottom - bounds.top + 1,
    });
  }
  return img.resize({ width: 128, height: 128, fit: "fill" }).ensureAlpha().raw().toBuffer();
}

/**
 * Premultiplied PSNR between two content signatures, in dB.
 *
 * Premultiplying matters: RGB under a fully transparent pixel is undefined and
 * each encoder is free to rewrite it, so a naive comparison reports a large
 * difference across exactly the blank regions this pipeline removes.
 */
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
 * Read-only index of the cut-out candidates in R2.
 *
 * **Reads only.** Nothing here puts or deletes; deletion lives in
 * `prune-illustration-candidates.mjs`, behind its own explicit flag.
 */
export function createCandidateIndex() {
  const client = createR2Client(credentialsFromEnv());

  // Cache the *promise*, not the map it resolves to. Publishing a half-filled
  // map and awaiting the listing afterwards is a race with teeth: a second
  // worker finds a truthy (empty) index, concludes the id has no candidate,
  // and silently takes whatever fallback its caller has. Nothing fails — the
  // run just quietly does the wrong thing for most of the images.
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
     * Candidates are tried newest run first and the search stops at the first
     * one over the floor rather than scoring them all. Over 900 images that is
     * the difference between downloading every historical redraw (~2 GB) and
     * usually downloading one; the floor is nowhere near ambiguous, so "first
     * over 30" and "best of all" cannot disagree. Run ids are dated, so
     * sorting descending is chronological enough to make the guess pay off.
     *
     * `bestDb` distinguishes the two ways to miss: null means no candidate
     * exists for this id at all, a number means one does and did not match.
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
