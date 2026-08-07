/**
 * Admin → Charts: every generated Observable Plot figure, shown on both page
 * surfaces at once, with a way back to the lesson it appears on.
 *
 * The point of the page is the side-by-side. A chart is authored once, in
 * `charts/<slug>.mjs`, and rendered once, into a single SVG that has to read
 * correctly on white *and* on the near-black page (see charts/_theme.mjs for
 * how). That is the one property of this pipeline you cannot check while
 * writing a spec, because your editor and your browser are on one theme at a
 * time. Here each figure is drawn twice, in panes pinned to each theme, so a
 * series colour that goes muddy in dark mode is visible immediately rather
 * than after someone flips the site toggle on the lesson.
 *
 * No cards: a filled panel behind a figure is a third surface competing with
 * the two the figure is being judged against. The only painted rectangles on
 * this page are the theme panes themselves.
 *
 * ── Why an optional catch-all route ────────────────────────────────────────
 *
 * Pagination is a route segment, not client state, because each chart's markup
 * is ~13 KB of inline SVG. Slicing on the client would still ship every chart
 * in the payload, so a library that grows to a few hundred figures would send
 * megabytes to render twelve of them. As a segment, `generateStaticParams`
 * prerenders one static page per slice and each one carries only its own
 * charts. `/dashboard/admin/charts` is page 1; `/…/charts/2` is the next.
 *
 * Server component; the SVG and the usage index are both already in the
 * generated manifest, so there is nothing to fetch and the only client code is
 * the per-pane expand control. No auth gate either — this renders build
 * artifacts from this repo, not anyone's data (see the note on the tools band
 * in app/dashboard/_studio/nav.ts).
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import chartManifest from "@/lib/generated/charts";
import Link from "@/app/_components/Link";
import { AdminPageHeader } from "../../_components/shared";
import { ChartPane } from "../ChartPane";
import styles from "../charts.module.css";

export const dynamic = "force-static";

/** Charts per page. Each one is two stacked panes plus its metadata, so a
 *  dozen is already a long scroll; the number is here to be turned down, not
 *  up, as the library grows. */
const PER_PAGE = 12;

export const metadata: Metadata = {
  title: "Charts",
  description:
    "Every build-time Observable Plot chart, rendered in both light and dark mode.",
  robots: { index: false, follow: false },
};

const ALL = Object.entries(chartManifest).sort(([a], [b]) => a.localeCompare(b));
const PAGE_COUNT = Math.max(1, Math.ceil(ALL.length / PER_PAGE));

/** Page 1 is the bare route, so it keeps a clean canonical URL and existing
 *  links to `/dashboard/admin/charts` still land somewhere. */
const hrefFor = (n: number) =>
  n <= 1 ? "/dashboard/admin/charts" : `/dashboard/admin/charts/${n}`;

export function generateStaticParams() {
  return Array.from({ length: PAGE_COUNT }, (_, i) =>
    i === 0 ? { page: [] } : { page: [String(i + 1)] },
  );
}

export default async function AdminChartsPage(props: {
  params: Promise<{ page?: string[] }>;
}) {
  const { page: segments } = await props.params;

  // A single numeric segment, or nothing. Anything else (a stray path, page 0,
  // page 99) is a 404 rather than a silently clamped page, so a bad link is
  // visible instead of quietly showing the wrong slice.
  if (segments && segments.length > 1) notFound();
  const raw = segments?.[0];
  const current = raw === undefined ? 1 : Number(raw);
  if (!Number.isInteger(current) || current < 1 || current > PAGE_COUNT) notFound();
  // Page 1 has one URL, the bare route; `/charts/1` would be a duplicate.
  if (raw === "1") notFound();

  const charts = ALL.slice((current - 1) * PER_PAGE, current * PER_PAGE);
  const bytes = ALL.reduce((n, [, c]) => n + c.svg.length, 0);
  const placed = ALL.filter(([, c]) => c.usedBy.length > 0).length;

  return (
    <>
      <AdminPageHeader
        title="Charts"
        description="Every figure produced by scripts/build-charts.mjs, drawn on both page surfaces so a colour that only works in one theme has nowhere to hide."
      />

      {ALL.length === 0 ? (
        <p className={styles.empty}>
          No charts generated yet. Add a spec under <code>charts/</code> and run{" "}
          <code>npm run build:charts</code>.
        </p>
      ) : (
        <>
          {/* Totals, not this page's slice: the counts describe the library. */}
          <dl className={styles.stats}>
            <div className={styles.stat}>
              <dt>Charts</dt>
              <dd>{ALL.length}</dd>
            </div>
            <div className={styles.stat}>
              <dt>Placed in a lesson</dt>
              <dd>
                {placed}
                {placed < ALL.length ? (
                  <span className={styles.statNote}> of {ALL.length}</span>
                ) : null}
              </dd>
            </div>
            <div className={styles.stat}>
              <dt>Total SVG</dt>
              <dd>{(bytes / 1024).toFixed(0)} KB</dd>
            </div>
            {PAGE_COUNT > 1 ? (
              <div className={styles.stat}>
                <dt>Page</dt>
                <dd>
                  {current}
                  <span className={styles.statNote}> of {PAGE_COUNT}</span>
                </dd>
              </div>
            ) : null}
          </dl>

          <div className={styles.list}>
            {charts.map(([slug, chart]) => (
              <section key={slug} className={styles.item} id={slug}>
                <header className={styles.head}>
                  <div className={styles.headMain}>
                    <h2 className={styles.slug}>{slug}</h2>
                    {chart.caption ? (
                      <p className={styles.caption}>{chart.caption}</p>
                    ) : null}
                  </div>
                  <span className={styles.dims}>
                    {chart.width}×{chart.height} ·{" "}
                    {(chart.svg.length / 1024).toFixed(1)} KB
                  </span>
                </header>

                {/* Straight to the page the figure appears on: the gallery is
                    for spotting a problem, and fixing one always means reading
                    it in context first. */}
                <div className={styles.usedBy}>
                  {chart.usedBy.length > 0 ? (
                    chart.usedBy.map((use) => (
                      <Link
                        key={use.url}
                        href={use.url}
                        target="_blank"
                        rel="noreferrer"
                        prefetch={false}
                        className={styles.useLink}
                      >
                        {use.title}
                        <ArrowUpRight size={13} aria-hidden="true" />
                      </Link>
                    ))
                  ) : (
                    <span className={styles.unplaced}>Not placed in a lesson yet</span>
                  )}
                </div>

                <div className={styles.split}>
                  <ChartPane theme="light" slug={slug} title={chart.title} svg={chart.svg} />
                  <ChartPane theme="dark" slug={slug} title={chart.title} svg={chart.svg} />
                </div>

                <details className={styles.details}>
                  <summary className={styles.summary}>
                    Accessible name (the spec&apos;s <code>title</code>)
                  </summary>
                  <p className={styles.title}>{chart.title}</p>
                </details>
              </section>
            ))}
          </div>

          {PAGE_COUNT > 1 ? (
            <nav className={styles.pager} aria-label="Chart pages">
              <Link
                href={hrefFor(current - 1)}
                prefetch={false}
                aria-disabled={current === 1}
                tabIndex={current === 1 ? -1 : undefined}
                className={`${styles.pagerStep} ${current === 1 ? styles.pagerDisabled : ""}`}
              >
                <ChevronLeft size={14} aria-hidden="true" />
                Previous
              </Link>
              <span className={styles.pagerNums}>
                {Array.from({ length: PAGE_COUNT }, (_, i) => i + 1).map((n) => (
                  <Link
                    key={n}
                    href={hrefFor(n)}
                    prefetch={false}
                    aria-current={n === current ? "page" : undefined}
                    className={`${styles.pagerNum} ${n === current ? styles.pagerNumOn : ""}`}
                  >
                    {n}
                  </Link>
                ))}
              </span>
              <Link
                href={hrefFor(current + 1)}
                prefetch={false}
                aria-disabled={current === PAGE_COUNT}
                tabIndex={current === PAGE_COUNT ? -1 : undefined}
                className={`${styles.pagerStep} ${
                  current === PAGE_COUNT ? styles.pagerDisabled : ""
                }`}
              >
                Next
                <ChevronRight size={14} aria-hidden="true" />
              </Link>
            </nav>
          ) : null}
        </>
      )}
    </>
  );
}
