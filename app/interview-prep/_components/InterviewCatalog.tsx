/**
 * The `/interview-prep` catalog body: role-track rows plus a footer with
 * totals and a pointer to /courses; the page header lives in the server page.
 * Track data comes from `getInterviewTracks` (lib/interviewCatalog.ts); the
 * per-role presentation lives in `PRESENTATION`, keyed by role slug — a role
 * with no entry still renders, so adding a track in content never breaks the
 * page. Hover affordances are pure CSS, keeping this a server component.
 */
import { Layers } from "lucide-react";
import Link from "@/app/_components/Link";
import imageManifest from "@/lib/generated/images";
import type { InterviewTrack } from "@/lib/interviewCatalog";

interface Presentation {
  /** Short paragraph under the role name. Clamped to three lines, so the
   *  useful detail belongs in the first sentence. */
  description: string;
  /** Image slug for the 3:2 card banner. */
  banner: string;
  /** Alt text describing the banner illustration. */
  bannerAlt: string;
}

const PRESENTATION: Record<string, Presentation> = {
  "data-analyst": {
    description:
      "SQL from joins to window functions, plus pandas, spreadsheets, and the statistics behind an A/B test. Ends on turning a result into a chart and an argument.",
    banner: "interview-data-analyst-thumbnail-cutout",
    bannerAlt: "The Dataslope marmot holding a magnifying lens over an isometric dashboard of small charts",
  },
  "data-scientist": {
    description:
      "Statistics, probability, and experiment design, then machine learning and deep learning. Python, pandas, and SQL throughout, with product-sense metrics questions.",
    banner: "interview-data-scientist-thumbnail-cutout",
    bannerAlt: "The Dataslope marmot holding a flask beside an isometric scatter plane with a fitted curve",
  },
  "data-engineer": {
    description:
      "SQL and data modeling at depth, then the systems around them: batch pipelines, distributed processing, streaming, warehousing, and orchestration you can rely on.",
    banner: "interview-data-engineer-thumbnail-cutout",
    bannerAlt: "The Dataslope marmot guiding colored cubes along an isometric pipeline into a storage silo",
  },
  "analytics-engineer": {
    description:
      "The dbt and warehouse layer between engineering and analytics: dimensional modeling, advanced SQL, data-quality testing, and metrics in a semantic layer.",
    banner: "interview-analytics-engineer-thumbnail-cutout",
    bannerAlt: "The Dataslope marmot feeding raw tiles into an isometric pipeline that returns tidy modelled tables",
  },
  "machine-learning-engineer": {
    description:
      "ML fundamentals, coding, and the statistics under them, then deep learning and LLMs. Closes on ML system design and shipping a model to production.",
    banner: "interview-machine-learning-engineer-thumbnail-cutout",
    bannerAlt: "The Dataslope marmot placing an isometric trained-model block into a deployment container",
  },
  "backend-engineer": {
    description:
      "Data structures and algorithms, Python fundamentals, and object-oriented design, plus concurrency, databases, API design, and system design rounds.",
    banner: "interview-backend-engineer-thumbnail-cutout",
    bannerAlt: "The Dataslope marmot beside an isometric server rack linked to an API gateway block and a database disc",
  },
};

const MIME: Record<string, string> = {
  webp: "image/webp",
  png: "image/png",
  jpg: "image/jpeg",
  avif: "image/avif",
};

/** Track illustration, WebP-first with a raster fallback from the build-time
 *  image manifest. `scripts/trim-cutouts.mjs` crops transparent margins, so
 *  banners arrive at arbitrary aspect ratios: `object-contain` in a fixed 3:2
 *  box keeps the whole artwork visible and all rows the same height
 *  (`object-cover` would crop the subject). `sizes` matches the painted
 *  width, about two thirds of the row. */
function TrackThumb({ slug, alt }: { slug: string; alt: string }) {
  const entry = imageManifest[slug];
  if (!entry) return null;
  const fallback = entry.formats[entry.formats.length - 1];
  const sources = entry.formats.slice(0, -1);
  return (
    // 65% so the banner doesn't outweigh the copy; <picture> is inline by
    // default, so `block` is stated explicitly.
    <picture className="mx-auto block w-[65%]">
      {sources.map((ext) => (
        <source key={ext} srcSet={`/images/${slug}.${ext}`} type={MIME[ext]} sizes="(min-width: 640px) 30vw, 65vw" />
      ))}
      <img
        src={`/images/${slug}.${fallback}`}
        alt={alt}
        width={entry.width}
        height={entry.height}
        loading="lazy"
        decoding="async"
        sizes="(min-width: 640px) 30vw, 65vw"
        // Hover matched to the /courses thumbnail; a transform (not a width)
        // so the art grows without shifting any copy.
        className="block aspect-[3/2] w-full rounded-xl object-contain transition-transform duration-200 group-hover:scale-105"
      />
    </picture>
  );
}

/**
 * One track row: thumbnail, name, description, topic count, link. No surface
 * at rest or on hover — the content answers the pointer. `-mx-3 px-3` widens
 * the click target past the text.
 */
function TrackRow({ track }: { track: InterviewTrack }) {
  const p = PRESENTATION[track.slug];
  return (
    <Link
      href={track.url}
      // Don't viewport-prefetch every track (same opt-out as the courses grid).
      prefetch={false}
      className="group -mx-3 flex flex-col gap-5 rounded-2xl px-3 py-4"
    >
      {p ? <TrackThumb slug={p.banner} alt={p.bannerAlt} /> : null}

      {/* Type matched to a `/courses` catalog row so the two lists read as
          one design. */}
      <span className="flex min-w-0 flex-col leading-[1.7]">
        <span className="text-[18px] font-semibold leading-[1.7] tracking-[-0.02em] text-[var(--ds-gray-900)] transition-colors group-hover:text-[var(--ds-blue-700)] dark:text-white dark:group-hover:text-[var(--ds-blue-400)]">
          {track.title}
        </span>

        {/* `line-clamp-3` guards against a long entry making one row taller
            than the rest of its grid line. */}
        {p ? (
          <span className="mt-1.5 line-clamp-3 text-[16px] leading-[1.7] text-[#8a8a8a] transition-colors group-hover:text-[#6b6b6b] dark:text-[var(--ds-gray-400)] dark:group-hover:text-[var(--ds-gray-300)]">
            {p.description}
          </span>
        ) : null}

        {/* The glyph carries its own green so the count reads as a labelled
            quantity rather than one grey run. */}
        <span className="mt-2 flex items-center gap-1.5 text-[14px] leading-[1.7] text-[var(--ds-gray-400)] transition-colors group-hover:text-[var(--ds-gray-500)] dark:text-[var(--ds-gray-500)] dark:group-hover:text-[var(--ds-gray-400)]">
          <Layers
            size={14}
            aria-hidden="true"
            className="text-[var(--ds-green-500)] transition-colors group-hover:text-[var(--ds-green-600)] dark:group-hover:text-[var(--ds-green-400)]"
          />
          {track.topics.length} topics
        </span>

        <span className="mt-2.5 flex items-center gap-2.5 text-[16px] leading-[1.7]">
          <span className="font-semibold text-[var(--ds-blue-700)] dark:text-[var(--ds-blue-400)]">
            Start track
          </span>
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="-ml-1.5 text-[var(--ds-blue-700)] transition-transform duration-200 group-hover:translate-x-0.5 dark:text-[var(--ds-blue-400)]"
          >
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        </span>
      </span>
    </Link>
  );
}

export function InterviewCatalog({ tracks }: { tracks: InterviewTrack[] }) {
  const topicCount = tracks.reduce((n, t) => n + t.topics.length, 0);

  return (
    <>
      {/* Two columns at most — a third would leave descriptions too narrow. */}
      <div className="mt-10 grid grid-cols-1 items-start gap-x-10 gap-y-2 sm:mt-12 sm:grid-cols-2">
        {tracks.map((track) => (
          <TrackRow key={track.slug} track={track} />
        ))}
      </div>

      {/* ── Footer line: totals + a pointer to the courses catalog ── */}
      <div className="mt-11 flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-[15px] text-[var(--ds-gray-400)] dark:text-[var(--ds-gray-500)]">
          {tracks.length} tracks · {topicCount} topics · all free
        </span>
        <Link
          href="/courses"
          className="group inline-flex items-center gap-1.5 text-[15px] font-semibold text-[var(--ds-blue-700)] transition-colors hover:text-[var(--ds-blue-800)] dark:text-[var(--ds-blue-400)] dark:hover:text-[var(--ds-blue-300)]"
        >
          Need fundamentals first? Browse courses
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="transition-transform duration-200 group-hover:translate-x-0.5"
          >
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        </Link>
      </div>
    </>
  );
}
