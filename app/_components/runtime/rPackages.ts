/**
 * Which R packages a block needs, read off its source.
 *
 * Extracted from `r.tsx` so `scripts/check-r-blocks.mjs` can install the same
 * set the reader's session installs. `r.tsx` is a React component and cannot
 * be imported from a script, and a sweep that guessed at this separately would
 * drift: install too few and lessons fail on a missing package that readers
 * have, install too many and the sweep is slower than it needs to be and stops
 * resembling the session under test.
 *
 * `r.tsx` imports these, so there is one definition.
 */

/** Shipped with webR's R build; `library()` on these never needs a download. */
export const R_BUILTIN_PACKAGES = new Set([
  "base", "compiler", "datasets", "graphics", "grDevices", "grid",
  "methods", "parallel", "splines", "stats", "stats4", "tcltk",
  "tools", "utils", "translations",
]);

/** Package names named by `library()` / `require()` / `requireNamespace()` /
 *  `loadNamespace()`, minus the built-ins. Comments are stripped first so a
 *  commented-out `library(dplyr)` does not trigger a download. */
export function extractLibraryCalls(code: string): string[] {
  const stripped = code
    .split("\n")
    .map((line) => {
      const idx = line.indexOf("#");
      return idx >= 0 ? line.slice(0, idx) : line;
    })
    .join("\n");

  const re =
    /\b(?:library|require|requireNamespace|loadNamespace)\s*\(\s*(?:"([^"]+)"|'([^']+)'|([A-Za-z_.][A-Za-z0-9_.]*))/g;
  const found = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(stripped)) !== null) {
    const name = m[1] ?? m[2] ?? m[3];
    if (!name) continue;
    if (!/^[A-Za-z][A-Za-z0-9_.]*$/.test(name)) continue;
    if (R_BUILTIN_PACKAGES.has(name)) continue;
    found.add(name);
  }
  return [...found];
}
