import Link from "next/link";
import {
  LANGUAGE_ICONS,
  LANGUAGE_ICON_COLORS,
  LANGUAGE_ICON_SIZE_FACTOR,
} from "../_components/languageIcons";
import styles from "./home.module.css";

export const metadata = {
  title: "Playground",
  description: "Browser-based language playgrounds.",
};

// One row per playground card. Icons + brand colours are looked up
// from the shared `languageIcons` module so the playground header,
// the playground switcher, and this index page all stay in sync.
interface CardEntry {
  id: string;
  href: string;
  title: string;
  desc: string;
  disabled?: boolean;
}

const CARDS: CardEntry[] = [
  {
    id: "python",
    href: "/playground/python",
    title: "Python",
    desc: "Run Python in the browser via Pyodide.",
  },
  {
    id: "r",
    href: "/playground/r",
    title: "R",
    desc: "Run R in the browser via WebR.",
  },
  {
    id: "javascript",
    href: "/playground/javascript",
    title: "JavaScript",
    desc: "Run JavaScript natively in the browser.",
  },
  {
    id: "typescript",
    href: "/playground/typescript",
    title: "TypeScript",
    desc: "Transpile TypeScript in the browser, then run it natively.",
  },
  {
    id: "php",
    href: "/playground/php",
    title: "PHP",
    desc: "Run PHP in the browser via php-wasm.",
  },
  {
    id: "c",
    href: "/playground/c",
    title: "C",
    desc: "Compile and run C in the browser via clang (WebAssembly).",
  },
  {
    id: "cpp",
    href: "/playground/cpp",
    title: "C++",
    desc: "Compile and run C++ in the browser via clang (WebAssembly).",
  },
  {
    id: "java",
    href: "/playground/java",
    title: "Java",
    desc: "Compile and run Java in the browser via CheerpJ (OpenJDK).",
  },
  {
    id: "csharp",
    href: "/playground/csharp",
    title: "C#",
    desc: "Compile and run C# in the browser via Roslyn on .NET WebAssembly.",
  },
  {
    id: "sqlite",
    href: "/playground/sqlite",
    title: "SQLite",
    desc: "Run SQLite queries against in-browser sample databases via sqlite-wasm.",
  },
  {
    id: "postgres",
    href: "/playground/postgres",
    title: "PostgreSQL",
    desc: "Preview the mocked Postgres playground shell.",
  },
  {
    id: "duckdb",
    href: "/playground/duckdb",
    title: "DuckDB",
    desc: "Run DuckDB queries in the browser via DuckDB-Wasm. Query Parquet, CSV, and JSON files directly.",
  },
];

// Render the brand icon for a given language adapter id. Falls back to
// the literal id when no glyph is registered, so a future adapter shows
// up reasonably without a code change here.
function LanguageLogo({ id }: { id: string }) {
  const Icon = LANGUAGE_ICONS[id];
  const color = LANGUAGE_ICON_COLORS[id];
  const factor = LANGUAGE_ICON_SIZE_FACTOR[id] ?? 1;
  if (!Icon) return null;
  return (
    <Icon
      className={styles.logoSvg}
      style={{
        color,
        width: `${Math.round(32 * factor)}px`,
        height: `${Math.round(32 * factor)}px`,
      }}
      aria-hidden="true"
    />
  );
}

export default function Home() {
  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <h1 className={styles.title}>Playground</h1>
        <p className={styles.subtitle}>Browser-based language playgrounds.</p>
        <ul className={styles.list}>
          {CARDS.map((card) => (
            <li key={card.id}>
              <Link href={card.href} className={styles.card}>
                <span className={styles.logo}>
                  <LanguageLogo id={card.id} />
                </span>
                <span className={styles.cardText}>
                  <strong>{card.title}</strong>
                  <span className={styles.cardDesc}>{card.desc}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
