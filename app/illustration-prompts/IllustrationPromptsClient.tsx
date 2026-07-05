"use client";

/**
 * Interactive shell for the `/illustration-prompts` gallery. The entry data is
 * collected at build time by the server component (see `page.tsx` and
 * `lib/illustrationPromptsGallery.ts`) and passed in as a prop — the payload is
 * small (~80 short prompts), so unlike the SVG gallery there is no static JSON
 * asset or client fetch. Everything here — the light/dark toggle and the
 * per-card copy buttons — is client-side.
 */
import { useCallback, useState, useSyncExternalStore } from "react";
import { Check, Copy, Image as ImageIcon, Moon, Search, Sun } from "lucide-react";
import type {
  IllustrationPromptEntry,
  IllustrationPromptsData,
} from "@/lib/illustrationPromptsGallery";
import styles from "./illustration-prompts.module.css";

const THEME_KEY = "illustration_prompts_theme";
type Theme = "light" | "dark";

// Theme comes from localStorage (falling back to the OS preference) via an
// external store, mirroring /svg-gallery: reading it needs no effect and the
// server snapshot stays a stable "light", avoiding any hydration mismatch.
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

function PromptCard({
  entry,
  copiedKey,
  onCopy,
}: {
  entry: IllustrationPromptEntry;
  copiedKey: string | null;
  onCopy: (key: string, text: string) => void;
}) {
  const fileKey = `${entry.slug}:file`;
  const promptKey = `${entry.slug}:prompt`;
  return (
    <figure id={entry.slug} className={styles.card}>
      <div className={styles.cardTop}>
        <span className={styles.fileWrap}>
          <code className={styles.file}>{entry.file}</code>
          <button
            type="button"
            className={styles.iconBtn}
            onClick={() => onCopy(fileKey, entry.file)}
            aria-label={copiedKey === fileKey ? "File name copied" : "Copy file name"}
            title="Copy file name"
          >
            {copiedKey === fileKey ? <Check size={13} /> : <Copy size={13} />}
          </button>
        </span>
        <span
          className={`${styles.badge} ${entry.photo ? styles.badgePhoto : styles.badgeNoPhoto}`}
        >
          {entry.photo ? "photo attached" : "no reference"}
        </span>
      </div>

      <p className={styles.prompt}>{entry.prompt}</p>

      {entry.photo && entry.photoUrl && entry.imageSearchUrl ? (
        <div className={styles.refLinks}>
          <a
            className={styles.refLink}
            href={entry.photoUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ImageIcon size={13} aria-hidden="true" />
            Reference photo
          </a>
          <a
            className={styles.refLink}
            href={entry.imageSearchUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Search size={13} aria-hidden="true" />
            Google Images
          </a>
        </div>
      ) : null}

      <div className={styles.cardBottom}>
        <div className={styles.usages}>
          <span className={styles.usagesLabel}>
            Used on {entry.usages.length} page{entry.usages.length === 1 ? "" : "s"}
          </span>
          {entry.usages.map((u) => (
            <a key={u.href} className={styles.usage} href={u.href}>
              <span className={styles.usageCourse}>{u.courseTitle}</span> ·{" "}
              {u.route} →
            </a>
          ))}
        </div>
        <button
          type="button"
          className={styles.copyPrompt}
          onClick={() => onCopy(promptKey, entry.prompt)}
          aria-label={copiedKey === promptKey ? "Prompt copied" : "Copy prompt"}
        >
          {copiedKey === promptKey ? <Check size={14} /> : <Copy size={14} />}
          {copiedKey === promptKey ? "Copied" : "Copy prompt"}
        </button>
      </div>
    </figure>
  );
}

export function IllustrationPromptsClient({
  data,
}: {
  data: IllustrationPromptsData;
}) {
  const [theme, toggleTheme] = useTheme();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const onCopy = useCallback((key: string, text: string) => {
    void navigator.clipboard
      ?.writeText(text)
      .then(() => {
        setCopiedKey(key);
        window.setTimeout(
          () => setCopiedKey((c) => (c === key ? null : c)),
          1500,
        );
      })
      .catch(() => {
        // Clipboard unavailable (e.g. insecure context) — ignore.
      });
  }, []);

  const people = data.entries.filter((e) => e.photo);
  const objects = data.entries.filter((e) => !e.photo);

  const section = (
    title: string,
    entries: IllustrationPromptEntry[],
  ) =>
    entries.length === 0 ? null : (
      <section className={styles.section}>
        <h2 className={styles.sectionHeading}>
          {title}
          <span className={styles.sectionCount}>
            {entries.length} illustration{entries.length === 1 ? "" : "s"}
          </span>
        </h2>
        <div className={styles.list}>
          {entries.map((entry) => (
            <PromptCard
              key={entry.slug}
              entry={entry}
              copiedKey={copiedKey}
              onCopy={onCopy}
            />
          ))}
        </div>
      </section>
    );

  return (
    <div className={`${styles.page} ${theme === "dark" ? styles.dark : ""}`}>
      <div className={styles.inner}>
        <header className={styles.header}>
          <div className={styles.headerRow}>
            <h1 className={styles.title}>Illustration prompts</h1>
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
            Placeholder prompts for the custom line-art illustrations across the{" "}
            <code>/learn</code> and <code>/interview</code> pages —{" "}
            <span className={styles.count}>{data.totalIllustrations}</span>{" "}
            illustration{data.totalIllustrations === 1 ? "" : "s"} to draw,
            placed in <span className={styles.count}>{data.totalLessons}</span>{" "}
            lesson{data.totalLessons === 1 ? "" : "s"}. Each card carries its
            target file name and the exact generation prompt.
          </p>
        </header>

        {data.totalIllustrations === 0 ? (
          <p className={styles.empty}>No illustration prompts found.</p>
        ) : (
          <>
            {section("People (portraits)", people)}
            {section("Objects & scenes", objects)}
          </>
        )}
      </div>
    </div>
  );
}
