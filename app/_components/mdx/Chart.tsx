/**
 * Renders a build-time Observable Plot chart. The SVG is authored as a spec in
 * `charts/<slug>.mjs`, rendered by `scripts/build-charts.mjs`, and read from
 * the generated manifest — Plot never reaches the browser or Worker bundle.
 * The markup is INLINED (not `<img src>`): an `<img>` can't see page CSS, and
 * inlining lets `currentColor` axes and `var(--ds-chart-*)` series follow the
 * theme. Exposed as a single `role="img"` named by the spec's `title`. A slug
 * with no generated chart shows a dev-only pending hint, nothing in prod.
 */
import type { CSSProperties } from "react";
import { ChartLine } from "lucide-react";
import chartManifest from "@/lib/generated/charts";
import { loadChartSvg } from "@/lib/charts/loadChartSvg";
import { withInlineMarkup } from "./inlineMarkup";
import { FigureSources, type FigureSource } from "./FigureSources";
import ChartExpand from "./ChartExpand";
import styles from "./Chart.module.css";

// The slug printed under each chart is an authoring handle, dev-only.
const SHOW_CHART_ID = process.env.NODE_ENV === "development";

interface ChartProps {
  /** Spec slug: the `charts/<slug>.mjs` filename without its extension. */
  slug: string;
  /** Caption under the chart. Defaults to the spec's `caption` export; `null`
   *  renders none. Backticks/asterisks render via `withInlineMarkup`. */
  caption?: string | null;
  /** Credit line for the chart's numbers. Defaults to the spec's `sources`
   *  export; `null` renders none. */
  sources?: readonly FigureSource[] | null;
  /** Optional cap on display width in px; omitted = full content column. */
  maxWidth?: number;
}

export async function Chart({ slug, caption, sources, maxWidth }: ChartProps) {
  const entry = chartManifest[slug];
  // The markup lives as a static asset, not in the manifest (which would put
  // the SVG corpus back into the Worker bundle). A missing file with a present
  // entry means the generator half-ran; treat it as pending.
  const svg = entry ? await loadChartSvg(slug) : null;

  if (!entry || svg === null) {
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
      {/* `--ds-chart-min-width` is the narrowest width the smallest label
          survives (build-computed); on a phone the stylesheet scrolls the
          figure rather than scaling its type into the ground. */}
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
          dangerouslySetInnerHTML={{ __html: svg }}
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
