"use client";

/**
 * The `/courses` catalog, implements the "2a, Refined sidebar" mockup from
 * the courses-page redesign: a borderless 224px filter sidebar (search,
 * mono language icons, bar-style level meters, counts) next to a hairline-
 * separated course list with single-shade motif art.
 *
 * All filtering/sorting is client-side over the build-time course array the
 * server page passes in; the sidebar counts are totals over the whole
 * catalog (not the filtered list), matching the mockup.
 */
import { useMemo, useState } from "react";
import { Select } from "@base-ui-components/react/select";
import {
  ArrowDownAZ,
  BarChart3,
  ChevronDown,
  Code2,
  GraduationCap,
  Search,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { formatTagLabel } from "@/lib/tagLabels";
import type { CatalogCourse } from "@/lib/courseCatalog";
import { CourseCard, LangIcon, LevelBars } from "./CourseCard";

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

const SORT_OPTIONS: { value: Sort; label: string; icon: LucideIcon }[] = [
  { value: "popular", label: "Recommended", icon: Sparkles },
  { value: "az", label: "A to Z", icon: ArrowDownAZ },
  { value: "level", label: "By level", icon: BarChart3 },
];

// Theme-follower shorthands (the mockup's CSS variables → brand tokens).
const HAIRLINE = "border-[var(--ds-gray-100)] dark:border-white/[0.07]";
const FAINT = "text-[var(--ds-gray-400)] dark:text-[var(--ds-gray-500)]";
const MUTED = "text-[var(--ds-gray-600)] dark:text-[var(--ds-gray-400)]";
const HEADING = "text-[var(--ds-gray-900)] dark:text-white";
const ACCENT = "text-[var(--ds-blue-700)] dark:text-[var(--ds-blue-400)]";

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
      className={`flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-0.5 py-[7px] text-left text-[14px] transition-[color,translate] hover:translate-x-0.5 ${
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

/** Sort dropdown, a Base UI Select styled as a borderless chip (subtle
 *  filled background, body-coloured text) with a lucide icon per option. */
function SortSelect({
  value,
  onChange,
}: {
  value: Sort;
  onChange: (value: Sort) => void;
}) {
  const active = SORT_OPTIONS.find((o) => o.value === value) ?? SORT_OPTIONS[0];
  const ActiveIcon = active.icon;
  return (
    <Select.Root
      value={value}
      onValueChange={(next) => {
        if (next != null) onChange(next as Sort);
      }}
    >
      <Select.Trigger
        aria-label="Sort courses"
        className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[var(--ds-gray-100)] px-3 py-1.5 text-[13px] font-medium text-[#121212] outline-none transition-colors hover:bg-[var(--ds-gray-200)] focus-visible:outline-none dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/10"
      >
        <ActiveIcon size={14} aria-hidden="true" />
        <Select.Value className="text-left">{active.label}</Select.Value>
        <Select.Icon className={FAINT}>
          <ChevronDown size={14} />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner
          sideOffset={6}
          alignItemWithTrigger={false}
          className="z-50"
        >
          <Select.Popup className="min-w-44 overflow-y-auto rounded-xl border border-[var(--ds-gray-200)] bg-white p-1.5 shadow-xl shadow-black/5 outline-none transition-[opacity,transform] data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0 dark:border-white/10 dark:bg-[#1a1a1a] dark:shadow-black/40">
            {SORT_OPTIONS.map((o) => {
              const Icon = o.icon;
              return (
                <Select.Item
                  key={o.value}
                  value={o.value}
                  className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-[var(--ds-gray-700)] outline-none transition-colors data-[highlighted]:bg-[var(--ds-gray-100)] data-[highlighted]:text-[var(--ds-gray-900)] data-[selected]:font-medium data-[selected]:text-[var(--ds-blue-700)] dark:text-[var(--ds-gray-200)] dark:data-[highlighted]:bg-white/10 dark:data-[highlighted]:text-white dark:data-[selected]:text-[var(--ds-blue-400)]"
                >
                  <Icon size={14} aria-hidden="true" />
                  <Select.ItemText>{o.label}</Select.ItemText>
                </Select.Item>
              );
            })}
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
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

  // Single-select per category: clicking the active row clears it, clicking
  // another replaces the selection. Kept as a 0-or-1-element array so the
  // filter logic (and the mobile dropdowns) stay unchanged.
  const selectOne = (arr: string[], v: string) =>
    arr[0] === v ? [] : [v];

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
            className={`mb-2.5 flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-[0.01em] ${FAINT}`}
          >
            <Code2 size={13} aria-hidden="true" />
            Language
          </h3>
          {languages.map((l) => (
            <SideRow
              key={l}
              active={langs.includes(l)}
              onClick={() => setLangs(selectOne(langs, l))}
              glyph={<LangIcon id={l} size={16} />}
              label={formatTagLabel(l)}
              count={langCount(l)}
            />
          ))}
        </div>

        <div className="flex flex-col gap-px">
          <h3
            className={`mb-2.5 flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-[0.01em] ${FAINT}`}
          >
            <BarChart3 size={13} aria-hidden="true" />
            Level
          </h3>
          {LEVELS.map((l) => (
            <SideRow
              key={l}
              active={levels.includes(l)}
              onClick={() => setLevels(selectOne(levels, l))}
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
          <span className="inline-flex items-center gap-1.5 text-[13.5px] text-[#121212] dark:text-white">
            <GraduationCap size={15} aria-hidden="true" />
            {countText}
          </span>
          <span className="flex-1" />
          <SortSelect value={sort} onChange={setSort} />
        </div>

        {list.map((course) => (
          <CourseCard key={course.slug} course={course} />
        ))}

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
