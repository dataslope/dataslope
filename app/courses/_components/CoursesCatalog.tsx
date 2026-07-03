"use client";

/**
 * The `/courses` catalog — implements the "2a — Refined sidebar" mockup from
 * the courses-page redesign: a borderless 224px filter sidebar (search,
 * mono language icons, bar-style level meters, counts) next to a hairline-
 * separated course list with single-shade motif art.
 *
 * All filtering/sorting is client-side over the build-time course array the
 * server page passes in; the sidebar counts are totals over the whole
 * catalog (not the filtered list), matching the mockup.
 */
import { useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import type { IconType } from "react-icons";
import Link from "@/app/_components/Link";
import {
  LANGUAGE_ICONS,
  LANGUAGE_ICON_SIZE_FACTOR,
} from "@/app/_components/languageIcons";
import { formatTagLabel } from "@/lib/tagLabels";
import type { CatalogCourse } from "@/lib/courseCatalog";
import { CourseGlyph } from "./courseArt";

// Sidebar language order, from the mockup. Languages found in the catalog but
// missing here (future additions) are appended alphabetically.
const LANG_ORDER = [
  "python",
  "sql",
  "javascript",
  "typescript",
  "c",
  "cpp",
  "csharp",
  "java",
  "r",
];

const LEVELS = ["beginner", "intermediate", "advanced"] as const;
type Level = (typeof LEVELS)[number];
const LEVEL_RANK: Record<string, number> = {
  beginner: 0,
  intermediate: 1,
  advanced: 2,
};

type Sort = "popular" | "az" | "level";

// Theme-follower shorthands (the mockup's CSS variables → brand tokens).
const HAIRLINE = "border-[var(--ds-gray-100)] dark:border-white/[0.07]";
const SOFT = "text-[var(--ds-gray-500)] dark:text-[var(--ds-gray-400)]";
const FAINT = "text-[var(--ds-gray-400)] dark:text-[var(--ds-gray-500)]";
const MUTED = "text-[var(--ds-gray-600)] dark:text-[var(--ds-gray-400)]";
const HEADING = "text-[var(--ds-gray-900)] dark:text-white";
const ACCENT = "text-[var(--ds-blue-700)] dark:text-[var(--ds-blue-400)]";
const HOVER_BG = "hover:bg-[var(--ds-gray-100)] dark:hover:bg-white/[0.08]";

/** Neutral database glyph for "sql" — the shared language-icon registry only
 *  has per-engine marks (SQLite/PostgreSQL/DuckDB); path from the mockup. */
function SqlIcon({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
      <path d="M12 2C7.58 2 4 3.79 4 6s3.58 4 8 4 8-1.79 8-4-3.58-4-8-4zM4 8.5V12c0 2.21 3.58 4 8 4s8-1.79 8-4V8.5c-1.72 1.5-4.7 2.5-8 2.5s-6.28-1-8-2.5zM4 14.5V18c0 2.21 3.58 4 8 4s8-1.79 8-4v-3.5c-1.72 1.5-4.7 2.5-8 2.5s-6.28-1-8-2.5z" />
    </svg>
  );
}

/** Mono (currentColor) language icon at the mockup's optical sizes. */
function LangIcon({ id, size = 16 }: { id: string; size?: number }) {
  if (id === "sql") {
    return (
      <span
        className="inline-flex shrink-0 items-center justify-center"
        style={{ width: size, height: size }}
        aria-hidden="true"
      >
        <SqlIcon size={size} />
      </span>
    );
  }
  const Icon: IconType | undefined = LANGUAGE_ICONS[id];
  if (!Icon) return null;
  const factor = LANGUAGE_ICON_SIZE_FACTOR[id] ?? 1;
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <Icon size={Math.round(size * factor)} />
    </span>
  );
}

/** The mockup's bar-style level meter: three 11×4 bars, 1 green / 2 blue /
 *  3 red filled left-to-right, the rest on the neutral track. */
function LevelBars({ level }: { level: string }) {
  const n = level === "beginner" ? 1 : level === "advanced" ? 3 : 2;
  const fill =
    level === "beginner"
      ? "bg-[var(--ds-green-500)]"
      : level === "advanced"
        ? "bg-[var(--ds-red-500)]"
        : "bg-[var(--ds-blue-500)]";
  return (
    <span className="inline-flex gap-0.5" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={`h-1 w-[11px] rounded-[1px] ${
            i < n ? fill : "bg-[#e2e5ea] dark:bg-white/[0.14]"
          }`}
        />
      ))}
    </span>
  );
}

/** One sidebar filter row: leading glyph, label, trailing count. */
function SideRow({
  active,
  onClick,
  glyph,
  label,
  count,
  capitalize,
}: {
  active: boolean;
  onClick: () => void;
  glyph: React.ReactNode;
  label: string;
  count: number;
  capitalize?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-0.5 py-[7px] text-left text-[13.5px] transition-colors ${
        active
          ? `font-semibold ${ACCENT}`
          : "text-[#121212] dark:text-white"
      }`}
    >
      {glyph}
      <span className={`flex-1 ${capitalize ? "capitalize" : ""}`}>
        {label}
      </span>
      <span className={`text-xs font-medium ${active ? ACCENT : FAINT}`}>
        {count}
      </span>
    </button>
  );
}

/** A native `<select>` styled as a filter dropdown for the mobile filter bar
 *  (single-select: the sidebar's multi-select rows are desktop-only). */
function MobileFilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className={`w-full cursor-pointer appearance-none rounded-lg border bg-transparent py-2 pl-3 pr-8 text-[13px] font-medium text-[#121212] outline-none [color-scheme:light] dark:text-white dark:[color-scheme:dark] ${HAIRLINE}`}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={14}
        aria-hidden="true"
        className={`pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 ${FAINT}`}
      />
    </div>
  );
}

function courseSearchText(c: CatalogCourse): string {
  const tags = Object.values(c.tags).flat().map(formatTagLabel);
  return `${c.title} ${c.description} ${tags.join(" ")}`.toLowerCase();
}

export function CoursesCatalog({ courses }: { courses: CatalogCourse[] }) {
  const [q, setQ] = useState("");
  const [langs, setLangs] = useState<string[]>([]);
  const [levels, setLevels] = useState<string[]>([]);
  const [sort, setSort] = useState<Sort>("popular");

  const toggle = (arr: string[], v: string) =>
    arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

  // Sidebar rows: fixed mockup order, restricted to languages that actually
  // occur; unknown future languages append alphabetically.
  const languages = useMemo(() => {
    const present = new Set(
      courses.map((c) => c.tags.language?.[0]).filter(Boolean) as string[],
    );
    const ordered = LANG_ORDER.filter((l) => present.has(l));
    const extras = [...present].filter((l) => !LANG_ORDER.includes(l)).sort();
    return [...ordered, ...extras];
  }, [courses]);

  const langCount = (l: string) =>
    courses.filter((c) => c.tags.language?.[0] === l).length;
  const levelCount = (l: Level) =>
    courses.filter((c) => c.tags.level?.[0] === l).length;

  const searchText = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of courses) m.set(c.slug, courseSearchText(c));
    return m;
  }, [courses]);

  const list = useMemo(() => {
    let out = courses.slice();
    if (langs.length) {
      out = out.filter((c) => langs.includes(c.tags.language?.[0] ?? ""));
    }
    if (levels.length) {
      out = out.filter((c) => levels.includes(c.tags.level?.[0] ?? ""));
    }
    const needle = q.trim().toLowerCase();
    if (needle) {
      out = out.filter((c) => searchText.get(c.slug)?.includes(needle));
    }
    if (sort === "az") {
      out.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sort === "level") {
      out.sort(
        (a, b) =>
          (LEVEL_RANK[a.tags.level?.[0] ?? "intermediate"] ?? 1) -
            (LEVEL_RANK[b.tags.level?.[0] ?? "intermediate"] ?? 1) ||
          a.popularity - b.popularity,
      );
    } else {
      out.sort((a, b) => a.popularity - b.popularity);
    }
    return out;
  }, [courses, langs, levels, q, sort, searchText]);

  const hasFilters = Boolean(q || langs.length || levels.length);
  const reset = () => {
    setQ("");
    setLangs([]);
    setLevels([]);
  };
  const countText = list.length === 1 ? "1 course" : `${list.length} courses`;

  return (
    <>
      {/* ── Mobile filter bar ── the sidebar is desktop-only; on mobile the
          language + difficulty filters collapse to dropdowns that stick to
          the top (just under the nav) once the page scrolls. Full-bleed
          background so scrolled rows never show through. */}
      <div className="sticky top-11 z-30 -mx-4 mt-8 border-b bg-white px-4 py-3 md:hidden dark:bg-[#121212] sm:-mx-6 sm:px-6 border-[var(--ds-gray-100)] dark:border-white/[0.07]">
        <label
          className={`flex items-center gap-[9px] rounded-lg border px-3 py-2 ${HAIRLINE}`}
        >
          <Search size={15} className={FAINT} aria-hidden="true" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search courses…"
            className="min-w-0 flex-1 border-none bg-transparent text-[13.5px] text-[#121212] outline-none placeholder:text-[var(--ds-gray-400)] dark:text-white dark:placeholder:text-[var(--ds-gray-500)]"
          />
        </label>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <MobileFilterSelect
            label="Filter by language"
            value={langs[0] ?? ""}
            onChange={(v) => setLangs(v ? [v] : [])}
            options={[
              { value: "", label: "All languages" },
              ...languages.map((l) => ({
                value: l,
                label: `${formatTagLabel(l)} (${langCount(l)})`,
              })),
            ]}
          />
          <MobileFilterSelect
            label="Filter by difficulty"
            value={levels[0] ?? ""}
            onChange={(v) => setLevels(v ? [v] : [])}
            options={[
              { value: "", label: "All difficulties" },
              ...LEVELS.map((l) => ({
                value: l,
                label: `${formatTagLabel(l)} (${levelCount(l)})`,
              })),
            ]}
          />
        </div>
        {hasFilters && (
          <button
            type="button"
            onClick={reset}
            className={`mt-2.5 cursor-pointer text-[13px] font-medium ${ACCENT}`}
          >
            Reset filters
          </button>
        )}
      </div>

      <div className="mt-8 grid grid-cols-1 items-start gap-10 md:mt-10 md:grid-cols-[224px_1fr] md:gap-14">
        {/* ── Filter sidebar (desktop only) ── */}
        <aside className="hidden flex-col gap-7 pt-0.5 md:flex">
        <label
          className={`flex items-center gap-[9px] border-b px-0.5 pb-2.5 pt-1.5 ${HAIRLINE}`}
        >
          <Search size={15} className={FAINT} aria-hidden="true" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search courses…"
            className="min-w-0 flex-1 border-none bg-transparent text-[13.5px] text-[#121212] outline-none placeholder:text-[var(--ds-gray-400)] dark:text-white dark:placeholder:text-[var(--ds-gray-500)]"
          />
        </label>

        <div className="flex flex-col gap-px">
          <h3
            className={`mb-2.5 text-[11.5px] font-semibold uppercase tracking-[0.06em] ${FAINT}`}
          >
            Language
          </h3>
          {languages.map((l) => (
            <SideRow
              key={l}
              active={langs.includes(l)}
              onClick={() => setLangs(toggle(langs, l))}
              glyph={<LangIcon id={l} size={16} />}
              label={formatTagLabel(l)}
              count={langCount(l)}
            />
          ))}
        </div>

        <div className="flex flex-col gap-px">
          <h3
            className={`mb-2.5 text-[11.5px] font-semibold uppercase tracking-[0.06em] ${FAINT}`}
          >
            Level
          </h3>
          {LEVELS.map((l) => (
            <SideRow
              key={l}
              active={levels.includes(l)}
              onClick={() => setLevels(toggle(levels, l))}
              glyph={<LevelBars level={l} />}
              label={l}
              count={levelCount(l)}
              capitalize
            />
          ))}
        </div>

        {hasFilters && (
          <button
            type="button"
            onClick={reset}
            className={`cursor-pointer px-0.5 text-left text-[13px] font-medium ${ACCENT}`}
          >
            Reset filters
          </button>
        )}
      </aside>

      {/* ── Course list ── */}
      <div className="flex min-w-0 flex-col">
        <div
          className={`flex items-center gap-2.5 border-b px-0.5 pb-3.5 ${HAIRLINE}`}
        >
          <span className={`text-[13.5px] ${SOFT}`}>{countText}</span>
          <span className="flex-1" />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            aria-label="Sort courses"
            className={`cursor-pointer border-none bg-transparent px-0.5 py-1 text-[13px] font-medium ${SOFT}`}
          >
            <option value="popular">Most popular</option>
            <option value="az">A to Z</option>
            <option value="level">By level</option>
          </select>
        </div>

        {list.map((course) => {
          const lang = course.tags.language?.[0] ?? "python";
          const level = course.tags.level?.[0] ?? "intermediate";
          return (
            <Link
              key={course.slug}
              href={`/courses/${course.slug}`}
              // Dense index list — don't viewport-prefetch every course row
              // (see the opt-out note in app/_components/Link.tsx).
              prefetch={false}
              className={`-mx-3 grid grid-cols-[44px_1fr] items-start gap-5 px-3 py-6 ${HOVER_BG}`}
            >
              <CourseGlyph tags={course.tags} size={36} />
              <span className="flex min-w-0 flex-col gap-[5px]">
                <span
                  className={`text-[17px] font-semibold tracking-[-0.01em] ${HEADING}`}
                >
                  {course.title}
                </span>
                <span
                  className={`line-clamp-2 text-sm leading-normal ${MUTED}`}
                >
                  {course.description}
                </span>
                {/* Difficulty + language, below the description and aligned
                    with it. The fixed-width difficulty column lines every
                    language icon up at the same x across all rows. Shown on
                    every breakpoint. */}
                <span className="mt-2 grid grid-cols-[8.5rem_auto] items-center text-[12.5px]">
                  <span className="inline-flex items-center gap-[7px]">
                    <LevelBars level={level} />
                    <span className={`font-medium capitalize ${SOFT}`}>
                      {level}
                    </span>
                  </span>
                  <span className={`inline-flex items-center gap-1.5 ${SOFT}`}>
                    <LangIcon id={lang} size={14} />
                    {formatTagLabel(lang)}
                  </span>
                </span>
              </span>
            </Link>
          );
        })}

        {courses.length > 0 && list.length === 0 && (
          <div className="px-6 py-14 text-center">
            <p className={`text-[15px] font-medium ${HEADING}`}>
              No courses match
            </p>
            <p className={`mt-1.5 text-[13.5px] ${MUTED}`}>
              Try a different search, or{" "}
              <button
                type="button"
                onClick={reset}
                className={`cursor-pointer text-[13.5px] font-medium ${ACCENT}`}
              >
                reset the filters
              </button>
              .
            </p>
          </div>
        )}
        </div>
      </div>
    </>
  );
}
