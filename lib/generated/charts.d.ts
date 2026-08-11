/**
 * Types for the generated chart manifest (`lib/generated/charts.js`, produced
 * by `scripts/build-charts.mjs` from the Observable Plot specs in `charts/`).
 *
 * Committed even though the `.js` it describes is gitignored: it keeps
 * typecheck/lint green on a fresh checkout before the build script has run.
 */

/** A page whose MDX carries this chart's `<Chart>` tag. */
export interface ChartUsage {
  /** Site-relative route, e.g. `/courses/<course>/<lesson>`. */
  url: string;
  /** The page's frontmatter title, falling back to its url. */
  title: string;
  /** Content collection the page belongs to (`courses`, `interview`, …). */
  collection: string;
  /** Display name of the course or interview track the lesson sits in, from
   *  that directory's meta.json. Absent for a top-level page that belongs to
   *  no course. */
  section?: string;
}

export interface GeneratedChart {
  /** Accessible name for the whole figure (the spec's `title` export). */
  title: string;
  /** Default caption, when the spec exports one. */
  caption?: string;
  /** Intrinsic size the SVG was laid out at, in px. */
  width: number;
  height: number;
  /**
   * Narrowest width, in px, at which this chart's smallest label is still
   * readable. Computed by the build from the type in the rendered markup:
   * scaling an inlined SVG scales its type too, so a chart carrying 9px
   * annotations goes illegible on a phone long before one whose smallest
   * type is a 13px tick. `<Chart>` publishes it as a CSS custom property and
   * the stylesheet lets the figure scroll rather than shrink past it.
   *
   * Absent when the chart has no type small enough to matter, which is the
   * common case.
   */
  minWidth?: number;
  /** Every page that renders this chart. Empty when the spec exists but has
   *  not been placed in a lesson yet. */
  usedBy: ChartUsage[];
  /** Serialized `<svg>`, colored entirely with `currentColor` and
   *  `var(--ds-chart-*)` so it reads in both themes when inlined. */
  svg: string;
}

declare const charts: Record<string, GeneratedChart>;

export default charts;

/** Digest of `charts/`, the build script, and the Plot version. The build
 *  exits before importing Plot when it still matches. */
export declare const digest: string;
