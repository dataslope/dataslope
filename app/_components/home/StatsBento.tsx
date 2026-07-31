import imageManifest from "@/lib/generated/images";
import { BentoCard, BentoGrid } from "@/components/ui/bento-grid";
import {
  DiamondBackground,
  TestRailBackground,
  TypingBackground,
  CoursesListBackground,
} from "./statsBentoBackgrounds";

/**
 * Turn a generated illustration into the `Icon` component `<BentoCard>` wants.
 *
 * The card renders `<Icon className={…} />` with its own sizing classes, so an
 * illustration has to arrive as a component with that same shape rather than as
 * an `<img>` inline. Each icon is the `-cutout` slug (transparent background),
 * so the marmot sits directly on the card in both themes instead of inside a
 * white tile — the same reason the course rows use cut-outs.
 *
 * Returns `null` when the slug has no manifest entry, which renders nothing
 * rather than a broken image; the card's heading and copy still stand on their
 * own. The images are eager and non-lazy: all four sit in the bento grid near
 * the top of the home page.
 */
function illustrationIcon(slug: string) {
  const entry = imageManifest[slug];
  if (!entry) return () => null;
  const src = `/images/${slug}.${entry.formats[entry.formats.length - 1]}`;
  return function IllustrationIcon({ className }: { className?: string }) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        width={entry.width}
        height={entry.height}
        alt=""
        aria-hidden="true"
        decoding="async"
        className={className}
      />
    );
  };
}

const CoursesIcon = illustrationIcon("home-icon-courses-cutout");
const InterviewPrepIcon = illustrationIcon("home-icon-interview-prep-cutout");
const ChallengesIcon = illustrationIcon("home-icon-challenges-cutout");
const CodeBlocksIcon = illustrationIcon("home-icon-code-blocks-cutout");

/** Icon sizing, one notch up from the line glyphs these replaced (48px and
 *  36px effective, after the card's `scale-75`). An illustration carries more
 *  detail than a 1.75px-stroke glyph and needs the extra room to read; the two
 *  link-less cards stay the smaller of the two, as they were. */
const ICON_SIZE = "mb-3 h-16 w-16";
const ICON_SIZE_SMALL = "mb-3 h-12 w-12";

export interface HomeStats {
  /** Runnable `<CodeBlock>` + `<SqlCodeBlock>` blocks across all content. */
  runnableCodeBlocks: number;
  /** `<ChallengeCard>` + `<SqlChallengeCard>` auto-graded challenges. */
  codeChallenges: number;
  /** Interview-prep role tracks (data analyst, data scientist, …). */
  interviewRoles: number;
  /** Free, browser-based courses with interactive code blocks. */
  courses: number;
}

export function StatsBento({
  stats,
  courseTitles,
}: {
  stats: HomeStats;
  courseTitles: string[];
}) {
  const features = [
    {
      Icon: CoursesIcon,
      name: `${stats.courses} free courses`,
      description:
        "Hands-on, browser-based courses with interactive code blocks, all free, no sign-up, no paywall.",
      href: "/courses",
      cta: "Browse courses",
      className: "col-span-3 lg:col-span-2",
      iconClassName: ICON_SIZE,
      background: <CoursesListBackground titles={courseTitles} />,
    },
    {
      Icon: InterviewPrepIcon,
      name: "Free interview prep",
      description:
        "Role-based preparation, data analyst, data scientist, data & analytics engineer, ML, and backend.",
      href: "/interview-prep",
      cta: "Start prepping",
      className: "col-span-3 lg:col-span-1",
      iconClassName: ICON_SIZE,
      background: <TypingBackground />,
    },
    {
      // Link-less card (T8): no CTA, smaller icon.
      Icon: ChallengesIcon,
      name: `${stats.codeChallenges.toLocaleString()}+ code challenges`,
      description:
        "Coding and SQL challenges with instant, test-driven feedback.",
      className: "col-span-3 lg:col-span-1",
      iconClassName: ICON_SIZE_SMALL,
      background: <TestRailBackground />,
    },
    {
      // Link-less card (T7): no CTA, smaller icon.
      Icon: CodeBlocksIcon,
      name: `${stats.runnableCodeBlocks.toLocaleString()}+ runnable code blocks`,
      description:
        "Run every example inline, Python, R, C, C++, Java, C#, JS/TS, and SQL across SQLite, Postgres & DuckDB. No setup.",
      className: "col-span-3 lg:col-span-2",
      iconClassName: ICON_SIZE_SMALL,
      background: <DiamondBackground />,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
      <BentoGrid className="lg:grid-cols-3">
        {features.map((feature) => (
          <BentoCard key={feature.name} {...feature} />
        ))}
      </BentoGrid>
    </div>
  );
}
