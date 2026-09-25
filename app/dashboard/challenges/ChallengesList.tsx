"use client";

/**
 * The challenge catalog at `/dashboard/challenges`.
 *
 * Built from the "Challenges Page Studio" design. The Studio shell
 * (`_studio/StudioShell`) already supplies the sidebar, the top bar and the
 * 1280px content container, so this renders only the page body: heading,
 * filter row, table and pagination.
 *
 * Rows arrive as a prop from the server page, derived from the challenges
 * themselves, so every one links to a workspace that exists.
 *
 * Filtering and paging are client state over the whole list: three hundred
 * rows are far too few to justify a round trip, and it keeps the page static.
 * The server renders the unfiltered first page (`ChallengesListFallback`), so
 * the HTML carries real links before any of this runs.
 */

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronDown, Circle, CircleCheckBig, Search, X } from "lucide-react";
import { LangIcon } from "@/app/_components/languageIcons";
import { statusOf } from "@/lib/challenges/progress";
import { useAllProgress } from "@/app/challenges/_components/useProgress";
import {
  CHALLENGE_STATUS_LABELS,
  INDEX_LANGUAGE_LABELS,
  type ChallengeIndexEntry,
  type ChallengeStatus,
  type IndexLanguage,
} from "@/lib/challenges/types";

/**
 * Rows per page on offer. The default sits high because the catalog is long
 * (300 challenges) and a learner scanning it for a topic wants to scroll, not
 * click through thirty pages; 10 stays available for a short screen.
 */
const PAGE_SIZES = [10, 25, 50, 100] as const;
const DEFAULT_PAGE_SIZE = 50;

/** The `per` query value, or the default when it is missing or not offered. */
function pageSizeFrom(raw: string | null | undefined): number {
  const n = Number(raw);
  return (PAGE_SIZES as readonly number[]).includes(n) ? n : DEFAULT_PAGE_SIZE;
}

const LEVELS = ["Beginner", "Intermediate", "Advanced"];

/** Difficulty meter, matching the workspace's three-bar mark. */
function LevelBars({ level }: { level: number }) {
  return (
    <span aria-hidden="true" className="inline-flex gap-0.5">
      {[1, 2, 3].map((n) => (
        <span
          key={n}
          className="h-1 w-2.5 rounded-[1px]"
          style={{ background: n <= level ? "var(--ds-blue-500)" : "var(--meter-off)" }}
        />
      ))}
    </span>
  );
}

function StatusIcon({ status }: { status: ChallengeStatus }) {
  const label = CHALLENGE_STATUS_LABELS[status];
  if (status === "solved") {
    return (
      <CircleCheckBig
        size={17}
        strokeWidth={2.2}
        aria-label={label}
        style={{ color: "var(--green-text)" }}
      />
    );
  }
  if (status === "attempted") {
    // A half-filled circle: started, not finished. Drawn inline because
    // lucide has no half-fill, and a plain dot reads as a bullet rather than
    // as progress.
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="17"
        height="17"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        role="img"
        aria-label={label}
        style={{ color: "var(--ds-blue-500)" }}
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2a10 10 0 0 1 0 20z" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  return <Circle size={17} strokeWidth={2} aria-label={label} style={{ color: "var(--ds-gray-300)" }} />;
}

/**
 * A `<select>` with the chevron the design draws over it. `compact` matches
 * the 32px pagination buttons it sits beside in the footer; the filter row's
 * 38px is the design's field height.
 */
function Select({
  value,
  onChange,
  label,
  compact,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  compact?: boolean;
  children: React.ReactNode;
}) {
  return (
    <span className="relative inline-flex">
      <select
        className="ds-select w-auto"
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        // Inline, because `.ds-select` is unlayered CSS and outranks a
        // Tailwind height utility.
        style={compact ? { height: 32, fontSize: 13 } : undefined}
      >
        {children}
      </select>
      <ChevronDown
        size={14}
        aria-hidden="true"
        className={`pointer-events-none absolute right-[11px] ${compact ? "top-[9px]" : "top-3"}`}
        style={{ color: "var(--muted)" }}
      />
    </span>
  );
}

interface Filters {
  q: string;
  status: string;
  lang: string;
  level: string;
  format: string;
}

type ResolvedEntry = ChallengeIndexEntry & { status: ChallengeStatus };

function matches(entry: ResolvedEntry, f: Filters): boolean {
  const q = f.q.trim().toLowerCase();
  if (
    q &&
    !entry.title.toLowerCase().includes(q) &&
    !entry.topic.toLowerCase().includes(q)
  ) {
    return false;
  }
  if (f.status && entry.status !== f.status) return false;
  if (f.lang && !entry.langs.includes(f.lang as IndexLanguage)) return false;
  if (f.level && entry.level !== Number(f.level)) return false;
  if (f.format && (f.format === "single" ? entry.steps !== 1 : entry.steps === 1)) {
    return false;
  }
  return true;
}

/**
 * Page numbers to show: always the first and last, plus the current page and
 * its neighbours, with `null` standing in for an elided run.
 */
function pageWindow(page: number, pageCount: number): (number | null)[] {
  const nums: number[] = [];
  for (let n = 1; n <= pageCount; n++) {
    if (n === 1 || n === pageCount || Math.abs(n - page) <= 1) nums.push(n);
  }
  return nums.flatMap((n, i) =>
    i > 0 && n - nums[i - 1] > 1 ? [null, n] : [n],
  );
}

/** How long typing has to pause before the search reaches the URL. */
const SEARCH_DEBOUNCE_MS = 250;

const NO_FILTERS: Filters = { q: "", status: "", lang: "", level: "", format: "" };

/** What a write to the query string carries. */
type Requested = Filters & { page: number; per: number };

/**
 * The catalog, driven by the query string.
 *
 * Filters and the page live in the URL rather than in component state, so a
 * filtered view can be linked and bookmarked, a refresh keeps it, and Back to
 * this page from a challenge lands where the learner left. The page stays
 * static: this is a client component reading `useSearchParams`, and every
 * write goes through `history.replaceState`, which Next keeps
 * `useSearchParams` in sync with and which costs no server round trip.
 */
export function ChallengesList({ entries }: { entries: ChallengeIndexEntry[] }) {
  const pathname = usePathname() ?? "/dashboard/challenges";
  const params = useSearchParams();

  const urlFilters: Filters = useMemo(
    () => ({
      q: params?.get("q") ?? "",
      status: params?.get("status") ?? "",
      lang: params?.get("lang") ?? "",
      level: params?.get("level") ?? "",
      format: params?.get("format") ?? "",
    }),
    [params],
  );
  const urlPage = Math.max(1, Number(params?.get("page") ?? 1) || 1);
  const pageSize = pageSizeFrom(params?.get("per"));

  /**
   * The search box's own text.
   *
   * The box used to render `?q=` directly, and each keystroke navigated. Until
   * that navigation landed, every render put the old URL value back in the
   * field, so typing at normal speed kept only the last letter. The field now
   * owns its text and the URL follows it after a pause.
   *
   * `written` is the value this component last put in the URL, so that its
   * own write arriving is not mistaken for an outside change. Anything else
   * that moves `?q=` (Back, Forward, a link to a filtered view) is adopted:
   * React's "adjust state when a prop changes" pattern rather than an effect,
   * so the field and the list change in the same render.
   */
  const [query, setQuery] = useState(urlFilters.q);
  const [written, setWritten] = useState(urlFilters.q);
  const [seen, setSeen] = useState(urlFilters.q);
  if (seen !== urlFilters.q) {
    setSeen(urlFilters.q);
    if (urlFilters.q !== written) {
      setQuery(urlFilters.q);
      setWritten(urlFilters.q);
    }
  }

  // Typed text that has not reached the URL yet is still a new search, so the
  // list shows its first page rather than the page number of the old one.
  const page = query === urlFilters.q ? urlPage : 1;
  // The list trails the field by a render when filtering is slow, so a
  // keystroke never waits on three hundred rows.
  const deferredQuery = useDeferredValue(query);
  const filters: Filters = useMemo(
    () => ({ ...urlFilters, q: deferredQuery }),
    [urlFilters, deferredQuery],
  );

  /**
   * The state the last write asked for, which is not the same thing as the
   * state currently rendered.
   *
   * A URL change lands asynchronously, so two clicks in quick succession would
   * both read the pre-navigation page out of the render closure, and the
   * second would recompute the same target, swallowing a page. Writing here
   * synchronously means the second click builds on what the first asked for.
   * The effect keeps it honest when the URL changes from somewhere else.
   */
  const requested = useRef<Requested>({ ...urlFilters, q: query, page, per: pageSize });
  useEffect(() => {
    requested.current = { ...urlFilters, q: query, page, per: pageSize };
  }, [urlFilters, query, page, pageSize]);

  const searchTimer = useRef<number | undefined>(undefined);
  // A write still pending when the learner leaves would rewrite the URL of
  // whatever page they went to.
  useEffect(() => () => window.clearTimeout(searchTimer.current), []);

  /**
   * Rewrite the query string. Empty values are dropped rather than written as
   * `?q=`, so a cleared filter leaves a clean URL, and so is the default page
   * size. Replaced rather than pushed, so paging does not bury the page the
   * learner arrived from under ten history entries.
   */
  const write = useCallback(
    (state: Requested) => {
      window.clearTimeout(searchTimer.current);
      setWritten(state.q);
      const out = new URLSearchParams();
      for (const key of ["q", "status", "lang", "level", "format"] as const) {
        if (state[key]) out.set(key, state[key]);
      }
      if (state.page > 1) out.set("page", String(state.page));
      if (state.per !== DEFAULT_PAGE_SIZE) out.set("per", String(state.per));
      const qs = out.toString();
      window.history.replaceState(null, "", qs ? `${pathname}?${qs}` : pathname);
    },
    [pathname],
  );

  const apply = useCallback(
    (next: Partial<Requested>) => {
      const merged = { ...requested.current, ...next };
      requested.current = merged;
      write(merged);
    },
    [write],
  );

  const search = useCallback(
    (value: string) => {
      setQuery(value);
      // Held here at once, so a filter changed before the pause is over
      // carries the text as typed rather than the text last written.
      requested.current = { ...requested.current, q: value, page: 1 };
      window.clearTimeout(searchTimer.current);
      searchTimer.current = window.setTimeout(
        () => write({ ...requested.current, q: value }),
        SEARCH_DEBOUNCE_MS,
      );
    },
    [write],
  );

  const setFilter = useCallback(
    (key: Exclude<keyof Filters, "q">) => (value: string) =>
      // Any filter change resets to page 1: page 7 of a 43-row result is
      // usually nowhere.
      apply({ [key]: value, page: 1 }),
    [apply],
  );
  const setPage = useCallback((next: number) => apply({ page: next }), [apply]);
  // The page size is a display preference, not a filter, so Clear keeps it.
  const clearFilters = useCallback(() => {
    setQuery("");
    apply({ ...NO_FILTERS, page: 1 });
  }, [apply]);

  return (
    <CatalogView
      entries={entries}
      filters={filters}
      query={query}
      page={page}
      pageSize={pageSize}
      onSearch={search}
      onFilter={setFilter}
      onPage={setPage}
      onPageSize={(per, start) => apply({ per, page: Math.floor(start / per) + 1 })}
      onClear={clearFilters}
    />
  );
}

/**
 * The unfiltered first page, for the server.
 *
 * `useSearchParams` cannot be answered while the page is prerendered, so
 * `ChallengesList` renders on the client only, and its Suspense fallback is
 * what the static HTML carries. That fallback used to be nothing, which left
 * crawlers (and anyone before hydration) a page with no challenges on it.
 * This is the same view with no filters applied, so the swap at hydration is
 * invisible on the plain URL; a filtered link shows the full list for a
 * moment before its filters apply.
 */
export function ChallengesListFallback({ entries }: { entries: ChallengeIndexEntry[] }) {
  return (
    <CatalogView
      entries={entries}
      filters={NO_FILTERS}
      query=""
      page={1}
      pageSize={DEFAULT_PAGE_SIZE}
    />
  );
}

/** One language the catalog offers, with how many challenges use it. */
interface LanguageOption {
  id: IndexLanguage;
  count: number;
}

function CatalogView({
  entries,
  filters,
  query,
  page,
  pageSize,
  onSearch,
  onFilter,
  onPage,
  onPageSize,
  onClear,
}: {
  entries: ChallengeIndexEntry[];
  /** What the list is filtered by. `q` may trail `query` by a render. */
  filters: Filters;
  /** The search box's text. */
  query: string;
  page: number;
  pageSize: number;
  /** Absent on the server fallback, which is replaced before anyone types. */
  onSearch?: (value: string) => void;
  onFilter?: (key: Exclude<keyof Filters, "q">) => (value: string) => void;
  onPage?: (page: number) => void;
  /** The new size, and the index of the first row on screen. */
  onPageSize?: (per: number, start: number) => void;
  onClear?: () => void;
}) {
  // Progress lives in the browser, so the server renders every row as "not
  // started" and the store swaps the real statuses in at hydration.
  const progress = useAllProgress();
  const all = useMemo(
    () =>
      entries.map((e) => ({
        ...e,
        status: (progress[e.slug] ? statusOf(progress[e.slug]) : "new") as ChallengeStatus,
      })),
    [entries, progress],
  );

  // Only languages some challenge is written in, with how many: a filter
  // choice that always answers "No challenges match" is a dead end. A
  // language linked to directly (`?lang=r`) is still listed, at zero, so the
  // select shows what the list is filtered by.
  const languages: LanguageOption[] = useMemo(() => {
    const counts = new Map<IndexLanguage, number>();
    for (const e of entries) {
      for (const l of e.langs) counts.set(l, (counts.get(l) ?? 0) + 1);
    }
    return (Object.keys(INDEX_LANGUAGE_LABELS) as IndexLanguage[])
      .filter((id) => counts.has(id) || id === filters.lang)
      .map((id) => ({ id, count: counts.get(id) ?? 0 }));
  }, [entries, filters.lang]);

  const filterBy = (key: Exclude<keyof Filters, "q">) => onFilter?.(key) ?? (() => {});

  const filtered = useMemo(() => all.filter((e) => matches(e, filters)), [all, filters]);
  const total = filtered.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  // The current page can fall past the end when a filter shrinks the list.
  const current = Math.min(page, pageCount);
  const start = (current - 1) * pageSize;
  const rows = filtered.slice(start, start + pageSize);

  const solvedInView = filtered.filter((e) => e.status === "solved").length;
  const hasFilters = Boolean(query) || Object.values({ ...filters, q: "" }).some(Boolean);

  return (
    <div>
      <h1 className="ds-h1">Challenges</h1>
      <p
        className="mt-2.5 text-[15px] leading-relaxed [text-wrap:pretty]"
        style={{ color: "var(--muted)" }}
      >
        Short problems with instant feedback. Some are one query or one function;
        the harder ones are broken into steps that unlock as you pass them.
      </p>

      <div className="mt-7 flex flex-wrap items-center gap-2.5">
        <label
          className="flex h-[38px] min-w-[200px] max-w-[340px] flex-[1_1_220px] items-center gap-2 rounded-[7px] px-3 focus-within:shadow-[0_0_0_2px_rgba(20,140,255,0.35)]"
          style={{ background: "var(--field)" }}
        >
          <Search size={15} aria-hidden="true" className="shrink-0" style={{ color: "var(--muted)" }} />
          <input
            type="text"
            value={query}
            onChange={(e) => onSearch?.(e.target.value)}
            placeholder="Search challenges…"
            aria-label="Search challenges"
            className="min-w-0 flex-1 border-none bg-transparent text-sm outline-none"
            style={{ color: "var(--ink)" }}
          />
        </label>

        <Select value={filters.status} onChange={filterBy("status")} label="Status">
          <option value="">All statuses</option>
          {(["solved", "attempted", "new"] as const).map((s) => (
            <option key={s} value={s}>
              {CHALLENGE_STATUS_LABELS[s]}
            </option>
          ))}
        </Select>

        <Select value={filters.lang} onChange={filterBy("lang")} label="Language">
          <option value="">All languages</option>
          {languages.map(({ id, count }) => (
            <option key={id} value={id}>
              {INDEX_LANGUAGE_LABELS[id]} ({count})
            </option>
          ))}
        </Select>

        <Select value={filters.level} onChange={filterBy("level")} label="Level">
          <option value="">All levels</option>
          {LEVELS.map((label, i) => (
            <option key={label} value={String(i + 1)}>
              {label}
            </option>
          ))}
        </Select>

        <Select value={filters.format} onChange={filterBy("format")} label="Format">
          <option value="">Any format</option>
          <option value="single">Single step</option>
          <option value="multi">Multi-step</option>
        </Select>

        {hasFilters ? (
          <button
            type="button"
            onClick={onClear}
            className="ds-btn-chip"
          >
            <X size={12} aria-hidden="true" />
            Clear
          </button>
        ) : null}

        <span className="flex-1" />
        {/* Scoped to whatever is filtered, because it sits in the same row
            as "1-10 of 43" and two different totals there read as a bug. */}
        <span
          className="inline-flex items-center gap-2 whitespace-nowrap text-[13px]"
          style={{ color: "var(--muted)" }}
        >
          <CircleCheckBig size={15} aria-hidden="true" style={{ color: "var(--green-text)" }} />
          {solvedInView} of {total} solved
          {hasFilters ? <span className="sr-only"> in the current filter</span> : null}
        </span>
      </div>

      {total === 0 ? (
        <p
          className="mt-5 rounded-lg px-4 py-3 text-sm"
          style={{ background: "var(--panel)", color: "var(--muted)" }}
        >
          No challenges match.{" "}
          <button
            type="button"
            onClick={onClear}
            className="border-0 bg-transparent p-0 text-sm font-medium underline underline-offset-2"
            style={{ color: "var(--green-text)" }}
          >
            Clear the filters
          </button>{" "}
          to see everything.
        </p>
      ) : (
        <>
          {/* Narrow viewports get stacked cards, not a 576px table scrolling
              sideways with its last columns off-screen and nothing saying so.
              The switch is at 900px rather than a smaller breakpoint because
              the studio sidebar takes ~300px: at an 800px viewport the content
              column is still too narrow for five columns, which is where the
              Format column was being clipped. Same rows, same order. */}
          <ul className="mt-5 flex list-none flex-col gap-2 p-0 min-[900px]:hidden">
            {rows.map((entry) => (
              <MobileRow key={entry.slug} entry={entry} />
            ))}
          </ul>

          <div
            className="mt-5 hidden overflow-hidden rounded-[10px] min-[900px]:block"
            style={{ border: "1px solid var(--divider)" }}
          >
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <Th className="w-11 pl-4 pr-0" />
                    <Th className="w-full min-w-[180px]">Title</Th>
                    <Th>Level</Th>
                    <Th>Language</Th>
                    <Th>Format</Th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((entry) => (
                    <Row key={entry.slug} entry={entry} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-3.5 flex flex-wrap items-center gap-1.5 px-1">
            <span className="whitespace-nowrap text-[13px]" style={{ color: "var(--muted)" }}>
              {start + 1}–{start + rows.length} of {total}
            </span>
            {/* Hidden when every size would show the same thing: one page of
                ten or fewer. */}
            {total > PAGE_SIZES[0] ? (
              <span
                className="ml-3 inline-flex items-center gap-2 whitespace-nowrap text-[13px]"
                style={{ color: "var(--muted)" }}
              >
                <span aria-hidden="true">Show</span>
                <Select
                  value={String(pageSize)}
                  // Changing the size keeps the first row on screen in view,
                  // rather than jumping back to the top: row 120 of 300 at 10
                  // a page is page 12, and at 50 a page it is on page 3.
                  onChange={(v) => onPageSize?.(Number(v), start)}
                  label="Challenges per page"
                  compact
                >
                  {PAGE_SIZES.map((n) => (
                    <option key={n} value={String(n)}>
                      {n}
                    </option>
                  ))}
                </Select>
                <span aria-hidden="true">per page</span>
              </span>
            ) : null}
            {pageCount > 1 ? (
              <nav aria-label="Pagination" className="ml-auto flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  className="ds-page-btn"
                  disabled={current <= 1}
                  onClick={() => onPage?.(Math.max(1, current - 1))}
                >
                  Previous
                </button>
                {pageWindow(current, pageCount).map((n, i) =>
                  n === null ? (
                    <span
                      key={`gap-${i}`}
                      aria-hidden="true"
                      className="inline-flex h-8 w-8 items-center justify-center text-[13px]"
                      style={{ color: "var(--faint)" }}
                    >
                      …
                    </span>
                  ) : (
                    <button
                      key={n}
                      type="button"
                      onClick={() => onPage?.(n)}
                      aria-label={`Page ${n}`}
                      aria-current={n === current ? "page" : undefined}
                      data-active={n === current || undefined}
                      className="ds-page-num"
                    >
                      {n}
                    </button>
                  ),
                )}
                <button
                  type="button"
                  className="ds-page-btn"
                  disabled={current >= pageCount}
                  onClick={() => onPage?.(Math.min(pageCount, current + 1))}
                >
                  Next
                </button>
              </nav>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}

function Th({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return (
    <th
      className={`h-10 whitespace-nowrap px-3 text-left text-[13px] font-medium ${className}`}
      style={{ color: "var(--muted)" }}
    >
      {children}
    </th>
  );
}

/**
 * One challenge as a card, for viewports too narrow for five columns.
 *
 * Level, language and format collapse into a single metadata line under the
 * title — the same facts the table's last three columns carry, in the order
 * the table shows them.
 */
function MobileRow({ entry }: { entry: ResolvedEntry }) {
  return (
    <li
      className="rounded-[10px] p-3"
      style={{ border: "1px solid var(--divider)" }}
    >
      <Link
        href={`/challenges/${entry.slug}`}
        // See `Row`.
        prefetch={false}
        className="flex items-start gap-2.5 text-inherit no-underline"
      >
        <span className="mt-0.5 shrink-0">
          <StatusIcon status={entry.status} />
        </span>
        <span className="flex min-w-0 flex-col gap-1">
          <span
            className="text-sm font-medium leading-tight"
            style={{ color: "var(--ink)" }}
          >
            {entry.title}
          </span>
          <span className="text-[12.5px]" style={{ color: "var(--muted)" }}>
            {entry.topic}
          </span>
          <span
            className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12px]"
            style={{ color: "var(--text)" }}
          >
            <span className="inline-flex items-center gap-1.5">
              <LevelBars level={entry.level} />
              {LEVELS[entry.level - 1]}
            </span>
            <span aria-hidden="true" style={{ color: "var(--faint)" }}>
              ·
            </span>
            <span className="inline-flex items-center gap-1.5">
              <LangIcon id={entry.langs[0]} size={13} />
              {entry.langs.map((l) => INDEX_LANGUAGE_LABELS[l]).join(", ")}
            </span>
            <span aria-hidden="true" style={{ color: "var(--faint)" }}>
              ·
            </span>
            <span>{entry.steps > 1 ? `${entry.steps} steps` : "Single step"}</span>
          </span>
        </span>
      </Link>
    </li>
  );
}

function Row({ entry }: { entry: ResolvedEntry }) {
  const lang = entry.langs[0];
  const more = entry.langs.length - 1;
  return (
    // `.ds-challenge-row` in studio.css makes the row the containing block
    // and stretches the title link's ::after across it, so the whole row is
    // the hit area — matching the full-width hover.
    <tr
      className="ds-challenge-row"
      data-clickable="true"
      style={{ borderTop: "1px solid var(--divider)" }}
    >
      <td className="py-3 pl-4 pr-0 align-middle">
        <StatusIcon status={entry.status} />
      </td>
      <td className="p-3 align-middle">
        <Link
          href={`/challenges/${entry.slug}`}
          // Fifty rows a page, each a whole workspace (prompt, dataset,
          // reference solutions): prefetching every row that scrolls into
          // view fetched far more than anyone opens. See app/_components/Link.tsx.
          prefetch={false}
          className="ds-row-link flex flex-col gap-0.5 text-inherit no-underline"
        >
          <span className="text-sm font-medium leading-tight" style={{ color: "var(--ink)" }}>
            {entry.title}
          </span>
          {/* --muted, not --faint: the topic is the only place a challenge's
              subject appears, and --faint is 2.42:1 on white. */}
          <span className="text-[12.5px]" style={{ color: "var(--muted)" }}>
            {entry.topic}
          </span>
        </Link>
      </td>
      <td className="whitespace-nowrap p-3 align-middle">
        <span
          className="inline-flex items-center gap-2.5 text-[13px] font-medium"
          style={{ color: "var(--text)" }}
        >
          <LevelBars level={entry.level} />
          {LEVELS[entry.level - 1]}
        </span>
      </td>
      <td className="whitespace-nowrap p-3 align-middle">
        <span
          className="inline-flex items-center gap-[7px] text-[13px]"
          style={{ color: "var(--ink)" }}
        >
          <LangIcon id={lang} size={14} />
          <span>{INDEX_LANGUAGE_LABELS[lang]}</span>
          {more > 0 ? (
            <span
              className="rounded-full px-[7px] py-px text-[11px] font-semibold"
              style={{ background: "var(--chip-bg)", color: "var(--muted)" }}
              title={entry.langs.map((l) => INDEX_LANGUAGE_LABELS[l]).join(", ")}
            >
              +{more}
            </span>
          ) : null}
        </span>
      </td>
      <td className="whitespace-nowrap p-3 align-middle">
        <span
          className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold"
          // 11px bold does not qualify as large text, so this needs the full
          // 4.5:1 rather than --muted's 4.17:1 against the chip.
          style={{ background: "var(--chip-bg)", color: "var(--text)" }}
        >
          {entry.steps > 1 ? `${entry.steps} steps` : "Single step"}
        </span>
      </td>
    </tr>
  );
}

