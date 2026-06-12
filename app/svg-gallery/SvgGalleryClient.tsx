"use client";

/**
 * Interactive shell for the SVG graphics gallery. The graphic data is collected
 * at build time (see `lib/svgGallery.ts`) and handed in as a prop; everything
 * here — the light/dark theme toggle, course pagination, and per-graphic copy
 * buttons — is client-side.
 */
import { useCallback, useState, useSyncExternalStore } from "react";
import { Check, Copy, Moon, Sun } from "lucide-react";
import type { GalleryCourse } from "@/lib/svgGallery";
import styles from "./svg-gallery.module.css";

const COURSES_PER_PAGE = 4;
const THEME_KEY = "svg_gallery_theme";
type Theme = "light" | "dark";

// Theme is sourced from localStorage (falling back to the OS preference) via an
// external store, so reading it needs no effect and the server snapshot stays a
// stable "light" — avoiding both the set-state-in-effect lint and any hydration
// mismatch. A module-level listener set lets the toggle notify subscribers
// (the `storage` event doesn't fire in the same document).
const themeListeners = new Set<() => void>();

function readTheme(): Theme {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function useTheme(): [Theme, () => void] {
  const theme = useSyncExternalStore<Theme>(
    (cb) => {
      themeListeners.add(cb);
      return () => themeListeners.delete(cb);
    },
    readTheme,
    () => "light",
  );
  const toggle = useCallback(() => {
    localStorage.setItem(THEME_KEY, theme === "light" ? "dark" : "light");
    themeListeners.forEach((l) => l());
  }, [theme]);
  return [theme, toggle];
}

export function SvgGalleryClient({ courses }: { courses: GalleryCourse[] }) {
  const total = courses.reduce((n, c) => n + c.graphics.length, 0);
  const pageCount = Math.max(1, Math.ceil(courses.length / COURSES_PER_PAGE));

  const [theme, toggleTheme] = useTheme();
  const [page, setPage] = useState(0);
  const [copied, setCopied] = useState<string | null>(null);

  const goTo = useCallback((p: number) => {
    setPage(p);
    window.scrollTo({ top: 0 });
  }, []);

  const copyMeta = useCallback(async (id: string, route: string) => {
    const text = `SVG ID: ${id}   Route: ${route}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      window.setTimeout(() => setCopied((c) => (c === id ? null : c)), 1500);
    } catch {
      // Clipboard unavailable (e.g. insecure context) — ignore.
    }
  }, []);

  const start = page * COURSES_PER_PAGE;
  const visible = courses.slice(start, start + COURSES_PER_PAGE);

  const pager =
    pageCount > 1 ? (
      <nav className={styles.pager} aria-label="Gallery pages">
        <button
          type="button"
          className={styles.pagerBtn}
          onClick={() => goTo(page - 1)}
          disabled={page === 0}
        >
          ← Prev
        </button>
        <div className={styles.pagerNums}>
          {Array.from({ length: pageCount }, (_, i) => (
            <button
              type="button"
              key={i}
              className={`${styles.pagerNum} ${i === page ? styles.pagerNumActive : ""}`}
              onClick={() => goTo(i)}
              aria-current={i === page ? "page" : undefined}
            >
              {i + 1}
            </button>
          ))}
        </div>
        <button
          type="button"
          className={styles.pagerBtn}
          onClick={() => goTo(page + 1)}
          disabled={page === pageCount - 1}
        >
          Next →
        </button>
      </nav>
    ) : null;

  return (
    <div className={`${styles.page} ${theme === "dark" ? styles.dark : ""}`}>
      <div className={styles.inner}>
        <header className={styles.header}>
          <div className={styles.headerRow}>
            <h1 className={styles.title}>SVG graphics gallery</h1>
            <button
              type="button"
              className={styles.themeToggle}
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
              title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
            >
              {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
              <span>{theme === "light" ? "Dark" : "Light"}</span>
            </button>
          </div>
          <p className={styles.subtitle}>
            Every custom inline <code>&lt;svg&gt;</code> graphic across the{" "}
            <code>/learn</code> courses — <span className={styles.count}>{total}</span>{" "}
            graphic{total === 1 ? "" : "s"} in {courses.length} course
            {courses.length === 1 ? "" : "s"}. Mermaid diagrams are excluded.
          </p>
        </header>

        {pager}

        {total === 0 ? (
          <p className={styles.empty}>No custom SVG graphics found.</p>
        ) : (
          visible.map((course) => (
            <section key={course.slug} className={styles.course}>
              <h2 className={styles.courseHeading}>
                {course.title}
                <span className={styles.courseSlug}>{course.slug}</span>
                <span className={styles.courseCount}>
                  {course.graphics.length} graphic
                  {course.graphics.length === 1 ? "" : "s"}
                </span>
              </h2>
              <div className={styles.list}>
                {course.graphics.map((g) => (
                  <figure key={g.id} className={styles.card}>
                    <div
                      className={styles.figure}
                      // Authored SVG source, rewritten to valid markup by
                      // jsxSvgToHtml in lib/jsxSvgToHtml.ts. Content is repo-owned.
                      dangerouslySetInnerHTML={{ __html: g.html }}
                    />
                    <figcaption className={styles.meta}>
                      <div className={styles.metaText}>
                        <p className={styles.id}>{g.id}</p>
                        <p className={styles.route}>{g.route}</p>
                        <a className={styles.link} href={g.href}>
                          View on lesson page →
                        </a>
                      </div>
                      <button
                        type="button"
                        className={styles.copyBtn}
                        onClick={() => copyMeta(g.id, g.route)}
                        aria-label="Copy SVG ID and route"
                        title="Copy SVG ID and route"
                      >
                        {copied === g.id ? (
                          <Check size={15} />
                        ) : (
                          <Copy size={15} />
                        )}
                      </button>
                    </figcaption>
                  </figure>
                ))}
              </div>
            </section>
          ))
        )}

        {pager}
      </div>
    </div>
  );
}
