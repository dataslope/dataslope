import {
  SquareTerminal,
  Trophy,
  Briefcase,
  GraduationCap,
} from "lucide-react";

import { BentoCard, BentoGrid } from "@/components/ui/bento-grid";

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

/** Big faded watermark number sitting behind each bento card's copy — it puts
 *  the headline figure front and centre, which is the whole point of the grid. */
function StatBackground({ label, color }: { label: string; color: string }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute -top-6 right-2 select-none text-[7rem] font-bold leading-none tracking-tighter opacity-[0.08] transition-all duration-300 group-hover:opacity-[0.14] sm:text-[8rem]"
      style={{
        color,
        maskImage: "linear-gradient(to bottom, #000 30%, transparent 95%)",
        WebkitMaskImage: "linear-gradient(to bottom, #000 30%, transparent 95%)",
      }}
    >
      {label}
    </div>
  );
}

export function StatsBento({ stats }: { stats: HomeStats }) {
  const blue = "var(--ds-blue-500)";
  const green = "var(--ds-green-500)";
  const red = "var(--ds-red-500)";

  const features = [
    {
      Icon: SquareTerminal,
      name: `${stats.runnableCodeBlocks.toLocaleString()}+ runnable code blocks`,
      description:
        "Run every example inline — Python, R, C, C++, Java, C#, JS/TS, and SQL across SQLite, Postgres & DuckDB. No setup.",
      href: "/playground",
      cta: "Open a playground",
      className: "col-span-3 lg:col-span-2",
      background: (
        <StatBackground
          label={`${stats.runnableCodeBlocks.toLocaleString()}+`}
          color={blue}
        />
      ),
    },
    {
      Icon: Trophy,
      name: `${stats.codeChallenges.toLocaleString()}+ code challenges`,
      description:
        "Auto-graded coding and SQL challenges with instant, test-driven feedback.",
      href: "/learn",
      cta: "Take a challenge",
      className: "col-span-3 lg:col-span-1",
      background: (
        <StatBackground
          label={`${stats.codeChallenges.toLocaleString()}+`}
          color={green}
        />
      ),
    },
    {
      Icon: Briefcase,
      name: "Free interview prep",
      description: `Role-based prep across ${stats.interviewRoles} tracks — data analyst, data scientist, data & analytics engineer, ML, and backend.`,
      href: "/interview",
      cta: "Start prepping",
      className: "col-span-3 lg:col-span-1",
      background: (
        <StatBackground label={`${stats.interviewRoles}`} color={red} />
      ),
    },
    {
      Icon: GraduationCap,
      name: `${stats.courses} free courses`,
      description:
        "Hands-on, browser-based courses with interactive code blocks — all free, no sign-up, no paywall.",
      href: "/learn",
      cta: "Browse courses",
      className: "col-span-3 lg:col-span-2",
      background: (
        <StatBackground label={`${stats.courses}`} color={blue} />
      ),
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
