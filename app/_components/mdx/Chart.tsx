/**
 * Renders a build-time Observable Plot chart inside a lesson or landing page:
 *
 * ```mdx
 * <Chart slug="normal-68-95-997" />
 * ```
 *
 * The SVG is authored as a spec in `charts/<slug>.mjs`, rendered to markup by
 * `scripts/build-charts.mjs`, and read here from the generated manifest. Plot
 * itself never reaches the browser or the Worker bundle; this component ships
 * a string.
 *
 * The markup is *inlined* rather than referenced as `<img src="…svg">`, which
 * is what lets one file serve both themes: the site toggles dark mode with a
 * `.dark` class, and an `<img>` can't see page CSS. Inlined, the chart's
 * `currentColor` axes follow the page foreground and its `var(--ds-chart-*)`
 * series resolve against Chart.module.css, which maps each role to a different
 * brand step per theme.
 *
 * `title` (required on every spec) becomes the accessible name; the chart is
 * exposed as a single `role="img"` rather than letting a screen reader walk
 * several hundred `<path>` and tick nodes.
 *
 * A slug with no generated chart renders a "pending" hint while developing and
 * nothing at all in production, so a placement can be authored before its spec
 * exists — the same contract `<Figure>` offers for illustrations.
 */
import type { CSSProperties } from "react";
import { ChartLine } from "lucide-react";
import chartManifest from "@/lib/generated/charts";
import { withInlineMarkup } from "./inlineMarkup";
import { FigureSources, type FigureSource } from "./FigureSources";
import ChartExpand from "./ChartExpand";
import styles from "./Chart.module.css";

// The slug printed under each chart is an authoring handle (which spec file to
// edit), not something a learner should see, so it is development-only — same
// rule as <Figure>'s asset id.
const SHOW_CHART_ID = process.env.NODE_ENV === "development";

interface ChartProps {
  /** Spec slug: the `charts/<slug>.mjs` filename without its extension. */
  slug: string;
  /**
   * Caption shown under the chart. Defaults to the spec's own `caption`
   * export; pass `null` to render none, or a string to override it here.
   * Backtick spans render as code chips and `*asterisks*` as emphasis, so a
   * spec writing `` `s += piece` `` gets a code element rather than literal
   * backticks. Keep it to a sentence or two: the detail belongs in the lesson
   * prose around the chart, where a reader meets it before the figure.
   */
  caption?: string | null;
  /**
   * Where the chart's numbers came from, rendered as a credit line under the
   * caption. Defaults to the spec's own `sources` export, which is where it
   * belongs when the same chart is placed on several lessons; pass `null` to
   * render none, or a list here to override.
   */
  sources?: readonly FigureSource[] | null;
  /**
   * Optional cap on display width in px. Omitted by default so the chart
   * fills the content column.
   */
  maxWidth?: number;
}

export function Chart({ slug, caption, sources, maxWidth }: ChartProps) {
  const entry = chartManifest[slug];

  if (!entry) {
    if (process.env.NODE_ENV !== "development") return null;
    return (
      <span className={styles.pending} role="img" aria-label={`Chart pending: ${slug}`}>
        <ChartLine className={styles.pendingIcon} aria-hidden="true" />
        <span>
          Chart <code>{slug}</code> pending, add <code>charts/{slug}.mjs</code>{" "}
          and run <code>npm run build:charts</code>.
        </span>
      </span>
    );
  }

  const text = caption === undefined ? entry.caption : caption;
  const credits = (sources === undefined ? entry.sources : sources) ?? [];

  return (
    <figure
      className={styles.figure}
      style={maxWidth ? { maxWidth: `${maxWidth}px` } : undefined}
    >
      {/* `--ds-chart-min-width` is the narrowest width this chart's smallest
          label survives (computed by the build, see charts.d.ts). On a wide
          column nothing consumes it; on a phone the stylesheet lets the
          figure scroll rather than scale its type into the ground — and
          <ChartExpand> offers the whole drawing at once for the comparisons
          that scrolling cannot serve. */}
      <ChartExpand label={entry.title}>
        <div
          className={styles.chart}
          role="img"
          aria-label={entry.title}
          style={
            entry.minWidth
              ? ({ "--ds-chart-min-width": `${entry.minWidth}px` } as CSSProperties)
              : undefined
          }
          // Build-time output from our own spec files, never user input.
          dangerouslySetInnerHTML={{ __html: entry.svg }}
        />
      </ChartExpand>
      {/* One <figcaption> per <figure>: the credit line renders inside it
          rather than as a second one. */}
      {text || credits.length > 0 ? (
        <figcaption className={styles.caption}>
          {text ? withInlineMarkup(text) : null}
          <FigureSources sources={credits} />
        </figcaption>
      ) : null}
      {SHOW_CHART_ID ? (
        <figcaption className={styles.caption} style={{ opacity: 0.55, fontSize: "0.6875rem" }}>
          <code>charts/{slug}.mjs</code>
        </figcaption>
      ) : null}
    </figure>
  );
}

export default Chart;
