/**
 * Shared programming-language icon registry used across the app, the
 * playground header switcher (`Playground.tsx`), the playground index
 * card list (`/playground/page.tsx`), and the embedded MDX code blocks
 * (`CodeBlock.tsx`). Centralising the lookup means a logo or brand
 * color change only has to be made in one place and all three surfaces
 * stay visually consistent.
 *
 * Looked up by language adapter `id` (e.g. `"python"`, `"javascript"`).
 *
 * `LangIcon` at the bottom is the rendered form of all this: the registry
 * lookup, the per-glyph size factor, and a fixed square box, in the one
 * component every mono-icon surface uses (the /courses catalog cards and
 * filter sidebar, the footer's Courses and Playgrounds columns).
 */

import type { ReactNode } from "react";
import type { IconType } from "react-icons";
import {
  SiPython,
  SiR,
  SiJavascript,
  SiTypescript,
  SiCplusplus,
  SiOpenjdk,
  SiSharp,
  SiSqlite,
  SiPostgresql,
  SiDuckdb,
  SiHtml5,
  SiCss,
  SiReact,
} from "react-icons/si";
import { RiPhpFill } from "react-icons/ri";

/** Custom inline icon for the C playground. Mirrors the Streamline
 *  "C language logo (solid)" mark, kept as a tiny inline component so
 *  the C playground can opt into a more recognisable language glyph
 *  than the generic devicon. */
function CLanguageLogoSolidIcon({ size }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M11.199.914a1.5 1.5 0 0 1 1.602 0l8.5 5.369A1.5 1.5 0 0 1 22 7.55v8.898a1.5 1.5 0 0 1-.699 1.268l-8.5 5.368a1.5 1.5 0 0 1-1.602 0l-8.5-5.368A1.5 1.5 0 0 1 2 16.449V7.55a1.5 1.5 0 0 1 .699-1.268zm1.722 14.096a3.14 3.14 0 0 0 1.583-1.08l2.746 1.57a6.283 6.283 0 1 1 0-7l-2.746 1.57a3.142 3.142 0 1 0-1.583 4.94"
        clipRule="evenodd"
      />
    </svg>
  );
}

/** Per-playground brand icons. Looked up by adapter `id`; consumers
 *  should fall back to the adapter's two-character glyph when no icon
 *  is registered. */
export const LANGUAGE_ICONS: Record<string, IconType> = {
  python: SiPython,
  r: SiR,
  javascript: SiJavascript,
  typescript: SiTypescript,
  // RiPhpFill renders with much less internal whitespace than DiPhp /
  // SiPhp, so it reads at the same optical size as the other glyphs
  // without a per-language size factor.
  php: RiPhpFill,
  c: CLanguageLogoSolidIcon as unknown as IconType,
  cpp: SiCplusplus,
  java: SiOpenjdk,
  csharp: SiSharp,
  sqlite: SiSqlite,
  postgres: SiPostgresql,
  duckdb: SiDuckdb,
  html: SiHtml5,
  css: SiCss,
  web: SiHtml5,
  react: SiReact,
};

/** Per-language relative size multiplier. Some glyphs read "heavier"
 *  than the others at the default size, so we fine-tune them per
 *  playground. Defaults to 1 when unspecified. */
export const LANGUAGE_ICON_SIZE_FACTOR: Record<string, number> = {
  python: 0.9,
  typescript: 0.9,
  csharp: 0.9,
};

/** Brand colors used to tint the playground language icons across the
 *  switcher dropdown, the /playground card list, and embedded code
 *  blocks. Shared so all three surfaces stay in sync. */
export const LANGUAGE_ICON_COLORS: Record<string, string> = {
  python: "#3776ab",
  r: "#276dc3",
  javascript: "#f7df1e",
  typescript: "#3178c6",
  php: "#777bb4",
  c: "#a8b9cc",
  cpp: "#00599c",
  java: "#ed8b00",
  csharp: "#9b4f96",
  sqlite: "#003b57",
  postgres: "#4169E1",
  duckdb: "#FFBE11",
  web: "#e34f26",
  react: "#61dafb",
};

/** Neutral database glyph for "sql", the registry above only has per-engine
 *  marks (SQLite/PostgreSQL/DuckDB); path from the mockup.
 *
 *  Deliberately not an entry in `LANGUAGE_ICONS`: that map is keyed by
 *  playground adapter id, no adapter is called "sql", and adding one would
 *  put this glyph on any code block tagged `sql` — a surface that has never
 *  asked for it. `LangIcon` handles the content tag instead. */
function SqlIcon({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
      <path d="M12 2C7.58 2 4 3.79 4 6s3.58 4 8 4 8-1.79 8-4-3.58-4-8-4zM4 8.5V12c0 2.21 3.58 4 8 4s8-1.79 8-4V8.5c-1.72 1.5-4.7 2.5-8 2.5s-6.28-1-8-2.5zM4 14.5V18c0 2.21 3.58 4 8 4s8-1.79 8-4v-3.5c-1.72 1.5-4.7 2.5-8 2.5s-6.28-1-8-2.5z" />
    </svg>
  );
}

/** Mono (currentColor) language icon at the mockup's optical sizes.
 *
 *  Takes a language *or* playground id: the two vocabularies overlap on
 *  everything except `sql` (a content tag with no playground) and the
 *  engine/framework ids (`sqlite`, `web`, `react`, …), which no course is
 *  tagged with. Unknown ids render nothing, so a new tag is a missing glyph
 *  rather than a crash — callers that need a visible fallback supply their
 *  own (see `CourseThumb`'s `CourseGlyph`).
 *
 *  `currentColor` throughout rather than the brand tint `LANGUAGE_ICON_COLORS`
 *  carries: every surface using this puts the glyph beside text it should
 *  travel with, including that text's hover colour. */
export function LangIcon({ id, size = 16 }: { id: string; size?: number }) {
  let glyph: ReactNode;
  if (id === "sql") {
    // Drawn to fill its box, so it takes no size factor.
    glyph = <SqlIcon size={size} />;
  } else {
    const Icon: IconType | undefined = LANGUAGE_ICONS[id];
    if (!Icon) return null;
    const factor = LANGUAGE_ICON_SIZE_FACTOR[id] ?? 1;
    glyph = <Icon size={Math.round(size * factor)} />;
  }
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {glyph}
    </span>
  );
}
