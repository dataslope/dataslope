/**
 * Admin → Charts: every generated Observable Plot figure drawn in panes pinned
 * to each theme, since a single SVG must read on white and near-black alike.
 * Pagination and sorting are route segments (not client state) because each
 * chart is ~13 KB of inline SVG; `generateStaticParams` prerenders one static
 * page per slice. No auth gate — this renders build artifacts, not user data;
 * only the layered-on review queue (ChartReview.tsx) is admin-only.
 */
import { Fragment } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import chartManifest from "@/lib/generated/charts";
import { loadChartSvg } from "@/lib/charts/loadChartSvg";
import createdAt from "@/lib/generated/created-at";
import {
  ORDERINGS,
  ORDERING_LABELS,
  isOrdering,
  orderBy,
  type Orderable,
  type Ordering,
} from "@/lib/review/ordering";
import Link from "@/app/_components/Link";
import { AdminPageHeader } from "../../_components/shared";
import { ChartPane } from "../ChartPane";
import {
  ChartDeleteControls,
  ChartMarkControls,
  ChartReviewProvider,
  ChartReviewSummary,
} from "../ChartReview";
import styles from "../charts.module.css";

export const dynamic = "force-static";

/** Charts per page (each is two stacked panes, so already a long scroll). */
const PER_PAGE = 20;

export const metadata: Metadata = {
  title: "Charts",
  description:
    "Every build-time Observable Plot chart, rendered in both light and dark mode.",
  robots: { index: false, follow: false },
};

type Entry = [slug: string, chart: (typeof chartManifest)[string]];

/** "3 Aug 2026". en-GB fixed: the page is prerendered, so the build machine's
 *  locale would otherwise be baked in. */
function formatCreated(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** `alpha` owns the bare URLs so existing links keep working and each slice
 *  has one canonical URL. Comparators live in lib/review/ordering.ts, shared
 *  with the illustration gallery. */
const DEFAULT_SORT: Ordering = "alpha";

/** Projection onto the shared ordering. `~` sorts after every letter, so
 *  unplaced charts collect at the end. */
function orderable([slug, chart]: Entry): Orderable {
  const use = chart.usedBy[0];
  return {
    id: slug,
    createdAt: createdAt.charts[slug] ?? null,
    group: use?.section ?? use?.title ?? "~",
  };
}

const PAGE_COUNT = Math.max(1, Math.ceil(Object.keys(chartManifest).length / PER_PAGE));

/** The date orderings, which are the two that get a date banner. */
const DATED: readonly Ordering[] = ["newest", "oldest"];

/**
 * How many charts share each creation date, across the whole library.
 *
 * Specs arrive in bulk: at the time of writing, three commits account for every
 * chart here, so a date ordering is mostly long runs of one timestamp. Inside a
 * run `compareCreated` falls back to the slug, which is correct (the sort has
 * to be total and stable) but means "oldest first" can render a page that is
 * character-for-character "A→Z" and reads as a button that did nothing.
 *
 * Counting the runs lets the page say so. It is not a workaround for a broken
 * comparator; the comparator is right and the underlying dates are real, and
 * the fix for a control that looks dead is to show the reader what it did.
 */
const DATE_RUNS: ReadonlyMap<string, number> = (() => {
  const runs = new Map<string, number>();
  for (const slug of Object.keys(chartManifest)) {
    const key = createdAt.charts[slug] ?? "";
    runs.set(key, (runs.get(key) ?? 0) + 1);
  }
  return runs;
})();

const sortedBy = (sort: Ordering): Entry[] =>
  orderBy(Object.entries(chartManifest) as Entry[], sort, orderable);

/** Page 1 of the default sort is the bare route, so it keeps a clean canonical
 *  URL and existing links still land somewhere. */
function hrefFor(sort: Ordering, n: number): string {
  const base = "/dashboard/admin/charts";
  const prefix = sort === DEFAULT_SORT ? base : `${base}/${sort}`;
  return n <= 1 ? prefix : `${prefix}/${n}`;
}

export function generateStaticParams() {
  return ORDERINGS.flatMap((sort) =>
    Array.from({ length: PAGE_COUNT }, (_, i) => {
      const n = i + 1;
      if (sort === DEFAULT_SORT) return { page: n === 1 ? [] : [String(n)] };
      return { page: n === 1 ? [sort] : [sort, String(n)] };
    }),
  );
}

export default async function AdminChartsPage(props: {
  params: Promise<{ page?: string[] }>;
}) {
  const { page: segments } = await props.params;

  // Accepted shapes: nothing, [page], [sort], [sort, page]. Anything else (a
  // stray path, page 0, an unknown sort) is a 404 rather than a silently
  // clamped page, so a bad link is visible instead of quietly showing the
  // wrong slice.
  if (segments && segments.length > 2) notFound();
  const [first, second] = segments ?? [];

  const sortSegment = first !== undefined && !/^\d+$/.test(first) ? first : undefined;
  if (sortSegment !== undefined && !isOrdering(sortSegment)) notFound();
  // The default sort owns the bare URLs, so naming it explicitly would give a
  // slice two addresses.
  if (sortSegment === DEFAULT_SORT) notFound();
  const sort = sortSegment ?? DEFAULT_SORT;

  const pageSegment = sortSegment === undefined ? first : second;
  if (sortSegment === undefined && second !== undefined) notFound();
  const current = pageSegment === undefined ? 1 : Number(pageSegment);
  if (!Number.isInteger(current) || current < 1 || current > PAGE_COUNT) notFound();
  // Page 1 has one URL per sort; `/…/1` would be a duplicate of it.
  if (pageSegment === "1") notFound();

  const ALL = sortedBy(sort);
  const charts = ALL.slice((current - 1) * PER_PAGE, current * PER_PAGE);
  const bytes = ALL.reduce((n, [, c]) => n + c.svgBytes, 0);
  const placed = ALL.filter(([, c]) => c.usedBy.length > 0).length;

  // The markup lives as one static asset per chart (see SVG_DIR in
  // build-charts.mjs), not in the manifest — only this page's slice is
  // loaded, so the gallery reads 20 files instead of holding all 5.7 MB.
  const svgBySlug = new Map(
    await Promise.all(
      charts.map(async ([slug]) => [slug, (await loadChartSvg(slug)) ?? ""] as const),
    ),
  );

  return (
    <ChartReviewProvider>
      <AdminPageHeader
        title="Charts"
        description="Every figure produced by scripts/build-charts.mjs, drawn on both page surfaces so a color that only works in one theme has nowhere to hide."
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

          {/* Plain links, not a client control: sorting is navigation here,
              and a <select> would need JavaScript to do what an <a> does. */}
          <nav className={styles.sortBar} aria-label="Sort charts">
            <span className={styles.sortLabel}>Sort by</span>
            {ORDERINGS.map((key) => (
              <Link
                key={key}
                href={hrefFor(key, 1)}
                prefetch={false}
                aria-current={key === sort ? "true" : undefined}
                className={`${styles.sortLink} ${key === sort ? styles.sortLinkOn : ""}`}
              >
                {ORDERING_LABELS[key]}
              </Link>
            ))}
          </nav>

          <ChartReviewSummary
            slugs={ALL.map(([slug]) => slug)}
            perPage={PER_PAGE}
            currentPage={current}
            basePath={hrefFor(sort, 1)}
          />

          <div className={styles.list}>
            {charts.map(([slug, chart], i) => {
              // A banner whenever the date changes, and always at the top of a
              // slice so every page says which run it is in rather than only
              // the page the run started on.
              const iso = createdAt.charts[slug] ?? "";
              const previous = i === 0 ? null : (createdAt.charts[charts[i - 1][0]] ?? "");
              const banner =
                DATED.includes(sort) && iso !== previous ? (
                  <h2 key={`when-${slug}`} className={styles.dateGroup}>
                    {iso ? formatCreated(iso) : "Not committed yet"}
                    <span className={styles.dateGroupNote}>
                      {DATE_RUNS.get(iso) === 1
                        ? "1 chart"
                        : `${DATE_RUNS.get(iso)} charts, A→Z within the commit`}
                    </span>
                  </h2>
                ) : null;

              return (
              <Fragment key={slug}>
              {banner}
              <section className={styles.item} id={slug}>
                <header className={styles.head}>
                  <div className={styles.headMain}>
                    <h2 className={styles.slug}>{slug}</h2>
                    {chart.caption ? (
                      <p className={styles.caption}>{chart.caption}</p>
                    ) : null}
                  </div>
                  <span className={styles.dims}>
                    {chart.width}×{chart.height} ·{" "}
                    {(chart.svgBytes / 1024).toFixed(1)} KB
                    <span className={styles.created}>
                      {createdAt.charts[slug]
                        ? `Created ${formatCreated(createdAt.charts[slug])}`
                        : "Not committed yet"}
                    </span>
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
                        title={use.section ? `${use.section} / ${use.title}` : use.title}
                      >
                        {use.section && (
                          <>
                            <span className={styles.useCourse}>{use.section}</span>
                            <span className={styles.useSep} aria-hidden="true">
                              /
                            </span>
                          </>
                        )}
                        {use.title}
                        <ArrowUpRight size={13} aria-hidden="true" />
                      </Link>
                    ))
                  ) : (
                    <span className={styles.unplaced}>Not placed in a lesson yet</span>
                  )}
                </div>

                <ChartMarkControls slug={slug} title={slug} />

                {/* Its own row rather than a slot inside the queue controls:
                    those render nothing until the marks fetch resolves, and
                    this one disables itself instead so the control is never
                    silently missing. */}
                <div className={styles.devRow}>
                  <ChartDeleteControls
                    slug={slug}
                    usedBy={chart.usedBy.map((use) =>
                      use.section ? `${use.section} / ${use.title}` : use.title,
                    )}
                  />
                </div>

                <div className={styles.split}>
                  <ChartPane theme="light" slug={slug} title={chart.title} svg={svgBySlug.get(slug) ?? ""} />
                  <ChartPane theme="dark" slug={slug} title={chart.title} svg={svgBySlug.get(slug) ?? ""} />
                </div>

                <details className={styles.details}>
                  <summary className={styles.summary}>
                    Accessible name (the spec&apos;s <code>title</code>)
                  </summary>
                  <p className={styles.title}>{chart.title}</p>
                </details>
              </section>
              </Fragment>
              );
            })}
          </div>

          {PAGE_COUNT > 1 ? (
            <nav className={styles.pager} aria-label="Chart pages">
              <Link
                href={hrefFor(sort, current - 1)}
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
                    href={hrefFor(sort, n)}
                    prefetch={false}
                    aria-current={n === current ? "page" : undefined}
                    className={`${styles.pagerNum} ${n === current ? styles.pagerNumOn : ""}`}
                  >
                    {n}
                  </Link>
                ))}
              </span>
              <Link
                href={hrefFor(sort, current + 1)}
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
    </ChartReviewProvider>
  );
}
