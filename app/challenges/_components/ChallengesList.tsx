"use client";

/**
 * The challenge catalog at `/challenges`.
 *
 * Built from the "Challenges Page Studio" design. The page (`../page.tsx`)
 * supplies the site's shared header and footer and the content container, so
 * this renders only the page body: heading, filter row, table and pagination.
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
import { Select } from "@base-ui/react/select";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleCheckBig,
  Layers,
  Search,
  Square,
  X,
} from "lucide-react";
import { LangIcon } from "@/app/_components/languageIcons";
import { HOME_SELECT_ITEM, HOME_SELECT_POPUP } from "@/app/_components/home/homeSelect";
import { statusOf } from "@/lib/challenges/progress";
import { useAllProgress } from "@/app/challenges/_components/useProgress";
import {
  CHALLENGE_STATUS_LABELS,
  INDEX_LANGUAGE_LABELS,
  type ChallengeIndexEntry,
  type ChallengeStatus,
  type IndexLanguage,
} from "@/lib/challenges/types";
import styles from "./ChallengesList.module.css";

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
    <span aria-hidden="true" className="inline-flex shrink-0 gap-0.5">
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

/** Started, not finished: a half-filled circle, since lucide has none. */
function HalfCircle({ size = 16 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a10 10 0 0 1 0 20z" fill="currentColor" stroke="none" />
    </svg>
  );
}

/**
 * Where the learner stands, as an icon and a word.
 *
 * "Not started" draws nothing visible. An empty circle on every row used to
 * stand in for it, and a column of those read as radio buttons: something to
 * pick, rather than a record of progress. Leaving the cell blank keeps the
 * two states that mean something (solved, in progress) the only marks there.
 */
function StatusMark({ status }: { status: ChallengeStatus }) {
  if (status === "solved") {
    return (
      <span className="inline-flex items-center gap-1.5" style={{ color: "var(--green-text)" }}>
        <CircleCheckBig size={16} strokeWidth={2.2} aria-hidden="true" />
        {CHALLENGE_STATUS_LABELS.solved}
      </span>
    );
  }
  if (status === "attempted") {
    return (
      <span className="inline-flex items-center gap-1.5" style={{ color: "var(--blue-text)" }}>
        <HalfCircle />
        {CHALLENGE_STATUS_LABELS.attempted}
      </span>
    );
  }
  return <span className="sr-only">{CHALLENGE_STATUS_LABELS.new}</span>;
}

/** One choice in a {@link FilterSelect}. */
interface FilterOption {
  value: string;
  label: string;
  /** Drawn before the label, in the menu and on the trigger once chosen. */
  icon?: React.ReactNode;
  /** Drawn after the label in the menu only, muted. */
  count?: number;
}

/**
 * A filter dropdown: a Base UI Select styled as a borderless chip, the same
 * control the /courses catalog sorts with, so each option can carry an icon
 * (a language's logo, the level meter) where a native `<option>` takes only
 * text. The trigger shows the chosen option's icon beside its label.
 */
function FilterSelect({
  value,
  onChange,
  label,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  /** The control's accessible name. */
  label: string;
  options: FilterOption[];
}) {
  const active = options.find((o) => o.value === value) ?? options[0];
  return (
    <Select.Root
      value={value}
      onValueChange={(next) => onChange(typeof next === "string" ? next : "")}
    >
      <Select.Trigger
        aria-label={label}
        className="inline-flex h-9 cursor-pointer items-center gap-2 rounded border-0 bg-[var(--field)] px-3 text-sm font-medium text-[var(--ink)] outline-none transition-colors hover:bg-[var(--field-hover)] focus-visible:ring-2 focus-visible:ring-[var(--ds-blue-400)] data-[popup-open]:bg-[var(--field-hover)]"
      >
        {active.icon}
        <Select.Value className="whitespace-nowrap text-left">{active.label}</Select.Value>
        <Select.Icon className="flex" style={{ color: "var(--muted)" }}>
          <ChevronDown size={14} />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner sideOffset={6} alignItemWithTrigger={false} className="z-50">
          <Select.Popup className={`${HOME_SELECT_POPUP} min-w-[max(var(--anchor-width),11rem)]`}>
            {options.map((o) => (
              <Select.Item key={o.value || "all"} value={o.value} className={HOME_SELECT_ITEM}>
                {o.icon}
                <Select.ItemText className="flex-1">{o.label}</Select.ItemText>
                {o.count !== undefined ? (
                  <span
                    data-count={o.count}
                    className="pl-4 text-[13px] tabular-nums text-[var(--ds-gray-500)] dark:text-[var(--ds-gray-400)]"
                  >
                    {o.count}
                  </span>
                ) : null}
              </Select.Item>
            ))}
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
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
  const pathname = usePathname() ?? "/challenges";
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

// The menu is portaled out of `.catalog`, so its icons cannot read the list's
// tokens and take the brand shades directly.
const STATUS_OPTIONS: FilterOption[] = [
  { value: "", label: "All statuses" },
  {
    value: "solved",
    label: CHALLENGE_STATUS_LABELS.solved,
    icon: (
      <span className="flex text-[var(--ds-green-700)] dark:text-[var(--ds-green-400)]">
        <CircleCheckBig size={15} strokeWidth={2.2} aria-hidden="true" />
      </span>
    ),
  },
  {
    value: "attempted",
    label: CHALLENGE_STATUS_LABELS.attempted,
    icon: (
      <span className="flex text-[var(--ds-blue-700)] dark:text-[var(--ds-blue-400)]">
        <HalfCircle size={15} />
      </span>
    ),
  },
  { value: "new", label: CHALLENGE_STATUS_LABELS.new },
];

const LEVEL_OPTIONS: FilterOption[] = [
  { value: "", label: "All levels" },
  ...LEVELS.map((label, i) => ({
    value: String(i + 1),
    label,
    icon: <LevelBars level={i + 1} />,
  })),
];

const FORMAT_OPTIONS: FilterOption[] = [
  { value: "", label: "Any format" },
  { value: "single", label: "Single step", icon: <Square size={14} aria-hidden="true" /> },
  { value: "multi", label: "Multi-step", icon: <Layers size={14} aria-hidden="true" /> },
];

const PAGE_SIZE_OPTIONS: FilterOption[] = PAGE_SIZES.map((n) => ({
  value: String(n),
  label: String(n),
}));

function formatLabel(steps: number): string {
  return steps > 1 ? `${steps} steps` : "Single step";
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
  const languageOptions: FilterOption[] = useMemo(
    () => [
      { value: "", label: "All languages" },
      ...languages.map(({ id, count }) => ({
        value: id,
        label: INDEX_LANGUAGE_LABELS[id],
        icon: <LangIcon id={id} size={15} />,
        count,
      })),
    ],
    [languages],
  );

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
    <div className={styles.catalog}>
      {/* Centered heading, matching the /courses and /pricing title blocks. */}
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-[var(--ds-gray-900)] sm:text-5xl dark:text-white">
          Challenges
        </h1>
        <p className="mt-6 text-base text-[var(--ds-gray-900)] [text-wrap:pretty] sm:text-lg dark:text-white">
          Short problems with instant feedback. Some are one query or one function;
          the harder ones are broken into steps that unlock as you pass them.
        </p>
      </div>

      <div className="mt-12 flex flex-wrap items-center gap-2">
        <label className="flex h-9 min-w-[200px] max-w-[320px] flex-[1_1_220px] items-center gap-2 rounded bg-[var(--field)] px-3 focus-within:ring-2 focus-within:ring-[var(--ds-blue-400)]">
          <Search size={15} aria-hidden="true" className="shrink-0" style={{ color: "var(--muted)" }} />
          <input
            type="text"
            value={query}
            onChange={(e) => onSearch?.(e.target.value)}
            placeholder="Search challenges…"
            aria-label="Search challenges"
            className="min-w-0 flex-1 border-none bg-transparent text-sm outline-none placeholder:text-[var(--muted)]"
            style={{ color: "var(--ink)" }}
          />
        </label>

        <FilterSelect
          value={filters.status}
          onChange={filterBy("status")}
          label="Status"
          options={STATUS_OPTIONS}
        />
        <FilterSelect
          value={filters.lang}
          onChange={filterBy("lang")}
          label="Language"
          options={languageOptions}
        />
        <FilterSelect
          value={filters.level}
          onChange={filterBy("level")}
          label="Level"
          options={LEVEL_OPTIONS}
        />
        <FilterSelect
          value={filters.format}
          onChange={filterBy("format")}
          label="Format"
          options={FORMAT_OPTIONS}
        />

        {hasFilters ? (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded border-0 bg-transparent px-2.5 text-sm font-medium transition-colors hover:text-[var(--ink)]"
            style={{ color: "var(--muted)" }}
          >
            <X size={14} aria-hidden="true" />
            Clear
          </button>
        ) : null}

        <span className="flex-1" />
        {/* Scoped to whatever is filtered, because it sits in the same row
            as "1-10 of 43" and two different totals there read as a bug. */}
        <span
          className="inline-flex items-center gap-1.5 whitespace-nowrap text-[13px]"
          style={{ color: "var(--muted)" }}
        >
          <CircleCheckBig size={14} aria-hidden="true" style={{ color: "var(--green-text)" }} />
          {solvedInView} of {total} solved
          {hasFilters ? <span className="sr-only"> in the current filter</span> : null}
        </span>
      </div>

      {total === 0 ? (
        <p
          className="mt-6 rounded-lg bg-[var(--field)] px-4 py-3 text-sm"
          style={{ color: "var(--muted)" }}
        >
          No challenges match.{" "}
          <button
            type="button"
            onClick={onClear}
            className="cursor-pointer border-0 bg-transparent p-0 text-sm font-medium underline underline-offset-2"
            style={{ color: "var(--blue-text)" }}
          >
            Clear the filters
          </button>{" "}
          to see everything.
        </p>
      ) : (
        <>
          {/* Narrow viewports get stacked cards, not a table scrolling
              sideways with its last columns off-screen and nothing saying so.
              Same rows, same order. */}
          <ul className={`${styles.cards} -mx-3 mt-4 flex list-none flex-col p-0 md:hidden`}>
            {rows.map((entry) => (
              <MobileRow key={entry.slug} entry={entry} />
            ))}
          </ul>

          {/* `-mx-3` lines the cell text up with the filter row above while
              the hover fill reaches past it, so a row reads as one block. */}
          <div className="-mx-3 mt-4 hidden md:block">
            <table className={`${styles.table} w-full border-separate border-spacing-0`}>
              <thead>
                <tr>
                  <Th className="w-full min-w-[220px]">Title</Th>
                  <Th>Level</Th>
                  <Th>Language</Th>
                  <Th>Format</Th>
                  <Th className="text-right">Status</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((entry) => (
                  <Row key={entry.slug} entry={entry} />
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="whitespace-nowrap text-[13px]" style={{ color: "var(--muted)" }}>
              {start + 1}–{start + rows.length} of {total}
            </span>
            {/* Hidden when every size would show the same thing: one page of
                ten or fewer. */}
            {total > PAGE_SIZES[0] ? (
              <span
                className="inline-flex items-center gap-2 whitespace-nowrap text-[13px]"
                style={{ color: "var(--muted)" }}
              >
                <span aria-hidden="true">Show</span>
                <FilterSelect
                  value={String(pageSize)}
                  // Changing the size keeps the first row on screen in view,
                  // rather than jumping back to the top: row 120 of 300 at 10
                  // a page is page 12, and at 50 a page it is on page 3.
                  onChange={(v) => onPageSize?.(Number(v), start)}
                  label="Challenges per page"
                  options={PAGE_SIZE_OPTIONS}
                />
                <span aria-hidden="true">per page</span>
              </span>
            ) : null}
            {pageCount > 1 ? (
              <nav aria-label="Pagination" className="ml-auto flex flex-wrap items-center gap-1">
                <button
                  type="button"
                  className={styles.pageBtn}
                  disabled={current <= 1}
                  onClick={() => onPage?.(Math.max(1, current - 1))}
                >
                  <ChevronLeft size={16} aria-hidden="true" />
                  Previous
                </button>
                {pageWindow(current, pageCount).map((n, i) =>
                  n === null ? (
                    <span
                      key={`gap-${i}`}
                      aria-hidden="true"
                      className="inline-flex h-8 w-8 items-center justify-center text-sm"
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
                      className={styles.pageNum}
                    >
                      {n}
                    </button>
                  ),
                )}
                <button
                  type="button"
                  className={styles.pageBtn}
                  disabled={current >= pageCount}
                  onClick={() => onPage?.(Math.min(pageCount, current + 1))}
                >
                  Next
                  <ChevronRight size={16} aria-hidden="true" />
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
      className={`whitespace-nowrap px-3 pb-2 text-left text-[13px] font-medium ${className}`}
      style={{ color: "var(--muted)" }}
    >
      {children}
    </th>
  );
}

/**
 * The shared body of the level, language and format cells.
 *
 * One height, one line-height and one type size, centred on the row's
 * middle: those cells used to mix 11, 13 and 14px type, a pill and
 * baseline-aligned inline boxes, and came to rest a few pixels apart.
 */
function Cell({ children, tone = "var(--text)" }: { children: React.ReactNode; tone?: string }) {
  return (
    <span className="flex h-5 items-center gap-2 whitespace-nowrap text-sm leading-5" style={{ color: tone }}>
      {children}
    </span>
  );
}

/**
 * One challenge as a card, for viewports too narrow for five columns.
 *
 * Level, language and format collapse into a single metadata line under the
 * title, in the order the table's columns show them.
 */
function MobileRow({ entry }: { entry: ResolvedEntry }) {
  return (
    <li>
      <Link
        href={`/challenges/${entry.slug}`}
        // See `Row`.
        prefetch={false}
        className={`${styles.card} flex flex-col gap-1 px-3 py-3 text-inherit no-underline`}
      >
        <span className="flex items-start justify-between gap-3">
          <span className="text-sm font-medium leading-5" style={{ color: "var(--ink)" }}>
            {entry.title}
          </span>
          <span className="shrink-0 text-[13px] leading-5">
            <StatusMark status={entry.status} />
          </span>
        </span>
        <span className="text-[13px]" style={{ color: "var(--muted)" }}>
          {entry.topic}
        </span>
        <span
          className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px]"
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
          <span>{formatLabel(entry.steps)}</span>
        </span>
      </Link>
    </li>
  );
}

function Row({ entry }: { entry: ResolvedEntry }) {
  const lang = entry.langs[0];
  const more = entry.langs.length - 1;
  return (
    // `.row` makes the row the containing block and stretches the title
    // link's ::after across it, so the whole row is the hit area, matching
    // the full-width hover.
    <tr className={styles.row}>
      <td className="px-3 py-3 align-middle">
        <Link
          href={`/challenges/${entry.slug}`}
          // Fifty rows a page, each a whole workspace (prompt, dataset,
          // reference solutions): prefetching every row that scrolls into
          // view fetched far more than anyone opens. See app/_components/Link.tsx.
          prefetch={false}
          className={`${styles.rowLink} flex flex-col gap-0.5 text-inherit no-underline`}
        >
          <span className="text-sm font-medium leading-5" style={{ color: "var(--ink)" }}>
            {entry.title}
          </span>
          {/* --muted, not --faint: the topic is the only place a challenge's
              subject appears, and --faint fails contrast on white. */}
          <span className="text-[13px] leading-5" style={{ color: "var(--muted)" }}>
            {entry.topic}
          </span>
        </Link>
      </td>
      <td className="px-3 py-3 align-middle">
        <Cell>
          <LevelBars level={entry.level} />
          {LEVELS[entry.level - 1]}
        </Cell>
      </td>
      <td className="px-3 py-3 align-middle">
        <Cell tone="var(--ink)">
          <LangIcon id={lang} size={15} />
          {INDEX_LANGUAGE_LABELS[lang]}
          {more > 0 ? (
            <span
              style={{ color: "var(--muted)" }}
              title={entry.langs.map((l) => INDEX_LANGUAGE_LABELS[l]).join(", ")}
            >
              +{more}
            </span>
          ) : null}
        </Cell>
      </td>
      <td className="px-3 py-3 align-middle">
        <Cell>{formatLabel(entry.steps)}</Cell>
      </td>
      <td className="px-3 py-3 text-right align-middle">
        {/* A block flex box like `Cell`'s: an inline one rests on the text
            baseline and sat a few pixels above the row's other values. */}
        <span className="flex h-5 items-center justify-end whitespace-nowrap text-sm leading-5">
          <StatusMark status={entry.status} />
        </span>
      </td>
    </tr>
  );
}
