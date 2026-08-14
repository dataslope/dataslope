/**
 * The course row card from the `/courses` catalog, also rendered by the home
 * page's Courses section. `LevelBars` is exported for the catalog's filter
 * sidebar.
 */
import Link from "@/app/_components/Link";
import { LangIcon } from "@/app/_components/languageIcons";
import { formatTagLabel } from "@/lib/tagLabels";
import type { CatalogCourse } from "@/lib/courseCatalog";
import imageManifest from "@/lib/generated/images";
import { CourseGlyph } from "./courseArt";

const HEADING = "text-[var(--ds-gray-900)] dark:text-white";
// Hover affordance: no background fill, just glyph + title shifting toward
// brand blue and the description darkening a shade.
const HOVER_TEXT =
  "transition-colors group-hover:text-[var(--ds-blue-700)] dark:group-hover:text-[var(--ds-blue-400)]";
const HOVER_GLYPH =
  "transition-[color,translate] duration-200 group-hover:translate-x-0.5 group-hover:text-[var(--ds-blue-700)] dark:group-hover:text-[var(--ds-blue-400)]";
const HOVER_DESC =
  "transition-colors group-hover:text-[var(--ds-gray-600)] dark:group-hover:text-[var(--ds-gray-300)]";

/** Bar-style level meter: three bars, 1 green / 2 blue / 3 red filled. */
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
 * The course's generated thumbnail, or the mono glyph when it has none (the
 * catalog degrades a row at a time). Cut-outs sit on the row background in
 * both themes and are cropped to the artwork on both axes
 * (`scripts/lib/cutouts.mjs`), so transparent margins don't shrink the painted
 * subject. Width comes from `LAYOUT`.
 */
function CourseThumb({
  course,
  thumbClass,
}: {
  course: CatalogCourse;
  thumbClass: string;
}) {
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
    // <picture> is inline by default; `block` is needed for the width and
    // auto margins `thumbClass` sets.
    <picture className={`block ${thumbClass}`}>
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
 * How much room the row gets. `catalog` (/courses) runs one row per line with
 * larger art; below `sm` it stacks and clamps the description so the list
 * stays scannable on a phone. `preview` (home page) is denser and clamps the
 * description at every width.
 */
export type CourseCardLayout = "catalog" | "preview";

const LAYOUT = {
  catalog: {
    row: "grid-cols-1 gap-5 py-8 sm:grid-cols-[104px_1fr] sm:gap-6",
    text: "gap-2",
    // 65% centred when stacked on a phone; on desktop `w-full` fills the
    // 104px column and the auto margins do nothing.
    thumb: "w-[65%] mx-auto sm:w-full",
    title: "text-[18px] leading-[1.7] tracking-[-0.02em]",
    desc: "line-clamp-2 text-[16px] leading-[1.7] sm:line-clamp-none",
  },
  preview: {
    row: "grid-cols-[84px_1fr] gap-5 py-6",
    text: "gap-[5px]",
    thumb: "w-full",
    title: "text-[17px] tracking-[-0.01em]",
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
      // Don't viewport-prefetch every course row (see app/_components/Link.tsx).
      prefetch={false}
      className={`group -mx-3 grid items-start px-3 ${l.row}`}
    >
      <CourseThumb course={course} thumbClass={l.thumb} />
      <span className={`flex min-w-0 flex-col ${l.text}`}>
        <span
          className={`font-semibold ${l.title} ${HEADING} ${HOVER_TEXT}`}
        >
          {course.title}
        </span>
        <span
          className={`text-[#999999] dark:text-[var(--ds-gray-400)] ${l.desc} ${HOVER_DESC}`}
        >
          {course.description}
        </span>
        {/* The fixed-width difficulty column lines the language icons up
            across rows. */}
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
