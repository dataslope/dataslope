import imageManifest from "@/lib/generated/images";
import { BentoCard, BentoGrid } from "@/components/ui/bento-grid";
import {
  DiamondBackground,
  TestRailBackground,
  TypingBackground,
  CoursesListBackground,
} from "./statsBentoBackgrounds";

/**
 * Turns a generated illustration into the `Icon` component `<BentoCard>`
 * wants (it renders `<Icon className={…} />` with its own sizing classes).
 * A slug with no manifest entry renders nothing rather than a broken image.
 * Eager/non-lazy: all four sit near the top of the home page.
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

/** 160px square on every card. `scale-100` overrides the card's default
 *  `scale-75` icon classes. `object-contain` is load-bearing: the cut-outs
 *  are trimmed shorter than wide, and a fixed square box with no fit rule
 *  would subtly stretch them. At this size descriptions get roughly two
 *  lines inside the grid's fixed rows — copy below is written to that. */
const ICON_SIZE = "mb-3 h-40 w-40 scale-100 object-contain";

/** Interview-prep card only: at 160px the marmot ran into the typing
 *  animation once the grid went three-across; 140px clears it. */
const ICON_SIZE_LG_140 = `${ICON_SIZE} lg:h-[140px] lg:w-[140px]`;

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
      // Tightest copy budget of the four; the full role list overflowed.
      description: "Role-based prep for analyst, data, ML, and backend roles.",
      href: "/interview-prep",
      cta: "Start prepping",
      className: "col-span-3 lg:col-span-1",
      iconClassName: ICON_SIZE_LG_140,
      background: <TypingBackground />,
    },
    {
      // Link-less card (T8): no CTA.
      Icon: ChallengesIcon,
      name: `${stats.codeChallenges.toLocaleString()}+ code challenges`,
      description:
        "Coding and SQL challenges with instant, test-driven feedback.",
      className: "col-span-3 lg:col-span-1",
      iconClassName: ICON_SIZE,
      background: <TestRailBackground />,
    },
    {
      // Link-less card (T7): no CTA.
      Icon: CodeBlocksIcon,
      name: `${stats.runnableCodeBlocks.toLocaleString()}+ runnable code blocks`,
      description:
        "Run every example inline, Python, R, C, C++, Java, C#, JS/TS, and SQL across SQLite, Postgres & DuckDB. No setup.",
      className: "col-span-3 lg:col-span-2",
      iconClassName: ICON_SIZE,
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
