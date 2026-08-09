/**
 * The `/interview-prep` catalog body: two columns of role-track rows (each a
 * small banner thumbnail, a short description of what the track drills, its
 * topic count, and a "Start track" link), and a footer line with the totals
 * and a pointer to /courses.
 *
 * The centered page header lives in the server page
 * (`app/interview-prep/page.tsx`), mirroring how `/courses` splits its header
 * from `CoursesCatalog`.
 *
 * ── No cards ───────────────────────────────────────────────────────────────
 *
 * This used to be the "4a, riso cards" mockup: each track sat in a bordered
 * surface with a hatched second-print shadow behind it, a full-bleed 3:2
 * banner across its top, and a role glyph in a ring straddling the banner's
 * edge. Six of those on one screen meant the artwork and the frames were doing
 * all the talking and the six *sentences* that actually tell a visitor which
 * track is theirs were the quietest thing on the page.
 *
 * Now each track is a borderless row: a small thumbnail beside its text, at a
 * size that identifies the track without competing with it. The glyphs went
 * with the cards — they were a device for straddling the banner edge, and
 * beside a thumbnail of the same role they were a second icon for one idea.
 *
 * The track list (title, topics, links) is content-driven, passed in from
 * `getInterviewTracks` (see `lib/interviewCatalog.ts`). The per-role
 * presentation, description, glyph, and banner illustration, is the design
 * layer and lives here in `PRESENTATION`, keyed by role slug. A role with no entry
 * still renders (glyph + banner fall back), so adding a track in content never
 * breaks the page.
 *
 * No client interactivity, the hover affordances are pure CSS, so this stays a
 * server component (the banners read the build-time image manifest directly).
 */
import Link from "@/app/_components/Link";
import imageManifest from "@/lib/generated/images";
import type { InterviewTrack } from "@/lib/interviewCatalog";

interface Presentation {
  /** Short paragraph shown under the role name, the card's whole body now
   *  that the topic list is gone (see `TrackCard`). Written to name what the
   *  track actually drills, so a reader gets the same signal the list used to
   *  carry in a few lines instead of nine. Clamped to three lines, so the
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
    bannerAlt: "The Dataslope marmot guiding coloured cubes along an isometric pipeline into a storage silo",
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

/** The track's illustration, at thumbnail size. Served WebP-first with a
 *  raster fallback from the build-time image manifest (the same source
 *  `<Figure>` reads).
 *
 *  The 3:2 box is kept — six thumbnails the same shape is what makes this read
 *  as a list rather than a scrapbook — but the art no longer fills it exactly.
 *  Every render starts 1536x1024, and then `scripts/trim-cutouts.mjs` crops
 *  away every transparent margin, so a banner arrives at whatever shape its own
 *  artwork is and `object-cover` would answer that by cropping, quietly cutting
 *  the marmot out of its own frame. `object-contain` keeps the whole artwork
 *  and letterboxes instead — invisibly, the art being transparent — and it
 *  paints *larger* than an untrimmed version would, since the blank the frame
 *  used to carry inside the box is gone. That is the whole point of cropping a
 *  thumbnail on both axes: the box is fixed, so every margin removed from the
 *  file is width the subject gets back. The row's height is set by its three
 *  lines of copy either way, so nothing moves.
 *
 *  `sizes` tells the browser it is only ever painted a few hundred CSS pixels
 *  wide, so it can pick the cheap decode. */
function TrackThumb({ slug, alt }: { slug: string; alt: string }) {
  const entry = imageManifest[slug];
  if (!entry) return null;
  const fallback = entry.formats[entry.formats.length - 1];
  const sources = entry.formats.slice(0, -1);
  return (
    <picture>
      {sources.map((ext) => (
        <source key={ext} srcSet={`/images/${slug}.${ext}`} type={MIME[ext]} sizes="160px" />
      ))}
      <img
        src={`/images/${slug}.${fallback}`}
        alt={alt}
        width={entry.width}
        height={entry.height}
        loading="lazy"
        decoding="async"
        sizes="160px"
        className="block aspect-[3/2] w-full rounded-xl object-contain"
      />
    </picture>
  );
}

/**
 * One track: thumbnail, name, what it drills, and the two facts a visitor
 * chooses on (how much is in there, and where the link goes).
 *
 * `-mx-3 px-3` with a hover tint gives the row a target that lights up under
 * the pointer without painting a resting surface, so at rest the page is the
 * six thumbnails and the six sentences and nothing else.
 */
function TrackRow({ track }: { track: InterviewTrack }) {
  const p = PRESENTATION[track.slug];
  return (
    <Link
      href={track.url}
      // Six-row index, don't viewport-prefetch every track (same opt-out the
      // courses grid uses).
      prefetch={false}
      className="group -mx-3 grid grid-cols-[104px_1fr] items-start gap-4 rounded-2xl px-3 py-4 transition-colors hover:bg-[var(--ds-gray-50)] sm:grid-cols-[132px_1fr] sm:gap-5 dark:hover:bg-white/[0.035]"
    >
      {p ? <TrackThumb slug={p.banner} alt={p.bannerAlt} /> : <span />}

      <span className="flex min-w-0 flex-col">
        <span className="text-[17px] font-semibold tracking-[-0.01em] text-[var(--ds-gray-900)] transition-colors group-hover:text-[var(--ds-blue-700)] dark:text-white dark:group-hover:text-[var(--ds-blue-400)]">
          {track.title}
        </span>

        {/* `line-clamp-3` is the guard against a future entry running long and
            pushing one row taller than the rest of its grid line. */}
        {p ? (
          <span className="mt-1.5 line-clamp-3 text-[14px] leading-[1.55] text-[#8a8a8a] dark:text-[var(--ds-gray-400)]">
            {p.description}
          </span>
        ) : null}

        <span className="mt-2.5 flex items-center gap-2.5 text-[13px]">
          <span className="font-semibold text-[var(--ds-blue-700)] dark:text-[var(--ds-blue-400)]">
            Start track
          </span>
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
            className="-ml-1.5 text-[var(--ds-blue-700)] transition-transform duration-200 group-hover:translate-x-0.5 dark:text-[var(--ds-blue-400)]"
          >
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
          <span aria-hidden="true" className="text-[var(--ds-gray-300)] dark:text-[var(--ds-gray-600)]">
            ·
          </span>
          <span className="text-[var(--ds-gray-400)] dark:text-[var(--ds-gray-500)]">
            {track.topics.length} topics
          </span>
        </span>
      </span>
    </Link>
  );
}

export function InterviewCatalog({ tracks }: { tracks: InterviewTrack[] }) {
  const topicCount = tracks.reduce((n, t) => n + t.topics.length, 0);

  return (
    <>
      {/* ── Track rows ──
          Two columns at most, even on the widest viewports: a third column
          would leave each description too narrow to say anything. Six tracks
          divide evenly into three lines. `items-start` rather than stretch,
          because rows carry no surface to align the bottoms of. */}
      <div className="mt-10 grid grid-cols-1 items-start gap-x-10 gap-y-2 sm:mt-12 sm:grid-cols-2">
        {tracks.map((track) => (
          <TrackRow key={track.slug} track={track} />
        ))}
      </div>

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
