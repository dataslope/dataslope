"use client";

import { Database } from "lucide-react";
import type { IconType } from "react-icons";
import { Marquee } from "@/components/ui/marquee";
import {
  LANGUAGE_ICONS,
  LANGUAGE_ICON_COLORS,
  LANGUAGE_ICON_SIZE_FACTOR,
} from "../languageIcons";

interface HeroItem {
  /** languageIcons id, or "sql" for the generic database glyph. */
  id: string;
  name: string;
}

// The scrolling "Learn … " roster. SQL uses a generic database icon (not a
// single dialect logo); the rest use their language marks.
const HERO_ITEMS: HeroItem[] = [
  { id: "python", name: "Python" },
  { id: "sql", name: "SQL" },
  { id: "cpp", name: "C++" },
  { id: "r", name: "R" },
  { id: "java", name: "Java" },
  { id: "postgres", name: "PostgreSQL" },
  { id: "duckdb", name: "DuckDB" },
  { id: "php", name: "PHP" },
];

function HeroGlyph({ id }: { id: string }) {
  if (id === "sql") {
    return (
      <Database
        className="size-[0.85em] shrink-0 text-[var(--ds-blue-500)]"
        aria-hidden="true"
      />
    );
  }
  const Icon: IconType | undefined = LANGUAGE_ICONS[id];
  if (!Icon) return null;
  const factor = LANGUAGE_ICON_SIZE_FACTOR[id] ?? 1;
  return (
    <span
      className="inline-flex shrink-0 items-center"
      style={{ color: LANGUAGE_ICON_COLORS[id], fontSize: `${factor}em` }}
      aria-hidden="true"
    >
      <Icon size="0.85em" />
    </span>
  );
}

/** One full "Learn 🐍 Python 🗄 SQL …" segment. The Marquee duplicates it,
 *  so "Learn" recurs as a natural refrain between roster loops. */
function RosterSegment() {
  return (
    <span className="mx-6 inline-flex items-center gap-6">
      <span className="text-[var(--ds-gray-900)] dark:text-white">Learn</span>
      {HERO_ITEMS.map((item) => (
        <span key={item.name} className="inline-flex items-center gap-3">
          <HeroGlyph id={item.id} />
          <span className="text-[var(--ds-gray-900)] dark:text-white">
            {item.name}
          </span>
        </span>
      ))}
    </span>
  );
}

export function HeroMarquee() {
  return (
    <div className="relative w-full select-none overflow-hidden py-2">
      {/* Line 1 — the language roster, scrolling left. */}
      <Marquee className="py-1 text-5xl font-bold tracking-tight [--duration:34s] [--gap:0px] sm:text-6xl lg:text-7xl">
        <RosterSegment />
      </Marquee>

      {/* Line 2 — the tagline, scrolling the other way, in blue-gray-100. */}
      <Marquee
        reverse
        className="py-1 text-4xl font-bold tracking-tight [--duration:30s] [--gap:0px] sm:text-5xl lg:text-6xl"
      >
        <span className="mx-8 text-[#CED7DB]">
          Interactive, No sign-up, Free
        </span>
      </Marquee>

      {/* Soft edge fades so the scroll dissolves into the page background
          (kept in sync with HomeClient's bg: white / #0f1117). */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-white to-transparent dark:from-[#0f1117]" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-white to-transparent dark:from-[#0f1117]" />
    </div>
  );
}
