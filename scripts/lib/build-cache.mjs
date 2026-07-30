// Tiny input-hash cache shared by the content generator scripts
// (build-search-index.mjs), so unchanged-content
// runs skip their expensive scan/parse work entirely.
//
// A generator computes one sha256 over all of its input files (path +
// bytes, sorted) and compares it to the hash stored on its previous run. On
// a match — and only if every declared output still exists — the run is a
// no-op. Manifests live under node_modules/.cache (same place
// build-search-index.mjs keeps its esbuild bundle): a fresh `npm ci`
// wipes them, which just means the first run after an install regenerates,
// exactly like before this cache existed.
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative } from "node:path";

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

/** sha256 over the given files' repo-relative paths + contents. Order-stable
 *  (paths are sorted); unreadable files hash as absent. */
export function hashInputs(root, files) {
  const h = createHash("sha256");
  for (const file of [...files].sort()) {
    h.update(relative(root, file));
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

function manifestPath(root, name) {
  return join(root, "node_modules", ".cache", "dataslope-build", `${name}.json`);
}

/** True when `name`'s stored input hash matches AND every output exists. */
export function isFresh(root, name, inputsHash, outputs) {
  if (!outputs.every((o) => existsSync(o))) return false;
  try {
    const stored = JSON.parse(readFileSync(manifestPath(root, name), "utf8"));
    return stored.inputsHash === inputsHash;
  } catch {
    return false;
  }
}

/** Record `name`'s input hash after a successful generation. */
export function writeManifest(root, name, inputsHash) {
  const p = manifestPath(root, name);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify({ inputsHash }));
}
