/**
 * Renders an optimized raster image inside a lesson or landing page. The
 * manifest built by `scripts/build-images.mjs` records slug → intrinsic size +
 * formats, which lets the `<img>` reserve layout space (no CLS); the last
 * format is the `<img>` fallback, earlier ones become `<source>`s. A slug with
 * no generated image shows a dev-only "pending" hint and nothing in production.
 */
import { ImageIcon } from "lucide-react";
import imageManifest from "@/lib/generated/images";
import { withInlineMarkup } from "./inlineMarkup";
import { FigureSources, type FigureSource } from "./FigureSources";
import styles from "./Figure.module.css";

const PUBLIC_BASE = "/images";

// The slug printed under each figure is an authoring handle, dev-only.
const SHOW_ASSET_ID = process.env.NODE_ENV === "development";

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
  /** Image slug, the source filename without extension (e.g. "pandas-groupby-cutout"). */
  slug: string;
  /** Alt text. Pass "" only for a purely decorative image. */
  alt: string;
  /** Optional caption; backticks and asterisks render via `withInlineMarkup`. */
  caption?: string;
  /** Image/data provenance, rendered as a credit line under the caption. */
  sources?: readonly FigureSource[];
  /** Optional cap on display width in px; omitted = full content width. */
  maxWidth?: number;
  /** Eager-load + high fetch priority for an above-the-fold hero. */
  priority?: boolean;
}

export function Figure({
  slug,
  alt,
  caption,
  sources = [],
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
  const altFormats = entry.formats.slice(0, -1);

  return (
    <figure
      className={styles.figure}
      style={maxWidth ? { maxWidth: `${maxWidth}px` } : undefined}
    >
      <picture>
        {altFormats.map((ext) => (
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
      {/* One <figcaption> per <figure>: the credit line renders inside it
          rather than as a second one. */}
      {caption || sources.length > 0 ? (
        <figcaption className={styles.caption}>
          {caption ? withInlineMarkup(caption) : null}
          <FigureSources sources={sources} />
        </figcaption>
      ) : null}
      {/* Regeneration handle (dev-only): the prompt id is the slug minus the
          `-cutout` suffix, the key in data/illustration-prompts.json. */}
      {SHOW_ASSET_ID ? (
        <figcaption className={styles.assetId}>
          <code>{slug.replace(/-cutout$/, "")}</code>
        </figcaption>
      ) : null}
    </figure>
  );
}

export default Figure;
