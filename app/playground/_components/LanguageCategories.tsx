/**
 * The playground landing page's language chooser: three categories, each a
 * label + blurb beside a grid of language tiles. Server component, static
 * data. Tiles tint their glyph on hover with the language's brand color
 * (`LANGUAGE_ICON_COLORS`) via the `--tile-c` custom property.
 */
import type { CSSProperties } from "react";
import Link from "@/app/_components/Link";
import {
  LANGUAGE_ICONS,
  LANGUAGE_ICON_COLORS,
  LANGUAGE_ICON_SIZE_FACTOR,
} from "@/app/_components/languageIcons";

interface LanguageItem {
  /** Playground id / route segment, e.g. "python". */
  id: string;
  label: string;
  /** Version / dialect caption shown under the name, e.g. "3.12". */
  version: string;
}

interface Category {
  name: string;
  description: string;
  items: LanguageItem[];
}

// Category → language mapping, mirroring the handoff mock. Ids match the
// `/playground/<id>` routes and the shared `LANGUAGE_ICONS` registry.
const CATEGORIES: Category[] = [
  {
    name: "Code Editors",
    description:
      "General-purpose languages for writing, running, and debugging real programs without leaving the tab.",
    items: [
      { id: "python", label: "Python", version: "3.14" },
      { id: "r", label: "R", version: "4.6" },
      { id: "javascript", label: "JavaScript", version: "ES2023+" },
      { id: "typescript", label: "TypeScript", version: "5.9" },
      { id: "php", label: "PHP", version: "8.4" },
      { id: "c", label: "C", version: "C17" },
      { id: "cpp", label: "C++", version: "C++20" },
      { id: "java", label: "Java", version: "8" },
      { id: "csharp", label: "C#", version: "13 · .NET 10" },
    ],
  },
  {
    name: "Web Sandboxes",
    description:
      "A live HTML, CSS, and JavaScript preview, plus React with instant in-browser JSX transpilation.",
    items: [
      { id: "web", label: "HTML", version: "HTML5 · CSS3" },
      { id: "react", label: "React", version: "19.2" },
    ],
  },
  {
    name: "Version Control",
    description:
      "A real shell and a real repository in the tab: run commands and watch the working tree, index, and commit graph move.",
    items: [{ id: "git", label: "Git", version: "2.43" }],
  },
  {
    name: "SQL Workbench",
    description:
      "Load data, run queries, and inspect results against embedded or remote engines, all in the browser.",
    items: [
      // Same order as `PLAYGROUNDS`: PostgreSQL · SQLite · DuckDB.
      { id: "postgres", label: "PostgreSQL", version: "17" },
      { id: "sqlite", label: "SQLite", version: "3.53" },
      { id: "duckdb", label: "DuckDB", version: "1.32" },
    ],
  },
];

function LanguageTile({ item }: { item: LanguageItem }) {
  const Icon = LANGUAGE_ICONS[item.id];
  const factor = LANGUAGE_ICON_SIZE_FACTOR[item.id] ?? 1;
  const color = LANGUAGE_ICON_COLORS[item.id] ?? "currentColor";
  return (
    // Don't viewport-prefetch every language route (see app/_components/Link.tsx).
    <Link
      href={`/playground/${item.id}`}
      prefetch={false}
      style={{ "--tile-c": color } as CSSProperties}
      className="group flex flex-col items-center gap-3 rounded-xl px-2 pt-5 pb-4 text-center transition-colors hover:bg-[var(--ds-gray-100)] dark:hover:bg-white/[0.06]"
    >
      <span
        className="flex size-12 items-center justify-center text-[#121212] transition-colors group-hover:text-[var(--tile-c)] dark:text-white"
        aria-hidden="true"
      >
        {Icon ? <Icon size={Math.round(32 * factor)} /> : null}
      </span>
      <span className="flex flex-col items-center gap-0.5">
        <span className="text-sm leading-tight text-[#121212] dark:text-white">
          {item.label}
        </span>
        <span className="text-sm leading-tight tabular-nums text-[var(--ds-gray-400)]">
          {item.version}
        </span>
      </span>
    </Link>
  );
}

export function LanguageCategories() {
  return (
    <div className="mt-16 sm:mt-20">
      {CATEGORIES.map((cat) => (
        <div
          key={cat.name}
          className="grid gap-x-14 gap-y-6 py-8 sm:py-10 md:grid-cols-[minmax(0,264px)_1fr]"
        >
          {/* `md:pt-5` mirrors the tile's own top padding so the heading
              aligns with the first glyph rather than the tile's empty
              padding; only from `md`, where the two sit side by side. */}
          <div className="md:pt-5">
            <h2 className="text-[18px] font-medium text-[#121212] dark:text-white">
              {cat.name}
            </h2>
            <p className="mt-2.5 text-sm leading-relaxed text-[var(--ds-gray-500)] [text-wrap:pretty] dark:text-[var(--ds-gray-400)]">
              {cat.description}
            </p>
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] content-start gap-2 sm:grid-cols-[repeat(auto-fill,minmax(120px,1fr))]">
            {cat.items.map((item) => (
              <LanguageTile key={item.id} item={item} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
