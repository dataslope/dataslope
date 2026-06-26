import {
  SquareTerminal,
  Trophy,
  Briefcase,
  GraduationCap,
} from "lucide-react";

import { BentoCard, BentoGrid } from "@/components/ui/bento-grid";
import {
  DiamondBackground,
  TestRailBackground,
  TypingBackground,
  CoursesListBackground,
} from "./statsBentoBackgrounds";

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
      Icon: SquareTerminal,
      name: `${stats.runnableCodeBlocks.toLocaleString()}+ runnable code blocks`,
      description:
        "Run every example inline — Python, R, C, C++, Java, C#, JS/TS, and SQL across SQLite, Postgres & DuckDB. No setup.",
      href: "/playground",
      cta: "Open a playground",
      className: "col-span-3 lg:col-span-2",
      background: <DiamondBackground />,
    },
    {
      Icon: Trophy,
      name: `${stats.codeChallenges.toLocaleString()}+ code challenges`,
      description:
        "Auto-graded coding and SQL challenges with instant, test-driven feedback.",
      href: "/learn",
      cta: "Take a challenge",
      className: "col-span-3 lg:col-span-1",
      background: <TestRailBackground />,
    },
    {
      Icon: Briefcase,
      name: "Free interview prep",
      description: `Role-based prep across ${stats.interviewRoles} tracks — data analyst, data scientist, data & analytics engineer, ML, and backend.`,
      href: "/interview",
      cta: "Start prepping",
      className: "col-span-3 lg:col-span-1",
      background: <TypingBackground />,
    },
    {
      Icon: GraduationCap,
      name: `${stats.courses} free courses`,
      description:
        "Hands-on, browser-based courses with interactive code blocks — all free, no sign-up, no paywall.",
      href: "/learn",
      cta: "Browse courses",
      className: "col-span-3 lg:col-span-2",
      background: <CoursesListBackground titles={courseTitles} />,
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
