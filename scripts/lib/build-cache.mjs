// Input cache shared by the content generator scripts, so an unchanged tree
// makes `npm run dev` / `npm run build` skip their scan/parse work.
//
// Freshness is decided in two tiers: (1) a stat signature (path+size+mtime,
// no file opened) for the steady state, and (2) a content hash consulted only
// when the stat signature moved — a clone, branch switch, or `npm ci`
// rewrites mtimes without changing bytes, and a byte-identical tier-2 hit
// re-stamps so the next run is back on tier 1. Content is the authority: a
// changed byte always regenerates. Tier 1 is trusted only for inputs written
// strictly before the stamp (git's racy-index rule; see the check below).
// Manifests live under `node_modules/.cache/dataslope-build/`, so `npm ci`
// wipes them and the first run after an install regenerates.
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

// This file is an input to every generator that uses it: changing how
// freshness is decided must invalidate stamps written under the old rules.
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

/** One stat pass: the cheap signature, and the newest mtime it saw. mtime is
 *  rounded to whole ms — `mtimeMs` is a float whose sub-ms tail is not stable
 *  across a copy. */
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

/** sha256 over the given files' repo-relative paths + size + mtime. Opens
 *  nothing: a claim about which files exist and when they were written, not
 *  about their contents. */
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
 * null). Call `commit(extra)` after a successful generation; `extra` is
 * merged into the manifest and comes back as `stored` next time. A generator
 * that only learns its true input set by running (the worker bundler, via
 * esbuild's metafile) passes that set as `commit`'s second argument so the
 * stamp describes what was actually read. `outputs` are checked for
 * existence, so a deleted output regenerates even with untouched inputs.
 * `salt` folds a non-file input into both signatures (e.g. `HEAD` for
 * build-created-at, which reads git history).
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
  // Tier 1, with git's racy-index rule: trust the stat signature only when
  // the stamp was taken strictly after the newest input was written — within
  // one clock tick "same size, same mtime, different bytes" is reachable.
  // Anything closer (or dated in the future) falls through to the bytes:
  // slower, never wrong.
  if (stored.statSig === statSig && stored.stampedAt > scan.newest) {
    return { fresh: true, stored, commit };
  }

  // Tier 2: timestamps moved but content may not have. If the bytes agree,
  // re-stamp so the next run settles back onto the cheap check.
  if (stored.inputsHash && stored.inputsHash === season(hashInputs(root, all))) {
    writeManifest(root, name, { ...stored, statSig, stampedAt: Date.now() });
    return { fresh: true, stored, commit };
  }
  return { fresh: false, stored, commit };
}
