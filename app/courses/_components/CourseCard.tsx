/**
 * The course row card from the `/courses` catalog, extracted so the home
 * page's Courses section can render the exact same card: mono glyph, title,
 * description, then a difficulty + language meta line aligned on a fixed
 * grid column (so language icons line up across rows).
 *
 * `LangIcon` and `LevelBars` are exported too — the catalog's filter sidebar
 * reuses them as row glyphs.
 */
import type { IconType } from "react-icons";
import Link from "@/app/_components/Link";
import {
  LANGUAGE_ICONS,
  LANGUAGE_ICON_SIZE_FACTOR,
} from "@/app/_components/languageIcons";
import { formatTagLabel } from "@/lib/tagLabels";
import type { CatalogCourse } from "@/lib/courseCatalog";
import { CourseGlyph } from "./courseArt";

const HEADING = "text-[var(--ds-gray-900)] dark:text-white";
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
export function LangIcon({ id, size = 16 }: { id: string; size?: number }) {
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
export function LevelBars({ level }: { level: string }) {
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

export function CourseCard({ course }: { course: CatalogCourse }) {
  const lang = course.tags.language?.[0] ?? "python";
  const level = course.tags.level?.[0] ?? "intermediate";
  return (
    <Link
      href={`/courses/${course.slug}`}
      // Dense index list — don't viewport-prefetch every course row
      // (see the opt-out note in app/_components/Link.tsx).
      prefetch={false}
      className={`-mx-3 grid grid-cols-[44px_1fr] items-start gap-5 px-3 py-6 ${HOVER_BG}`}
    >
      <CourseGlyph tags={course.tags} size={32} />
      <span className="flex min-w-0 flex-col gap-[5px]">
        <span
          className={`text-[17px] font-semibold tracking-[-0.01em] ${HEADING}`}
        >
          {course.title}
        </span>
        <span className="line-clamp-2 text-[15px] leading-normal text-[#999999] dark:text-[var(--ds-gray-400)]">
          {course.description}
        </span>
        {/* Difficulty + language, below the description and aligned with it.
            The fixed-width difficulty column lines every language icon up at
            the same x across all rows. Shown on every breakpoint. */}
        <span className="mt-2.5 grid grid-cols-[9.5rem_auto] items-center text-[13.5px] text-[#121212] dark:text-white">
          <span className="inline-flex items-center gap-3">
            <LevelBars level={level} />
            <span className="font-medium capitalize">{level}</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <LangIcon id={lang} size={14} />
            {formatTagLabel(lang)}
          </span>
        </span>
      </span>
    </Link>
  );
}
