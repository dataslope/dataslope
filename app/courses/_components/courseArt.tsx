/**
 * Course-card artwork: a single lucide line icon, unique per course via
 * `COURSE_MOTIFS` (uniqueness enforced by __tests__/courseArt.test.ts). A
 * course missing from the map falls back to its domain tag's motif — add a
 * bespoke entry when a new course lands.
 */
import {
  AppWindow,
  Atom,
  Binary,
  Blocks,
  Braces,
  BrainCircuit,
  ChartArea,
  ChartCandlestick,
  ChartColumn,
  ChartScatter,
  Coffee,
  Columns3,
  Combine,
  Cpu,
  Database,
  Filter,
  FunctionSquare,
  Hash,
  Layers,
  LayoutGrid,
  MemoryStick,
  MessagesSquare,
  Network,
  Package,
  Rocket,
  ShieldCheck,
  Sigma,
  Table2,
  Terminal,
  TrendingUp,
  Waves,
  Waypoints,
  Workflow,
  type LucideIcon,
} from "lucide-react";
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

/** One motif per course, no repeats. */
export const COURSE_MOTIFS: Record<string, string> = {
  "python-basics": "snake",
  "data-analysis-python-pandas": "bars",
  "data-wrangling-python-polars": "columns",
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
  "intro-web-development": "browser",
  "modern-css-layout": "grid",
  "react-from-the-ground-up": "atom",
  "how-llms-work": "neurons",
};

/** Each motif kind maps to a distinct lucide icon, so every course still gets
 *  its own glyph (uniqueness enforced by __tests__/courseArt.test.ts). */
const KIND_ICONS: Record<string, LucideIcon> = {
  snake: Terminal,
  bars: ChartColumn,
  columns: Columns3,
  cylinder: Database,
  braces: Braces,
  nodes: Network,
  table: Table2,
  mug: Coffee,
  rocket: Rocket,
  shield: ShieldCheck,
  chip: Cpu,
  bell: Sigma,
  funnel: Filter,
  boxplot: ChartCandlestick,
  scatter: ChartScatter,
  tree: Binary,
  sharp: Hash,
  schema: Workflow,
  ridge: ChartArea,
  sinegrid: FunctionSquare,
  chat: MessagesSquare,
  wave: Waves,
  compose: Combine,
  blueprint: Blocks,
  crates: Package,
  layers: Layers,
  memgrid: MemoryStick,
  pipeline: Waypoints,
  browser: AppWindow,
  grid: LayoutGrid,
  atom: Atom,
  neurons: BrainCircuit,
  stairs: TrendingUp,
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

/** The lucide icon for a motif kind (null for an unknown kind). Exported for
 *  the "every assigned motif draws something" test. */
export function motifIcon(kind: string): LucideIcon | null {
  return KIND_ICONS[kind] ?? null;
}

/** The course-card glyph: a single lucide line icon that inherits the row's
 *  text color (defaults to the heading tone) so it matches the title. */
export function CourseGlyph({
  slug,
  tags,
  size = 32,
  className = "text-[var(--ds-gray-900)] dark:text-white",
}: {
  slug: string;
  tags: CourseTags;
  size?: number;
  className?: string;
}) {
  // Direct map lookup (not the motifIcon() call) so the icon reads as a
  // stable component reference, mirroring LANGUAGE_ICONS[id] elsewhere.
  const Icon = KIND_ICONS[motifForCourse(slug, tags)] ?? TrendingUp;
  return (
    <span className={`inline-flex shrink-0 ${className}`} aria-hidden="true">
      <Icon size={size} strokeWidth={1.75} className="block" />
    </span>
  );
}
