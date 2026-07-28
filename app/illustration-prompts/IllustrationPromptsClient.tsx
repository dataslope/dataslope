"use client";

/**
 * Interactive shell for the `/illustration-prompts` gallery. The entry data is
 * built from `data/illustration-prompts.json` by the server component (see
 * `page.tsx` and `lib/illustrationPromptsGallery.ts`) and passed in as a prop.
 * Everything here, the light/dark toggle and the per-card copy buttons, is
 * client-side.
 */
import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import { Check, Copy, ImageIcon, Moon, Sun } from "lucide-react";
import imageManifest from "@/lib/generated/images";
import type {
  IllustrationPromptEntry,
  IllustrationPromptsData,
} from "@/lib/illustrationPromptsGallery";
import styles from "./illustration-prompts.module.css";

// Output extension → MIME type, mirroring app/_components/mdx/Figure.tsx.
const IMAGE_MIME: Record<string, string> = {
  webp: "image/webp",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  avif: "image/avif",
};

/**
 * The generated artwork for a card, rendered above its prompt so the prompt
 * reads as the caption for the image it produced — that pairing is the whole
 * point of the gallery once the art exists. Falls back to a "not generated yet"
 * slot so a prompt can be reviewed before its image has been rendered.
 */
function PromptImage({ entry }: { entry: IllustrationPromptEntry }) {
  const manifestEntry = imageManifest[entry.id];
  if (!manifestEntry) {
    return (
      <div className={styles.imagePending}>
        <ImageIcon size={15} aria-hidden="true" />
        <span>Not generated yet</span>
      </div>
    );
  }
  const fallback = manifestEntry.formats[manifestEntry.formats.length - 1];
  const sources = manifestEntry.formats.slice(0, -1);
  return (
    <picture>
      {sources.map((ext) => (
        <source key={ext} srcSet={`/images/${entry.id}.${ext}`} type={IMAGE_MIME[ext]} />
      ))}
      <img
        src={`/images/${entry.id}.${fallback}`}
        width={manifestEntry.width}
        height={manifestEntry.height}
        alt={entry.title}
        className={styles.image}
        loading="lazy"
        decoding="async"
      />
    </picture>
  );
}

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
  const fileKey = `${entry.id}:file`;
  const promptKey = `${entry.id}:prompt`;
  // Trim the generic tail ("… illustration"/"… schematic") for a tidy badge.
  const styleLabel = entry.style.replace(/ (illustration|schematic)$/i, "");
  return (
    <figure id={entry.id} className={styles.card}>
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
        <span className={styles.badges}>
          <span className={`${styles.badge} ${styles.badgeAccent}`}>{styleLabel}</span>
          {entry.mascot ? (
            <span className={`${styles.badge} ${styles.badgeMuted}`}>marmot</span>
          ) : null}
          <span className={`${styles.badge} ${styles.badgeMuted}`}>{entry.size}</span>
        </span>
      </div>

      <PromptImage entry={entry} />

      <p className={styles.cardTitle}>{entry.title}</p>
      <p className={styles.prompt}>{entry.prompt}</p>

      <div className={styles.cardBottom}>
        <div className={styles.usages}>
          <span className={styles.usagesLabel}>Used on</span>
          <a className={styles.usage} href={entry.href}>
            <span className={styles.usageCourse}>{entry.courseTitle}</span> ·{" "}
            {entry.route} →
          </a>
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
        // Clipboard unavailable (e.g. insecure context), ignore.
      });
  }, []);

  // Group entries by category label, preserving the pre-sorted order.
  const groups = useMemo(() => {
    const byLabel = new Map<string, IllustrationPromptEntry[]>();
    for (const entry of data.entries) {
      const list = byLabel.get(entry.categoryLabel);
      if (list) list.push(entry);
      else byLabel.set(entry.categoryLabel, [entry]);
    }
    return [...byLabel.entries()];
  }, [data.entries]);

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
            GPT Image 2 prompts for the custom illustrations across the Dataslope
            courses and interview prep, a mix of styles (risograph, flat vector,
            line art, isometric, blueprint) rendered in the four brand colors.{" "}
            <span className={styles.count}>{data.totalIllustrations}</span>{" "}
            illustration{data.totalIllustrations === 1 ? "" : "s"} to draw across{" "}
            <span className={styles.count}>{data.totalCourses}</span> course
            {data.totalCourses === 1 ? "" : "s"}. Each card carries its target
            file name and the exact generation prompt. Batch-generate them with{" "}
            <code>scripts/generate-illustrations.mjs</code>.
          </p>
        </header>

        {data.totalIllustrations === 0 ? (
          <p className={styles.empty}>No illustration prompts found.</p>
        ) : (
          groups.map(([label, entries]) => (
            <section key={label} className={styles.section}>
              <h2 className={styles.sectionHeading}>
                {label}
                <span className={styles.sectionCount}>
                  {entries.length} illustration{entries.length === 1 ? "" : "s"}
                </span>
              </h2>
              <div className={styles.list}>
                {entries.map((entry) => (
                  <PromptCard
                    key={entry.id}
                    entry={entry}
                    copiedKey={copiedKey}
                    onCopy={onCopy}
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
}
