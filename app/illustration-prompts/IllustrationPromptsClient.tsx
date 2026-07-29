"use client";

/**
 * Interactive shell for the `/illustration-prompts` gallery. The entry data is
 * built from `data/illustration-prompts.json` by the server component (see
 * `page.tsx` and `lib/illustrationPromptsGallery.ts`) and passed in as a prop.
 * The per-card copy buttons are the only local state.
 *
 * Theme is the shared site one (ThemePillToggle → siteTheme.ts → `.dark` on
 * <html>), not a page-local toggle: the root layout's bootstrap script applies
 * the class before paint, so the palette here matches every other surface and
 * survives a reload. The pill is docked so it stays reachable at any scroll
 * position — this page is a long scroll of artwork and the whole point is
 * flipping the background under it.
 */
import { useCallback, useMemo, useState } from "react";
import { Check, Copy, ImageIcon } from "lucide-react";
import { ThemePillToggle } from "@/app/_components/ThemePillToggle";
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

/** Suffix on the background-removed variant's slug (assets/images/<id>-cutout.png). */
const CUTOUT_SUFFIX = "-cutout";

/** One image from the build manifest, or null when that slug has no artwork. */
function ManifestImage({
  slug,
  alt,
  className,
}: {
  slug: string;
  alt: string;
  className: string;
}) {
  const entry = imageManifest[slug];
  if (!entry) return null;
  const fallback = entry.formats[entry.formats.length - 1];
  const sources = entry.formats.slice(0, -1);
  return (
    <picture>
      {sources.map((ext) => (
        <source key={ext} srcSet={`/images/${slug}.${ext}`} type={IMAGE_MIME[ext]} />
      ))}
      <img
        src={`/images/${slug}.${fallback}`}
        width={entry.width}
        height={entry.height}
        alt={alt}
        className={className}
        loading="lazy"
        decoding="async"
      />
    </picture>
  );
}

/**
 * The generated artwork for a card, rendered above its prompt so the prompt
 * reads as the caption for the image it produced — that pairing is the whole
 * point of the gallery once the art exists.
 *
 * When a background-removed variant exists it is stacked directly underneath
 * the original for comparison. The cut-out is deliberately given no backdrop of
 * its own, so the page background shows through its alpha and the theme toggle
 * doubles as the judgement tool: a cut-out that only works on one background is
 * exactly what needs catching here.
 */
function PromptImage({ entry }: { entry: IllustrationPromptEntry }) {
  const hasOriginal = Boolean(imageManifest[entry.id]);
  const cutoutSlug = `${entry.id}${CUTOUT_SUFFIX}`;
  const hasCutout = Boolean(imageManifest[cutoutSlug]);

  if (!hasOriginal) {
    return (
      <div className={styles.imagePending}>
        <ImageIcon size={15} aria-hidden="true" />
        <span>Not generated yet</span>
      </div>
    );
  }

  return (
    <div className={styles.imageStack}>
      <div className={styles.imagePane}>
        <ManifestImage slug={entry.id} alt={entry.title} className={styles.image} />
        <span className={styles.imageLabel}>Original</span>
      </div>
      {hasCutout ? (
        <div className={styles.imagePane}>
          <ManifestImage
            slug={cutoutSlug}
            alt={`${entry.title}, background removed`}
            className={styles.imageCutout}
          />
          <span className={styles.imageLabel}>
            Background removed · Recraft remove-background via Kie AI
          </span>
        </div>
      ) : null}
    </div>
  );
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
    <div className={styles.page}>
      {/* Docked rather than inline in the header: the page is a long scroll of
          artwork, and flipping the background under it is the point, so the
          pill has to stay reachable wherever the reader has got to. */}
      <div className={styles.themeDock}>
        <ThemePillToggle />
      </div>
      <div className={styles.inner}>
        <header className={styles.header}>
          <div className={styles.headerRow}>
            <h1 className={styles.title}>Illustration prompts</h1>
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
