// Tiny input cache shared by the content generator scripts, so an unchanged
// tree makes `npm run dev` / `npm run build` skip their scan/parse work
// entirely.
//
// ── Two tiers, because the check itself was the cost ────────────────────────
//
// The first version of this hashed every input's *bytes* and compared that to
// the previous run's hash. It made the generators idempotent, but it did not
// make them cheap: proving that 834 lessons were unchanged still meant reading
// all 834 of them, and proving that 1832 images were unchanged meant reading
// ~340 MB. On a cold page cache that check cost more than a second per
// generator, and on Windows (no page cache to speak of across processes, plus
// a virus scanner in the path) rather more than that.
//
// So freshness is now decided in two tiers:
//
//   1. **Stat signature** — path + size + mtime for every input, hashed. No
//      file is opened. This is the steady state: ~10 ms for a thousand files,
//      and it is what runs on the second, third and hundredth `npm run dev`.
//   2. **Content hash** — only consulted when the stat signature moved. A
//      fresh clone, a branch switch, or `npm ci` rewrites mtimes without
//      changing a byte, and re-running a 26-second parse for that would be
//      the cache failing at exactly the moment it is most wanted. When the
//      bytes turn out to match, the stored stat signature is refreshed so the
//      *next* run is back on tier 1.
//
// Content is still the authority: a changed byte always regenerates, whatever
// the timestamps say. "Same size, same mtime, different bytes" is reachable
// inside a single clock tick, so tier 1 is trusted only for inputs written
// strictly before the stamp was taken — git's racy-index rule, spelled out at
// the check itself. Everything else falls through to tier 2.
//
// Manifests live under `node_modules/.cache/dataslope-build/`, so a fresh
// `npm ci` wipes them and the first run after an install regenerates — exactly
// what happened before this cache existed.
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

// This file is an input to every generator that uses it: change how freshness
// is decided and every stamp written under the old rules has to be discarded,
// or the first run after the change would trust a signature that no longer
// means what it meant. Folding it in here rather than asking each caller to
// remember is the only version of this that stays true.
const SELF = fileURLToPath(import.meta.url);

/** Recursively collect files under `dir` whose basename passes `filter`
 *  (default: everything), as sorted absolute paths. Missing dir → []. */
export function collectFiles(dir, filter = () => true) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const out = [];
  for (const entry of entries) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collectFiles(p, filter));
    else if (filter(entry.name)) out.push(p);
  }
  return out.sort();
}

/** Repo-relative, forward-slashed: the key a manifest stores, so a cache
 *  written on Windows and read on Linux (or vice versa) agrees with itself. */
const key = (root, file) => relative(root, file).split("\\").join("/");

/** sha256 over the given files' repo-relative paths + contents. Order-stable
 *  (paths are sorted); unreadable files hash as absent. */
export function hashInputs(root, files) {
  const h = createHash("sha256");
  for (const file of [...files].sort()) {
    h.update(key(root, file));
    h.update("\0");
    try {
      h.update(readFileSync(file));
    } catch {
      h.update("<unreadable>");
    }
    h.update("\0");
  }
  return h.digest("hex");
}

/**
 * One stat pass: the cheap signature, and the newest mtime it saw.
 *
 * mtime is taken in whole milliseconds. `mtimeMs` is a float on some
 * filesystems and its sub-millisecond tail is not stable across a copy, which
 * would make the signature differ from itself for no reason.
 */
function statScan(root, files) {
  const h = createHash("sha256");
  let newest = 0;
  for (const file of [...files].sort()) {
    h.update(key(root, file));
    h.update("\0");
    try {
      const s = statSync(file);
      const mtime = Math.round(s.mtimeMs);
      if (mtime > newest) newest = mtime;
      h.update(`${s.size}:${mtime}`);
    } catch {
      h.update("<missing>");
    }
    h.update("\0");
  }
  return { sig: h.digest("hex"), newest };
}

/**
 * sha256 over the given files' repo-relative paths + size + mtime. Opens
 * nothing, so this is the cheap tier: it is a claim about which files exist
 * and when they were last written, not about what is in them.
 */
export function statSignature(root, files) {
  return statScan(root, files).sig;
}

function manifestPath(root, name) {
  return join(root, "node_modules", ".cache", "dataslope-build", `${name}.json`);
}

/** The stored manifest for `name`, or null when absent/unreadable. */
export function readManifest(root, name) {
  try {
    return JSON.parse(readFileSync(manifestPath(root, name), "utf8"));
  } catch {
    return null;
  }
}

/** Replace `name`'s manifest. `freshness().commit` is the usual way in; this
 *  raw pair is for a generator that keeps its own per-file table rather than
 *  one signature over everything (build-images). */
export function writeManifest(root, name, data) {
  const p = manifestPath(root, name);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(data));
}

/**
 * Decide whether `name`'s outputs are still good for the given inputs.
 *
 * Returns `{ fresh, stored, commit }`. `stored` is the previous manifest (or
 * null), which is how a generator that has to *discover* its own inputs — the
 * worker bundler learns them from esbuild's metafile — gets last run's list to
 * check against. Call `commit(extra)` after a successful generation to record
 * the new signatures; anything in `extra` is merged into the manifest and comes
 * back as `stored` next time. A generator that only learns its true input set
 * by running (again: the worker bundler) passes that set as `commit`'s second
 * argument, so the stamp describes what was actually read rather than what was
 * guessed beforehand — without it, the run after a first build would always
 * miss, and every build would cost two.
 *
 * `outputs` are checked for existence, so deleting `public/courses/` (or a
 * `.gitignore`d output never restored by a clone) regenerates even when every
 * input is untouched.
 *
 * `salt` folds a non-file input into both signatures, for the generator whose
 * answer depends on something `stat` cannot see — `build-created-at` reads git
 * history, so its salt is `HEAD`.
 *
 * @param {string} root Repo root; paths are stored relative to it.
 * @param {string} name Manifest name, one per generator.
 * @param {{inputs: string[], outputs?: string[], salt?: string}} spec
 * @returns {{
 *   fresh: boolean,
 *   stored: Record<string, any> | null,
 *   commit: (extra?: Record<string, any>, finalInputs?: string[]) => void,
 * }}
 */
export function freshness(root, name, { inputs, outputs = [], salt = "" }) {
  const stored = readManifest(root, name);
  const season = (sig) => createHash("sha256").update(salt).update("\0").update(sig).digest("hex");
  const all = [SELF, ...inputs];
  const scan = statScan(root, all);
  const statSig = season(scan.sig);

  const commit = (extra = {}, finalInputs = inputs) => {
    const list = [SELF, ...finalInputs];
    writeManifest(root, name, {
      ...extra,
      statSig: season(statScan(root, list).sig),
      inputsHash: season(hashInputs(root, list)),
      stampedAt: Date.now(),
    });
  };

  if (!stored || !outputs.every((o) => existsSync(o))) {
    return { fresh: false, stored, commit };
  }
  // Tier 1, with git's racy-index rule: trust the stat signature only when the
  // stamp was taken *strictly after* the newest input was written. Within one
  // clock tick, "same size, same mtime" is reachable with different bytes —
  // rewrite a file in the same millisecond the stamp was recorded and the
  // signature would agree about content it never saw. When the two are that
  // close the answer falls through to the bytes below, and the re-stamp pushes
  // `stampedAt` clear of the inputs so the next run is cheap again.
  //
  // A file dated in the future (clock skew, or an archive that restored its
  // timestamps) never satisfies the rule and so is always content-checked:
  // slower, never wrong.
  if (stored.statSig === statSig && stored.stampedAt > scan.newest) {
    return { fresh: true, stored, commit };
  }

  // Tier 2: the timestamps moved, but that is not the same as the content
  // moving. Pay for the bytes once, and if they agree, re-stamp so the next
  // run settles back onto the cheap check.
  if (stored.inputsHash && stored.inputsHash === season(hashInputs(root, all))) {
    writeManifest(root, name, { ...stored, statSig, stampedAt: Date.now() });
    return { fresh: true, stored, commit };
  }
  return { fresh: false, stored, commit };
}
