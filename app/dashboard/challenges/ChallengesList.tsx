"use client";

/**
 * The challenge catalog at `/dashboard/challenges`.
 *
 * Built from the "Challenges Page Studio" design. The Studio shell
 * (`_studio/StudioShell`) already supplies the sidebar, the top bar and the
 * 1280px content container, so this renders only the page body: heading,
 * filter row, table and pagination.
 *
 * Rows arrive as a prop from the server page. Two of them have a workspace
 * behind them and link to `/challenges/<slug>`; the rest are catalog fixtures
 * with nowhere to go yet, so their titles render as plain text rather than as
 * links that lead nowhere.
 *
 * Filtering and paging are client state over the whole list — 52 rows is far
 * too few to justify a round trip, and it keeps the page static.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, Circle, CircleCheckBig, Search, X } from "lucide-react";
import { LangIcon } from "@/app/_components/languageIcons";
import {
  CHALLENGE_STATUS_LABELS,
  INDEX_LANGUAGE_LABELS,
  type ChallengeIndexEntry,
  type ChallengeStatus,
  type IndexLanguage,
} from "@/lib/challengeCatalog";

const PAGE_SIZE = 10;

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

/** A `<select>` with the chevron the design draws over it. */
function Select({
  value,
  onChange,
  label,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <span className="relative inline-flex">
      <select
        className="ds-select w-auto"
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {children}
      </select>
      <ChevronDown
        size={14}
        aria-hidden="true"
        className="pointer-events-none absolute right-[11px] top-3"
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

const EMPTY: Filters = { q: "", status: "", lang: "", level: "", format: "" };

function matches(entry: ChallengeIndexEntry, f: Filters): boolean {
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

export function ChallengesList({ entries }: { entries: ChallengeIndexEntry[] }) {
  const all = entries;
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [page, setPage] = useState(1);

  const set = <K extends keyof Filters>(key: K) => (value: string) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  };

  const filtered = useMemo(() => all.filter((e) => matches(e, filters)), [all, filters]);
  const total = filtered.length;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  // The current page can fall past the end when a filter shrinks the list.
  const current = Math.min(page, pageCount);
  const start = (current - 1) * PAGE_SIZE;
  const rows = filtered.slice(start, start + PAGE_SIZE);

  const solved = all.filter((e) => e.status === "solved").length;
  const hasFilters = Object.values(filters).some(Boolean);

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
            value={filters.q}
            onChange={(e) => set("q")(e.target.value)}
            placeholder="Search challenges…"
            aria-label="Search challenges"
            className="min-w-0 flex-1 border-none bg-transparent text-sm outline-none"
            style={{ color: "var(--ink)" }}
          />
        </label>

        <Select value={filters.status} onChange={set("status")} label="Status">
          <option value="">All statuses</option>
          {(["solved", "attempted", "new"] as const).map((s) => (
            <option key={s} value={s}>
              {CHALLENGE_STATUS_LABELS[s]}
            </option>
          ))}
        </Select>

        <Select value={filters.lang} onChange={set("lang")} label="Language">
          <option value="">All languages</option>
          {(Object.keys(INDEX_LANGUAGE_LABELS) as IndexLanguage[]).map((id) => (
            <option key={id} value={id}>
              {INDEX_LANGUAGE_LABELS[id]}
            </option>
          ))}
        </Select>

        <Select value={filters.level} onChange={set("level")} label="Level">
          <option value="">All levels</option>
          {LEVELS.map((label, i) => (
            <option key={label} value={String(i + 1)}>
              {label}
            </option>
          ))}
        </Select>

        <Select value={filters.format} onChange={set("format")} label="Format">
          <option value="">Any format</option>
          <option value="single">Single step</option>
          <option value="multi">Multi-step</option>
        </Select>

        {hasFilters ? (
          <button
            type="button"
            onClick={() => {
              setFilters(EMPTY);
              setPage(1);
            }}
            className="ds-btn-chip"
          >
            <X size={12} aria-hidden="true" />
            Clear
          </button>
        ) : null}

        <span className="flex-1" />
        <span
          className="inline-flex items-center gap-2 whitespace-nowrap text-[13px]"
          style={{ color: "var(--muted)" }}
        >
          <CircleCheckBig size={15} aria-hidden="true" style={{ color: "var(--green-text)" }} />
          {solved} of {all.length} solved
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
            onClick={() => {
              setFilters(EMPTY);
              setPage(1);
            }}
            className="border-0 bg-transparent p-0 text-sm font-medium underline underline-offset-2"
            style={{ color: "var(--green-text)" }}
          >
            Clear the filters
          </button>{" "}
          to see everything.
        </p>
      ) : (
        <>
          <div
            className="mt-5 overflow-hidden rounded-[10px]"
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
                    <Row key={entry.title} entry={entry} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-3.5 flex flex-wrap items-center gap-1.5 px-1">
            <span className="whitespace-nowrap text-[13px]" style={{ color: "var(--muted)" }}>
              {start + 1}–{start + rows.length} of {total}
            </span>
            {pageCount > 1 ? (
              <nav aria-label="Pagination" className="ml-auto flex items-center gap-1.5">
                <button
                  type="button"
                  className="ds-page-btn"
                  disabled={current <= 1}
                  onClick={() => setPage(Math.max(1, current - 1))}
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
                      onClick={() => setPage(n)}
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
                  onClick={() => setPage(Math.min(pageCount, current + 1))}
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

function Row({ entry }: { entry: ChallengeIndexEntry }) {
  const lang = entry.langs[0];
  const more = entry.langs.length - 1;
  return (
    <tr
      className="ds-challenge-row"
      data-clickable={entry.slug ? "true" : undefined}
      style={{ borderTop: "1px solid var(--divider)" }}
    >
      <td className="py-3 pl-4 pr-0 align-middle">
        <StatusIcon status={entry.status} />
      </td>
      <td className="p-3 align-middle">
        {/* Only the two challenges with a workspace behind them are links;
            the rest would be a link to nowhere. */}
        {entry.slug ? (
          <Link
            href={`/challenges/${entry.slug}`}
            className="flex flex-col gap-0.5 text-inherit no-underline"
          >
            <RowTitle entry={entry} />
          </Link>
        ) : (
          <span className="flex flex-col gap-0.5">
            <RowTitle entry={entry} />
          </span>
        )}
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
          style={{ background: "var(--chip-bg)", color: "var(--muted)" }}
        >
          {entry.steps > 1 ? `${entry.steps} steps` : "Single step"}
        </span>
      </td>
    </tr>
  );
}

function RowTitle({ entry }: { entry: ChallengeIndexEntry }) {
  return (
    <>
      <span className="text-sm font-medium leading-tight" style={{ color: "var(--ink)" }}>
        {entry.title}
      </span>
      <span className="text-[12.5px]" style={{ color: "var(--faint)" }}>
        {entry.topic}
      </span>
    </>
  );
}
