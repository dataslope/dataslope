/**
 * Course-row artwork for the course cards (the `/courses` catalog and the
 * home page's Courses section) — the "mono" glyph variant from the
 * courses-page mockup (option 2a — Refined sidebar): a single-shade line
 * motif, unique per course.
 *
 * Every course gets its OWN motif via `COURSE_MOTIFS` (slug → kind); no two
 * courses share one (__tests__/courseArt.test.ts enforces it). A course
 * missing from that map falls back to its domain tag's motif — add a bespoke
 * entry when a new course lands.
 *
 * Everything draws in `currentColor`; the glyph inherits the row's text
 * colour (heading tone by default) so the icon reads as part of the title
 * rather than a separate per-language accent.
 */
import type { CourseTags } from "@/app/_components/home/CoursesSection";

// Fallback only: domain tag → motif kind, for courses not yet listed in
// COURSE_MOTIFS. First matching domain wins; "stairs" is the final fallback.
const MOTIFS: Record<string, string> = {
  "programming-fundamentals": "stairs",
  "web-development": "stairs",
  "functional-programming": "compose",
  "data-processing": "bars",
  "software-architecture": "blueprint",
  "software-engineering": "blueprint",
  "software-design": "blueprint",
  "object-oriented-programming": "blueprint",
  "systems-programming": "memgrid",
  "data-structures": "tree",
  algorithms: "tree",
  "database-design": "cylinder",
  "data-modeling": "cylinder",
  databases: "cylinder",
  "data-analysis": "bars",
  "time-series": "wave",
  statistics: "bell",
  "data-science": "bell",
  "machine-learning": "nodes",
  "natural-language-processing": "nodes",
  "data-visualization": "scatter",
  "scientific-computing": "sinegrid",
  "numerical-methods": "sinegrid",
};

/** One motif per course, no repeats. The original domain motifs each keep
 *  their single best-fit course; the rest are bespoke shapes drawn in the
 *  same stroke language. */
export const COURSE_MOTIFS: Record<string, string> = {
  "python-basics": "snake",
  "data-analysis-python-pandas": "bars",
  "intro-sql-postgres": "cylinder",
  "beginners-javascript": "braces",
  "machine-learning-scikit-learn": "nodes",
  "sqlite-for-beginners": "table",
  "java-programming-for-beginners": "mug",
  "from-zero-to-cpp": "rocket",
  "typescript-from-scratch": "shield",
  "c-programming-for-beginners": "chip",
  "statistics-for-data-science-python": "bell",
  "sql-analytics-duckdb": "funnel",
  "practical-r-for-beginners": "boxplot",
  "intro-data-viz-plotly": "scatter",
  "mastering-dsa-cpp": "tree",
  "intro-modern-csharp": "sharp",
  "database-design-postgresql": "schema",
  "seaborn-foundations": "ridge",
  "scientific-computing-python": "sinegrid",
  "natural-language-processing-python": "chat",
  "time-series-analysis-python": "wave",
  "functional-programming-typescript": "compose",
  "oop-blueprint-java": "blueprint",
  "java-collections-and-generics-deep-dive": "crates",
  "mastering-ggplot2": "layers",
  "systems-programming-c": "memgrid",
  "csharp-linq-functional": "pipeline",
};

/** Resolves a course's motif: bespoke per-slug shape first, then the domain
 *  fallback, then "stairs". Exported for the uniqueness test. */
export function motifForCourse(slug: string, tags: CourseTags): string {
  return (
    COURSE_MOTIFS[slug] ??
    (tags.domain ?? []).map((d) => MOTIFS[d]).find(Boolean) ??
    "stairs"
  );
}

// Stroke props shared by the outline shapes (the mockup's `S` constant).
const S = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.4,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

export function motifShapes(kind: string): React.ReactNode {
  switch (kind) {
    case "stairs":
      return (
        <>
          <polyline points="13,42 22,42 22,33 31,33 31,24 40,24 40,15" {...S} />
          <circle cx={43} cy={13} r={3.4} fill="currentColor" />
        </>
      );
    case "bars":
      return (
        <>
          <rect x={13} y={30} width={7} height={13} rx={2} fill="currentColor" />
          <rect x={24} y={21} width={7} height={22} rx={2} fill="currentColor" />
          <rect x={35} y={13} width={7} height={30} rx={2} fill="currentColor" />
        </>
      );
    case "cylinder":
      return (
        <>
          <ellipse cx={28} cy={16} rx={14} ry={5} {...S} />
          <path d="M14 16v11c0 2.8 6.3 5 14 5s14-2.2 14-5V16" {...S} />
          <path d="M14 27v11c0 2.8 6.3 5 14 5s14-2.2 14-5V27" {...S} />
        </>
      );
    case "scatter":
      return (
        <>
          <polyline points="13,39 23,28 32,32 43,16" {...S} />
          <circle cx={13} cy={39} r={3} fill="currentColor" />
          <circle cx={23} cy={28} r={3} fill="currentColor" />
          <circle cx={32} cy={32} r={3} fill="currentColor" />
          <circle cx={43} cy={16} r={3} fill="currentColor" />
        </>
      );
    case "nodes":
      return (
        <>
          <path
            d="M18 20 38 16M18 20l10 18M38 16l-10 22M38 16l6 18M28 38h16"
            {...S}
            strokeWidth={2}
          />
          <circle cx={18} cy={20} r={4} fill="currentColor" />
          <circle cx={38} cy={16} r={4} fill="currentColor" />
          <circle cx={28} cy={38} r={4} fill="currentColor" />
          <circle cx={44} cy={34} r={4} fill="currentColor" />
        </>
      );
    case "bell":
      return (
        <>
          <path d="M11 42c8 0 9-26 17-26s9 26 17 26" {...S} />
          <line
            x1={11}
            y1={42}
            x2={45}
            y2={42}
            stroke="currentColor"
            strokeWidth={2.4}
            strokeLinecap="round"
          />
        </>
      );
    case "tree":
      return (
        <>
          <path
            d="M28 15 17 29m11-14 11 14M17 29l-5 12m5-12 5 12M39 29l-5 12m5-12 5 12"
            {...S}
            strokeWidth={2}
          />
          <circle cx={28} cy={14} r={4} fill="currentColor" />
          <circle cx={17} cy={29} r={3.4} fill="currentColor" />
          <circle cx={39} cy={29} r={3.4} fill="currentColor" />
        </>
      );
    case "compose":
      return (
        <>
          <circle cx={22} cy={28} r={10} {...S} />
          <circle cx={34} cy={28} r={10} {...S} />
        </>
      );
    case "memgrid":
      return (
        <>
          <rect x={13} y={13} width={9} height={9} rx={2} fill="currentColor" />
          <rect x={24} y={13} width={9} height={9} rx={2} {...S} strokeWidth={2} />
          <rect x={35} y={13} width={9} height={9} rx={2} {...S} strokeWidth={2} />
          <rect x={13} y={24} width={9} height={9} rx={2} {...S} strokeWidth={2} />
          <rect x={24} y={24} width={9} height={9} rx={2} fill="currentColor" />
          <rect x={35} y={24} width={9} height={9} rx={2} {...S} strokeWidth={2} />
          <rect x={13} y={35} width={9} height={9} rx={2} {...S} strokeWidth={2} />
          <rect x={24} y={35} width={9} height={9} rx={2} {...S} strokeWidth={2} />
          <rect x={35} y={35} width={9} height={9} rx={2} fill="currentColor" />
        </>
      );
    case "wave":
      return (
        <>
          <path d="M10 30c3-9 6-9 9 0s6 9 9 0 6-9 9 0 6 9 9 0" {...S} />
          <line
            x1={10}
            y1={43}
            x2={46}
            y2={43}
            stroke="currentColor"
            strokeWidth={2.4}
            strokeLinecap="round"
          />
        </>
      );
    case "sinegrid":
      return (
        <>
          <path d="M13 12v31h31" {...S} />
          <path d="M13 33c4-14 8-14 12 0s8 14 12 0 5-11 7-13" {...S} />
        </>
      );
    // ── Bespoke per-course motifs (COURSE_MOTIFS) ───────────────────────
    // Curly braces — JavaScript.
    case "braces":
      return (
        <>
          <path
            d="M23 13c-4 0-5 2-5 5v6c0 3-1.5 4-4 4 2.5 0 4 1 4 4v6c0 3 1 5 5 5"
            {...S}
          />
          <path
            d="M33 13c4 0 5 2 5 5v6c0 3 1.5 4 4 4-2.5 0-4 1-4 4v6c0 3-1 5-5 5"
            {...S}
          />
        </>
      );
    // A table: header row + one body row split into columns — SQLite.
    case "table":
      return (
        <>
          <rect x={13} y={15} width={30} height={26} rx={2} {...S} />
          <path d="M13 24h30M13 33h30M28 24v17" {...S} strokeWidth={2} />
        </>
      );
    // Coffee mug with steam — Java.
    case "mug":
      return (
        <>
          <path
            d="M17 25h17v10a7 7 0 0 1-7 7h-3a7 7 0 0 1-7-7z"
            {...S}
          />
          <path d="M34 28h3a4.5 4.5 0 0 1 0 9h-3" {...S} strokeWidth={2} />
          <path
            d="M22 13c-1.5 2.5 1.5 3.5 0 6M28 13c-1.5 2.5 1.5 3.5 0 6"
            {...S}
            strokeWidth={2}
          />
        </>
      );
    // A coiled snake, head up and tongue out — Python.
    case "snake":
      return (
        <>
          <path
            d="M12 42c6 3 12 0 12-5 0-5-10-5-10-11 0-6 5-9 11-9 6 0 11 4 11 10"
            {...S}
          />
          <circle cx={36} cy={27} r={3.4} fill="currentColor" />
          <path d="M39.4 27h3l2.2-2m-2.2 2l2.2 2" {...S} strokeWidth={2} />
        </>
      );
    // Lift-off — C++ "from zero to…".
    case "rocket":
      return (
        <>
          <path
            d="M28 11c6 5 8 12 8 18l-4 5h-8l-4-5c0-6 2-13 8-18z"
            {...S}
          />
          <circle cx={28} cy={22} r={3} {...S} strokeWidth={2} />
          <path d="M20 29l-5 7 6-1M36 29l5 7-6-1" {...S} strokeWidth={2} />
          <path d="M28 36v8" {...S} strokeWidth={2} />
        </>
      );
    // Shield with a check — TypeScript's compile-time safety.
    case "shield":
      return (
        <>
          <path
            d="M28 12l13 5v10c0 9-5.5 13-13 16-7.5-3-13-7-13-16V17z"
            {...S}
          />
          <path d="M22 27l4.5 4.5L35 23" {...S} />
        </>
      );
    // CPU with pins — C, close to the metal.
    case "chip":
      return (
        <>
          <rect x={19} y={19} width={18} height={18} rx={2} {...S} strokeWidth={2} />
          <rect x={25.5} y={25.5} width={5} height={5} rx={1} fill="currentColor" />
          <path
            d="M23 13v6M28 13v6M33 13v6M23 37v6M28 37v6M33 37v6M13 23h6M13 28h6M13 33h6M37 23h6M37 28h6M37 33h6"
            {...S}
            strokeWidth={2}
          />
        </>
      );
    // Analytics funnel — DuckDB SQL analytics.
    case "funnel":
      return (
        <path d="M13 14h30L32 27v12l-8 5V27z" {...S} />
      );
    // Box-and-whisker plot — R's statistical roots.
    case "boxplot":
      return (
        <>
          <path d="M22 12h12M28 12v7M28 32v9M22 41h12" {...S} strokeWidth={2} />
          <rect x={19} y={19} width={18} height={13} rx={1.5} {...S} />
          <path d="M19 25.5h18" {...S} strokeWidth={2} />
        </>
      );
    // Musical sharp sign — C#.
    case "sharp":
      return (
        <path
          d="M24 13l-2 30M36 13l-2 30M14 25l30-4M12 35l30-4"
          {...S}
        />
      );
    // Two entities joined by an elbow — database schema design.
    case "schema":
      return (
        <>
          <rect x={11} y={14} width={14} height={10} rx={2} {...S} />
          <rect x={31} y={32} width={14} height={10} rx={2} {...S} />
          <path d="M25 19h10v13" {...S} strokeWidth={2} />
        </>
      );
    // Ridgeline of small distributions — seaborn.
    case "ridge":
      return (
        <path
          d="M11 20h2c3 0 4-7 7-7s4 7 7 7h18M11 30h12c3 0 4-7 7-7s4 7 7 7h8M11 40h20c3 0 4-7 7-7s4 7 7 7"
          {...S}
          strokeWidth={2}
        />
      );
    // Speech bubble with text lines — natural language processing.
    case "chat":
      return (
        <>
          <path
            d="M16 14h24a4 4 0 0 1 4 4v11a4 4 0 0 1-4 4H28l-8 8v-8h-4a4 4 0 0 1-4-4V18a4 4 0 0 1 4-4z"
            {...S}
            strokeWidth={2}
          />
          <path d="M20 21h16M20 26h9" {...S} strokeWidth={2} />
        </>
      );
    // Three crates, one stacked — collections.
    case "crates":
      return (
        <>
          <rect x={22} y={13} width={12} height={12} rx={2} {...S} strokeWidth={2} />
          <rect x={14.5} y={29} width={12} height={12} rx={2} {...S} strokeWidth={2} />
          <rect x={29.5} y={29} width={12} height={12} rx={2} {...S} strokeWidth={2} />
        </>
      );
    // Stacked layers — ggplot2's grammar-of-graphics.
    case "layers":
      return (
        <>
          <path d="M28 11l14 7-14 7-14-7z" {...S} strokeWidth={2} />
          <path d="M14 27l14 7 14-7M14 34l14 7 14-7" {...S} strokeWidth={2} />
        </>
      );
    // Values flowing through a chain of stages — LINQ pipelines.
    case "pipeline":
      return (
        <>
          <circle cx={14} cy={28} r={3.5} fill="currentColor" />
          <circle cx={28} cy={28} r={4.5} {...S} strokeWidth={2} />
          <circle cx={42} cy={28} r={3.5} fill="currentColor" />
          <path d="M17.5 28h6M32.5 28h6" {...S} strokeWidth={2} />
        </>
      );
    // Not in the mockup's shape set (an oversight there — its only user,
    // oop-blueprint-java, rendered blank): a floor-plan sketch in the same
    // stroke language as the other motifs.
    case "blueprint":
      return (
        <>
          <rect x={13} y={15} width={31} height={26} rx={2} {...S} />
          <path d="M13 28h17M30 28v13M30 15v7" {...S} strokeWidth={2} />
          <circle cx={37} cy={22} r={3} fill="currentColor" />
        </>
      );
    default:
      return null;
  }
}

/** The mockup's mono glyph: single-shade motif, no background tile. Inherits
 *  the row's text colour via `className` (defaults to the heading tone) so the
 *  icon matches the surrounding text. */
export function CourseGlyph({
  slug,
  tags,
  size = 36,
  className = "text-[var(--ds-gray-900)] dark:text-white",
}: {
  slug: string;
  tags: CourseTags;
  size?: number;
  className?: string;
}) {
  return (
    <span className={`inline-flex shrink-0 ${className}`} aria-hidden="true">
      <svg viewBox="8 8 40 40" width={size} height={size} className="block">
        {motifShapes(motifForCourse(slug, tags))}
      </svg>
    </span>
  );
}
