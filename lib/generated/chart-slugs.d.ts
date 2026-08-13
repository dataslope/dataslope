/**
 * Types for the generated chart slug index (`lib/generated/chart-slugs.js`,
 * produced by `scripts/build-charts.mjs` alongside `charts.js`).
 *
 * Committed even though the `.js` it describes is gitignored: it keeps
 * typecheck/lint green on a fresh checkout before the build script has run.
 *
 * Why this exists at all: API routes compile as their own bundler graph, so
 * a route importing the full manifest ships a second copy of every chart's
 * serialized SVG in the deployed Worker. A route that only needs "does this
 * slug exist?" imports this instead.
 */

declare const slugs: readonly string[];

export default slugs;
