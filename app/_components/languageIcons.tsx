/**
 * Shared programming-language icon registry used across the app, the
 * playground header switcher (`Playground.tsx`), the playground index
 * card list (`/playground/page.tsx`), and the embedded MDX code blocks
 * (`CodeBlock.tsx`). Centralising the lookup means a logo or brand
 * colour change only has to be made in one place and all three surfaces
 * stay visually consistent.
 *
 * Looked up by language adapter `id` (e.g. `"python"`, `"javascript"`).
 */

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

/** Brand colours used to tint the playground language icons across the
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
