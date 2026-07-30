/**
 * Renders an optimized raster image (Recraft topic art, a photo, a diagram, a
 * screenshot, anything under `assets/images/`) inside a lesson or landing page:
 *
 * ```mdx
 * <Figure slug="panda" alt="A giant panda, mascot for the pandas library" priority />
 * ```
 *
 * Whichever way the bytes got there, `scripts/build-images.mjs` records slug →
 * intrinsic size + formats in the generated manifest this component imports,
 * which is what lets the `<img>` reserve layout space (no CLS). Two kinds of
 * entry exist, and `formats` is what distinguishes them:
 *
 *   - Pipeline illustrations, promoted straight into `public/images/<slug>.webp`
 *     as the exact bytes to serve. `formats: ["webp"]`, so `<picture>` collapses
 *     to a plain `<img>` — no fallback is generated, and none is needed.
 *   - Legacy raster sources under `assets/images/<slug>.<ext>` (photos,
 *     screenshots, older course art), which the build step crushes into a
 *     `.webp` plus a raster fallback (`.png` when transparent, else `.jpg`).
 *     Those carry two formats and do serve WebP-first via `<source>`.
 *
 * Named `Figure` (not `Image`) to avoid confusion with `next/image`, and
 * because it renders a `<figure>` and covers any raster image, not just
 * illustrations.
 *
 * A slug with no generated image (its source hasn't been added yet) renders a
 * small "pending" hint while developing and nothing at all in production, so a
 * placement can be authored before its artwork exists without shipping a broken
 * or placeholder box to learners.
 */
import { ImageIcon } from "lucide-react";
import imageManifest from "@/lib/generated/images";
import styles from "./Figure.module.css";

const PUBLIC_BASE = "/images";

// Output extension → MIME type for the <picture> <source>/<img> elements.
const MIME: Record<string, string> = {
  webp: "image/webp",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  avif: "image/avif",
  gif: "image/gif",
};

interface FigureProps {
  /** Image slug, the source filename without extension (e.g. "panda"). */
  slug: string;
  /** Alt text. Pass "" only for a purely decorative image. */
  alt: string;
  /** Optional caption shown under the image. */
  caption?: string;
  /**
   * Optional cap on display width in px. Omitted by default so the figure
   * fills the full content width; pass a value only to deliberately hold a
   * single figure narrower than the column.
   */
  maxWidth?: number;
  /** Eager-load + high fetch priority for an above-the-fold hero. */
  priority?: boolean;
}

export function Figure({
  slug,
  alt,
  caption,
  maxWidth,
  priority = false,
}: FigureProps) {
  const entry = imageManifest[slug];

  if (!entry) {
    // No generated image for this slug yet. Surface the pending slot in dev so
    // authors see what's missing; render nothing in production.
    if (process.env.NODE_ENV !== "development") return null;
    return (
      <span
        className={styles.pending}
        role="img"
        aria-label={`Image pending: ${slug}`}
      >
        <ImageIcon className={styles.pendingIcon} aria-hidden="true" />
        <span>
          Image <code>{slug}</code> pending, promote a candidate for it (
          <code>node scripts/promote-illustrations.mjs {slug}</code>) or add a
          raster source named <code>{slug}</code> under{" "}
          <code>assets/images/</code> and run <code>npm run build:images</code>.
        </span>
      </span>
    );
  }

  // The last format is the <img> fallback; any earlier ones are <source>s.
  const fallback = entry.formats[entry.formats.length - 1];
  const sources = entry.formats.slice(0, -1);

  return (
    <figure
      className={styles.figure}
      style={maxWidth ? { maxWidth: `${maxWidth}px` } : undefined}
    >
      <picture>
        {sources.map((ext) => (
          <source
            key={ext}
            srcSet={`${PUBLIC_BASE}/${slug}.${ext}`}
            type={MIME[ext]}
          />
        ))}
        <img
          src={`${PUBLIC_BASE}/${slug}.${fallback}`}
          width={entry.width}
          height={entry.height}
          alt={alt}
          className={styles.img}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={priority ? "high" : "auto"}
        />
      </picture>
      {caption ? <figcaption className={styles.caption}>{caption}</figcaption> : null}
      {/* Regeneration handle. The prompt id is the slug with the `-cutout`
          suffix dropped, which is what `data/illustration-prompts.json` is keyed
          by and what every pipeline script takes as `--only`. Rendered so a
          reviewer reading the live page can name the exact image to redo
          without cross-referencing the gallery. */}
      <figcaption className={styles.assetId}>
        <code>{slug.replace(/-cutout$/, "")}</code>
      </figcaption>
    </figure>
  );
}

export default Figure;
