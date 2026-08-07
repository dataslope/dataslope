/**
 * Types for the generated chart manifest (`lib/generated/charts.js`, produced
 * by `scripts/build-charts.mjs` from the Observable Plot specs in `charts/`).
 *
 * Committed even though the `.js` it describes is gitignored: it keeps
 * typecheck/lint green on a fresh checkout before the build script has run.
 */

export interface GeneratedChart {
  /** Accessible name for the whole figure (the spec's `title` export). */
  title: string;
  /** Default caption, when the spec exports one. */
  caption?: string;
  /** Intrinsic size the SVG was laid out at, in px. */
  width: number;
  height: number;
  /** Serialized `<svg>`, coloured entirely with `currentColor` and
   *  `var(--ds-chart-*)` so it reads in both themes when inlined. */
  svg: string;
}

declare const charts: Record<string, GeneratedChart>;

export default charts;

/** Digest of `charts/`, the build script, and the Plot version. The build
 *  exits before importing Plot when it still matches. */
export declare const digest: string;
