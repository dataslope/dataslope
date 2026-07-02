/**
 * Course-row artwork for the `/courses` catalog — the "mono" glyph variant
 * from the courses-page mockup (option 2a — Refined sidebar): a single-shade
 * line motif chosen by the course's domain tag, tinted by its language.
 *
 * Everything draws in `currentColor`; `LANG_INK_CLASS` supplies the per-
 * language ink (an AA-on-white brand step in light mode, the matching light
 * ramp step in dark mode — the exact pairs from the mockup's LANG_ART table,
 * mapped onto the brand.css ramps).
 */
import type { CourseTags } from "@/app/_components/home/CoursesSection";

// domain tag → motif kind. First matching domain wins; "stairs" is the
// fallback (also used by programming-fundamentals, the most common domain).
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

/** Per-language ink (light / dark), from the mockup's LANG_ART palette. */
export const LANG_INK_CLASS: Record<string, string> = {
  python: "text-[var(--ds-blue-700)] dark:text-[var(--ds-blue-300)]",
  typescript: "text-[var(--ds-blue-800)] dark:text-[var(--ds-blue-200)]",
  javascript: "text-[var(--ds-yellow-700)] dark:text-[var(--ds-yellow-400)]",
  sql: "text-[var(--ds-green-700)] dark:text-[var(--ds-green-300)]",
  java: "text-[var(--ds-red-700)] dark:text-[var(--ds-red-300)]",
  cpp: "text-[var(--ds-red-800)] dark:text-[var(--ds-red-200)]",
  c: "text-[var(--ds-teal-700)] dark:text-[var(--ds-teal-300)]",
  csharp: "text-[var(--ds-purple-700)] dark:text-[var(--ds-purple-300)]",
  r: "text-[var(--ds-orange-700)] dark:text-[var(--ds-orange-300)]",
};

// Stroke props shared by the outline shapes (the mockup's `S` constant).
const S = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.4,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

function motifShapes(kind: string): React.ReactNode {
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

/** The mockup's mono glyph: single-shade motif, no background tile. */
export function CourseGlyph({
  tags,
  size = 36,
}: {
  tags: CourseTags;
  size?: number;
}) {
  const lang = tags.language?.[0] ?? "python";
  const kind =
    (tags.domain ?? []).map((d) => MOTIFS[d]).find(Boolean) ?? "stairs";
  return (
    <span
      className={`inline-flex shrink-0 ${LANG_INK_CLASS[lang] ?? LANG_INK_CLASS.python}`}
      aria-hidden="true"
    >
      <svg viewBox="8 8 40 40" width={size} height={size} className="block">
        {motifShapes(kind)}
      </svg>
    </span>
  );
}
