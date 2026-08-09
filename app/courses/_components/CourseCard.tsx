/**
 * The course row card from the `/courses` catalog, extracted so the home
 * page's Courses section can render the exact same card: mono glyph, title,
 * description, then a difficulty + language meta line aligned on a fixed
 * grid column (so language icons line up across rows).
 *
 * `LangIcon` and `LevelBars` are exported too, the catalog's filter sidebar
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
import imageManifest from "@/lib/generated/images";
import { CourseGlyph } from "./courseArt";

const HEADING = "text-[var(--ds-gray-900)] dark:text-white";
// Hover affordance: no background fill, just a subtle shift of the glyph +
// title toward the brand blue, and a gentle darkening of the description.
const HOVER_TEXT =
  "transition-colors group-hover:text-[var(--ds-blue-700)] dark:group-hover:text-[var(--ds-blue-400)]";
// The glyph both recolours and nudges to the right on hover, so the whole row
// feels responsive. `transition-[color,transform]` animates both at once.
const HOVER_GLYPH =
  "transition-[color,translate] duration-200 group-hover:translate-x-0.5 group-hover:text-[var(--ds-blue-700)] dark:group-hover:text-[var(--ds-blue-400)]";
// The description shifts a shade darker on hover, subtle enough to read as a
// whole-card affordance without competing with the title's blue.
const HOVER_DESC =
  "transition-colors group-hover:text-[var(--ds-gray-600)] dark:group-hover:text-[var(--ds-gray-300)]";

/** Neutral database glyph for "sql", the shared language-icon registry only
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

// Output extension → MIME type, mirroring app/_components/mdx/Figure.tsx.
const THUMB_MIME: Record<string, string> = {
  webp: "image/webp",
  png: "image/png",
  jpg: "image/jpeg",
  avif: "image/avif",
};

/**
 * The course's generated thumbnail, or the mono glyph when it has none.
 *
 * The cut-out is used rather than the opaque original so the artwork sits on
 * the row background in both themes instead of inside a white tile. Courses
 * without generated art keep the glyph, so the catalog degrades a row at a
 * time rather than all-or-nothing.
 *
 * `w-full` with `height: auto` means the column width *is* the size of the
 * drawing, which is why the cut-outs are cropped to their artwork on both axes
 * (`scripts/lib/cutouts.mjs`) rather than vertically like an in-lesson figure:
 * a transparent margin here would be column the subject is painted smaller to
 * make room for. Rows are `items-start`, so the ragged heights that leaves are
 * a top-aligned list rather than anything that shifts.
 *
 * The column's width comes from `LAYOUT` above — the art is sized by the
 * surface, not by the image.
 */
function CourseThumb({ course }: { course: CatalogCourse }) {
  const slug = `${course.slug}-thumbnail-cutout`;
  const entry = imageManifest[slug];
  if (!entry) {
    return (
      <CourseGlyph
        slug={course.slug}
        tags={course.tags}
        size={22}
        className={`mt-0.5 justify-self-center text-[var(--ds-gray-900)] dark:text-white ${HOVER_GLYPH}`}
      />
    );
  }
  const fallback = entry.formats[entry.formats.length - 1];
  const sources = entry.formats.slice(0, -1);
  return (
    <picture>
      {sources.map((ext) => (
        <source key={ext} srcSet={`/images/${slug}.${ext}`} type={THUMB_MIME[ext]} />
      ))}
      <img
        src={`/images/${slug}.${fallback}`}
        width={entry.width}
        height={entry.height}
        alt=""
        aria-hidden="true"
        loading="lazy"
        decoding="async"
        className="mt-0.5 h-auto w-full transition-transform duration-200 group-hover:scale-105"
      />
    </picture>
  );
}

/**
 * How much room the row gets, which is a property of the surface it is on.
 *
 * `catalog` is /courses: one row per line at full width, where the page IS the
 * list and a visitor is reading it to choose. It gets the larger art, the
 * looser rhythm, and a description set at reading size and never truncated —
 * the catalog is the one place the full sentence is the point.
 *
 * `preview` is the home page's Courses section: four rows in two columns,
 * inside a page that has other things to say. It stays denser, and clamps the
 * description, so four of them still read as a taste of the catalog rather
 * than as the catalog.
 */
export type CourseCardLayout = "catalog" | "preview";

const LAYOUT = {
  catalog: {
    row: "grid-cols-[96px_1fr] gap-5 py-8 sm:grid-cols-[116px_1fr] sm:gap-6",
    text: "gap-2",
    desc: "text-[16px] leading-[1.7]",
  },
  preview: {
    row: "grid-cols-[84px_1fr] gap-5 py-6",
    text: "gap-[5px]",
    desc: "line-clamp-2 text-[15px] leading-[1.6]",
  },
} as const satisfies Record<CourseCardLayout, Record<string, string>>;

export function CourseCard({
  course,
  layout = "preview",
}: {
  course: CatalogCourse;
  layout?: CourseCardLayout;
}) {
  const lang = course.tags.language?.[0] ?? "python";
  const level = course.tags.level?.[0] ?? "intermediate";
  const l = LAYOUT[layout];
  return (
    <Link
      href={`/courses/${course.slug}`}
      // Dense index list, don't viewport-prefetch every course row
      // (see the opt-out note in app/_components/Link.tsx).
      prefetch={false}
      className={`group -mx-3 grid items-start px-3 ${l.row}`}
    >
      <CourseThumb course={course} />
      <span className={`flex min-w-0 flex-col ${l.text}`}>
        <span
          className={`text-[17px] font-semibold tracking-[-0.01em] ${HEADING} ${HOVER_TEXT}`}
        >
          {course.title}
        </span>
        <span
          className={`text-[#999999] dark:text-[var(--ds-gray-400)] ${l.desc} ${HOVER_DESC}`}
        >
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
