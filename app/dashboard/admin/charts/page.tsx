/**
 * Admin → Charts: every generated Observable Plot figure, shown on both page
 * surfaces at once.
 *
 * The point of the page is the side-by-side. A chart is authored once, in
 * `charts/<slug>.mjs`, and rendered once, into a single SVG that has to read
 * correctly on white *and* on the near-black page (see charts/_theme.mjs for
 * how). That is the one property of this pipeline you cannot check while
 * writing a spec, because your editor and your browser are on one theme at a
 * time. Here each figure is drawn twice, in panels pinned to each theme with
 * `data-force`, so a series colour that goes muddy in dark mode is visible
 * immediately rather than after someone flips the site toggle on the lesson.
 *
 * Server component: the SVG is already in the generated manifest, so there is
 * nothing to fetch and no client JavaScript. No auth gate either — this
 * renders build artifacts from this repo, not anyone's data (see the note on
 * the tools band in app/dashboard/_studio/nav.ts).
 */
import type { Metadata } from "next";
import chartManifest from "@/lib/generated/charts";
// The very stylesheet a lesson uses, so a chart is painted here by exactly the
// rules that will paint it in the course. Importing the same CSS module from a
// second file is what keeps this page a preview rather than a lookalike.
import chartStyles from "@/app/_components/mdx/Chart.module.css";
import { AdminPageHeader, Panel, PanelBody, PanelHeader } from "../_components/shared";
import styles from "./charts.module.css";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Charts",
  description:
    "Every build-time Observable Plot chart, rendered in both light and dark mode.",
  robots: { index: false, follow: false },
};

/** One theme-pinned copy of a chart. `data-force` is read by Chart.module.css,
 *  which is also what resolves the `--ds-chart-*` roles on a normal page. */
function ThemePane({ theme, svg }: { theme: "light" | "dark"; svg: string }) {
  return (
    <div className={`${styles.pane} ${styles[theme]}`}>
      <span className={styles.paneLabel}>{theme}</span>
      <div
        className={chartStyles.chart}
        data-force={theme}
        // Build-time output from our own spec files, never user input.
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </div>
  );
}

export default function AdminChartsPage() {
  const charts = Object.entries(chartManifest).sort(([a], [b]) => a.localeCompare(b));
  const bytes = charts.reduce((n, [, c]) => n + c.svg.length, 0);

  return (
    <>
      <AdminPageHeader
        title="Charts"
        description="Every figure produced by scripts/build-charts.mjs, drawn on both page surfaces so a colour that only works in one theme has nowhere to hide."
      />

      {charts.length === 0 ? (
        <Panel>
          <PanelBody>
            <p className="text-sm text-muted-foreground">
              No charts generated yet. Add a spec under <code>charts/</code> and
              run <code>npm run build:charts</code>.
            </p>
          </PanelBody>
        </Panel>
      ) : (
        <>
          <p className="mb-6 text-sm text-muted-foreground">
            {charts.length} chart{charts.length === 1 ? "" : "s"} ·{" "}
            {(bytes / 1024).toFixed(0)} KB of SVG total · authored in{" "}
            <code>charts/</code>, inlined by <code>&lt;Chart slug=&quot;…&quot; /&gt;</code>
          </p>

          <div className="flex flex-col gap-6">
            {charts.map(([slug, chart]) => (
              <Panel key={slug}>
                <PanelHeader
                  title={slug}
                  description={chart.caption ?? chart.title}
                  action={
                    <span className={styles.dims}>
                      {chart.width}×{chart.height} ·{" "}
                      {(chart.svg.length / 1024).toFixed(1)} KB
                    </span>
                  }
                />
                <PanelBody>
                  <div className={styles.split}>
                    <ThemePane theme="light" svg={chart.svg} />
                    <ThemePane theme="dark" svg={chart.svg} />
                  </div>
                  <details className={styles.details}>
                    <summary className={styles.summary}>
                      Accessible name (the spec&apos;s <code>title</code>)
                    </summary>
                    <p className={styles.title}>{chart.title}</p>
                  </details>
                </PanelBody>
              </Panel>
            ))}
          </div>
        </>
      )}
    </>
  );
}
