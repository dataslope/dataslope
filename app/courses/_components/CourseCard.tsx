/**
 * The course row card from the `/courses` catalog, extracted so the home
 * page's Courses section can render the exact same card: mono glyph, title,
 * description, then a difficulty + language meta line aligned on a fixed
 * grid column (so language icons line up across rows).
 *
 * `LevelBars` is exported too, the catalog's filter sidebar reuses it as a row
 * glyph. Its language counterpart, `LangIcon`, used to live here and be
 * re-exported for the same reason; it now sits in the shared icon registry
 * (`app/_components/languageIcons.tsx`) beside the map it reads, so the footer
 * can render a language glyph without importing this card and dragging the
 * image manifest and the course artwork into the bundle with it.
 */
import Link from "@/app/_components/Link";
import { LangIcon } from "@/app/_components/languageIcons";
import { formatTagLabel } from "@/lib/tagLabels";
import type { CatalogCourse } from "@/lib/courseCatalog";
import imageManifest from "@/lib/generated/images";
import { CourseGlyph } from "./courseArt";

const HEADING = "text-[var(--ds-gray-900)] dark:text-white";
// Hover affordance: no background fill, just a subtle shift of the glyph +
// title toward the brand blue, and a gentle darkening of the description.
const HOVER_TEXT =
  "transition-colors group-hover:text-[var(--ds-blue-700)] dark:group-hover:text-[var(--ds-blue-400)]";
// The glyph both recolors and nudges to the right on hover, so the whole row
// feels responsive. `transition-[color,transform]` animates both at once.
const HOVER_GLYPH =
  "transition-[color,translate] duration-200 group-hover:translate-x-0.5 group-hover:text-[var(--ds-blue-700)] dark:group-hover:text-[var(--ds-blue-400)]";
// The description shifts a shade darker on hover, subtle enough to read as a
// whole-card affordance without competing with the title's blue.
const HOVER_DESC =
  "transition-colors group-hover:text-[var(--ds-gray-600)] dark:group-hover:text-[var(--ds-gray-300)]";

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
    // `block` is stated rather than relied on: a <picture> is inline by
    // default and is only blockified here because it happens to be a grid
    // item, which is not a property worth depending on for the width and auto
    // margins `thumbClass` sets.
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
 * How much room the row gets, which is a property of the surface it is on.
 *
 * `catalog` is /courses: one row per line at full width, where the page IS the
 * list and a visitor is reading it to choose. It gets the larger art, the
 * larger title and the looser rhythm.
 *
 * On a phone it also changes *shape*. A thumbnail column beside the copy costs
 * the same 86px on a 390px screen that it costs on a 1200px one, and what it
 * takes comes out of the text: the title wraps to two lines, and a description
 * that reads as one sentence on a desktop runs to six lines on a phone. So
 * below `sm` the row stacks, and the art gets the full width instead of a
 * sliver of it. The description is clamped there and only there — the catalog
 * is still the place the full sentence is the point, but a phone cannot spend
 * six lines on it and stay a list you can scan.
 *
 * `preview` is the home page's Courses section: four rows in two columns,
 * inside a page that has other things to say. It stays denser, and clamps the
 * description at every width, so four of them still read as a taste of the
 * catalog rather than as the catalog.
 */
export type CourseCardLayout = "catalog" | "preview";

const LAYOUT = {
  catalog: {
    // `gap-5` rather than `gap-4` is the space under the stacked thumbnail;
    // once the art is centred and no longer touches either edge, the old gap
    // read as the title crowding it.
    row: "grid-cols-1 gap-5 py-8 sm:grid-cols-[104px_1fr] sm:gap-6",
    text: "gap-2",
    // Two thirds of the row, centred, once the row stacks on a phone. Full
    // width is more art than a title and two lines of description can carry,
    // and it pushed the meta line off the bottom of the screen. On a desktop
    // the thumbnail is back in its own 104px column, where `w-full` *is* the
    // column and the auto margins do nothing.
    thumb: "w-[65%] mx-auto sm:w-full",
    // One size at every breakpoint: the catalog row is the same shape on a
    // phone as on a desktop, so the title has no reason to step down. The
    // tighter tracking is what keeps 18px from reading loose at this weight,
    // and the leading matches the description's so the two blocks share a
    // rhythm instead of the title sitting tight above looser copy.
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
      // Dense index list, don't viewport-prefetch every course row
      // (see the opt-out note in app/_components/Link.tsx).
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
