/**
 * The `/interview-prep` catalog body: a "formats" band explaining how the
 * questions run, a grid of six role-track cards (each a risograph banner, a
 * role glyph, its tagline, the topics it covers, and a "Start track" link),
 * and a footer line with the totals and a pointer to /courses.
 *
 * Implements the "4a, Centered header, riso cards" mockup from the
 * interview-prep redesign. The centered page header lives in the server page
 * (`app/interview-prep/page.tsx`), mirroring how `/courses` splits its header
 * from `CoursesCatalog`.
 *
 * The track list (title, topics, links) is content-driven, passed in from
 * `getInterviewTracks` (see `lib/interviewCatalog.ts`). The per-role
 * presentation, tagline, glyph, and banner illustration, is the design layer
 * and lives here in `PRESENTATION`, keyed by role slug. A role with no entry
 * still renders (glyph + banner fall back), so adding a track in content never
 * breaks the page.
 *
 * No client interactivity, the hover affordances are pure CSS, so this stays a
 * server component (the banners read the build-time image manifest directly).
 */
import type { ReactNode } from "react";
import { dotfade } from "tabbied/patterns";
import Link from "@/app/_components/Link";
import { PatternBackdrop } from "@/app/_components/PatternBackdrop";
import imageManifest from "@/lib/generated/images";
import type { InterviewTrack } from "@/lib/interviewCatalog";
import styles from "./InterviewCatalog.module.css";

// Theme-follower shorthand for the topic/footer dividers, same tokens the
// /courses catalog uses. (Surfaces, the riso shadow, and the badge live in the
// CSS module, see the note there.)
const HAIRLINE = "border-[var(--ds-gray-100)] dark:border-white/[0.07]";

/** 24×24 lucide-style glyph, stroked in currentColor. Paths are the exact
 *  icon geometry from the mockup so each role reads at a glance. */
function Glyph({ size = 21, children }: { size?: number; children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const ROLE_GLYPHS: Record<string, ReactNode> = {
  // ChartColumnIncreasing
  "data-analyst": (
    <>
      <path d="M3 3v16a2 2 0 0 0 2 2h16" />
      <path d="M13 17V9" />
      <path d="M18 17V5" />
      <path d="M8 17v-3" />
    </>
  ),
  // FlaskConical
  "data-scientist": (
    <>
      <path d="M14 2v6a2 2 0 0 0 .245.96l5.51 10.08A2 2 0 0 1 18 22H6a2 2 0 0 1-1.755-2.96l5.51-10.08A2 2 0 0 0 10 8V2" />
      <path d="M6.453 15h11.094" />
      <path d="M8.5 2h7" />
    </>
  ),
  // Waypoints
  "data-engineer": (
    <>
      <circle cx="12" cy="4.5" r="2.5" />
      <path d="m10.2 6.3-3.9 3.9" />
      <circle cx="4.5" cy="12" r="2.5" />
      <path d="M7 12h10" />
      <circle cx="19.5" cy="12" r="2.5" />
      <path d="m13.8 17.7 3.9-3.9" />
      <circle cx="12" cy="19.5" r="2.5" />
    </>
  ),
  // Workflow
  "analytics-engineer": (
    <>
      <rect width="8" height="8" x="3" y="3" rx="2" />
      <path d="M7 11v4a2 2 0 0 0 2 2h4" />
      <rect width="8" height="8" x="13" y="13" rx="2" />
    </>
  ),
  // Network
  "machine-learning-engineer": (
    <>
      <rect x="16" y="16" width="6" height="6" rx="1" />
      <rect x="2" y="16" width="6" height="6" rx="1" />
      <rect x="9" y="2" width="6" height="6" rx="1" />
      <path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3" />
      <path d="M12 12V8" />
    </>
  ),
  // ListTree
  "backend-engineer": (
    <>
      <rect x="14" y="14" width="4" height="6" rx="2" />
      <rect x="6" y="4" width="4" height="6" rx="2" />
      <path d="M6 20h4" />
      <path d="M14 10h4" />
      <path d="M6 14h2v6" />
      <path d="M14 4h2v6" />
    </>
  ),
};

// Fallback glyph for any future role without a mapped icon (GraduationCap).
const FALLBACK_GLYPH: ReactNode = (
  <>
    <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z" />
    <path d="M22 10v6" />
    <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5" />
  </>
);

interface Presentation {
  /** One-line pitch shown under the role name. */
  tagline: string;
  /** Image slug for the 3:2 card banner. */
  banner: string;
  /** Alt text describing the banner illustration. */
  bannerAlt: string;
}

const PRESENTATION: Record<string, Presentation> = {
  "data-analyst": {
    tagline: "SQL fluency, aggregation, and turning data into answers.",
    banner: "interview-data-analyst-thumbnail-cutout",
    bannerAlt: "The Dataslope marmot holding a magnifying lens over an isometric dashboard of small charts",
  },
  "data-scientist": {
    tagline: "Statistics, modeling, and experiment design.",
    banner: "interview-data-scientist-thumbnail-cutout",
    bannerAlt: "The Dataslope marmot holding a flask beside an isometric scatter plane with a fitted curve",
  },
  "data-engineer": {
    tagline: "SQL at depth, pipelines, modeling, and systems.",
    banner: "interview-data-engineer-thumbnail-cutout",
    bannerAlt: "The Dataslope marmot guiding coloured cubes along an isometric pipeline into a storage silo",
  },
  "analytics-engineer": {
    tagline: "The dbt and warehouse layer between engineering and analytics.",
    banner: "interview-analytics-engineer-thumbnail-cutout",
    bannerAlt: "The Dataslope marmot feeding raw tiles into an isometric pipeline that returns tidy modelled tables",
  },
  "machine-learning-engineer": {
    tagline: "ML fundamentals plus production engineering.",
    banner: "interview-machine-learning-engineer-thumbnail-cutout",
    bannerAlt: "The Dataslope marmot placing an isometric trained-model block into a deployment container",
  },
  "backend-engineer": {
    tagline: "Data structures, algorithms, and language fundamentals.",
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

/** The 3:2 card banner, served WebP-first with a raster fallback from the
 *  build-time image manifest (same source `<Figure>` reads), but styled to
 *  fill the card top edge to edge rather than as an in-content figure.
 *
 *  3:2 (1.5:1) is the illustrations' native ratio — every image the pipeline
 *  produces is 1536x1024 — so the banner shows the whole artwork and
 *  `object-cover` never crops the subject out of frame. */
function TrackBanner({ slug, alt }: { slug: string; alt: string }) {
  const entry = imageManifest[slug];
  if (!entry) return null;
  const fallback = entry.formats[entry.formats.length - 1];
  const sources = entry.formats.slice(0, -1);
  return (
    <picture>
      {sources.map((ext) => (
        <source key={ext} srcSet={`/images/${slug}.${ext}`} type={MIME[ext]} />
      ))}
      <img
        src={`/images/${slug}.${fallback}`}
        alt={alt}
        width={entry.width}
        height={entry.height}
        loading="lazy"
        decoding="async"
        className="block aspect-[3/2] w-full object-cover"
      />
    </picture>
  );
}

/** A single topic row inside a card: a small brand-blue arrow and the topic
 *  title. Display-only, the whole card is one link to the role track. */
function TopicRow({ title, last }: { title: string; last: boolean }) {
  return (
    <div
      className={`flex items-center gap-[9px] py-[9px] text-[13.5px] text-[var(--ds-gray-700)] dark:text-[var(--ds-gray-300)] ${
        last ? "" : `border-b ${HAIRLINE}`
      }`}
    >
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="shrink-0 text-[var(--ds-blue-500)]"
      >
        <path d="M5 12h14" />
        <path d="m12 5 7 7-7 7" />
      </svg>
      {title}
    </div>
  );
}

function TrackCard({ track }: { track: InterviewTrack }) {
  const p = PRESENTATION[track.slug];
  const glyph = ROLE_GLYPHS[track.slug] ?? FALLBACK_GLYPH;
  return (
    <div className={styles.cardWrap}>
      <Link
        href={track.url}
        // Six-card index, don't viewport-prefetch every track (same opt-out
        // the courses grid uses).
        prefetch={false}
        className={`group ${styles.card}`}
      >
        {p ? <TrackBanner slug={p.banner} alt={p.bannerAlt} /> : null}

        <div className="flex flex-1 flex-col px-[26px] pb-[22px]">
          {/* Role glyph, lifted to straddle the banner's bottom edge. */}
          <div className="-mt-[21px] flex">
            <span className={styles.badge}>
              <Glyph>{glyph}</Glyph>
            </span>
          </div>

          <span className="mt-6 text-[21px] font-semibold tracking-[-0.015em] text-[var(--ds-gray-900)] dark:text-white">
            {track.title}
          </span>

          {p ? (
            <span className="mt-1.5 min-h-[44px] text-[14.5px] leading-[1.5] text-[#999999] dark:text-[var(--ds-gray-400)]">
              {p.tagline}
            </span>
          ) : null}

          <div className={`mt-4 border-t ${HAIRLINE}`}>
            {track.topics.map((topic, i) => (
              <TopicRow
                key={topic.slug}
                title={topic.title}
                last={i === track.topics.length - 1}
              />
            ))}
          </div>

          <div
            className={`mt-auto flex items-center justify-between border-t pt-3.5 ${HAIRLINE}`}
          >
            <span className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-[var(--ds-blue-700)] dark:text-[var(--ds-blue-400)]">
              Start track
              <svg
                width="14"
                height="14"
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
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
}

export function InterviewCatalog({ tracks }: { tracks: InterviewTrack[] }) {
  const topicCount = tracks.reduce((n, t) => n + t.topics.length, 0);

  return (
    <>
      {/* ── Track cards, on a dotfade backdrop ──
          The pattern is inset vertically so it emerges a little below the
          first row of cards and stops a little above the last row's
          bottom, which reads as a surface the grid sits on rather than a
          band laid across it, and runs the full width of the viewport so it
          does not stop dead at the 1120px content column. */}
      <PatternBackdrop
        pattern={dotfade}
        insetTop={56}
        insetBottom={56}
        fullWidth
        cellSize={44}
        className="mt-12 sm:mt-14"
      >
        <div className="grid grid-cols-1 items-stretch gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {tracks.map((track) => (
            <TrackCard key={track.slug} track={track} />
          ))}
        </div>
      </PatternBackdrop>

      {/* ── Footer line: totals + a pointer to the courses catalog ── */}
      <div className="mt-11 flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-[13px] text-[var(--ds-gray-400)] dark:text-[var(--ds-gray-500)]">
          {tracks.length} tracks · {topicCount} topics · all free
        </span>
        <Link
          href="/courses"
          className="group inline-flex items-center gap-1.5 text-[14px] font-semibold text-[var(--ds-blue-700)] transition-colors hover:text-[var(--ds-blue-800)] dark:text-[var(--ds-blue-400)] dark:hover:text-[var(--ds-blue-300)]"
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
