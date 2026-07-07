/**
 * Renders an optimized raster image (Recraft topic art, a photo, a diagram, a
 * screenshot — anything under `assets/images/`) inside a lesson or landing page:
 *
 * ```mdx
 * <Figure slug="panda" alt="A giant panda, mascot for the pandas library" priority />
 * ```
 *
 * The source bytes live in `assets/images/<slug>.<ext>`; the build step
 * (`scripts/build-images.mjs`) crushes each source into an optimized `.webp`
 * plus a raster fallback (`.png` when transparent, else `.jpg`) under
 * `public/images/` and records its intrinsic size + formats in the generated
 * manifest this component imports. That lets the `<img>` reserve layout space
 * (no CLS) and serve WebP first with a fallback via `<picture>`.
 *
 * Named `Figure` (not `Image`) to avoid confusion with `next/image`, and
 * because it renders a `<figure>` and covers any raster image, not just
 * illustrations.
 *
 * A slug with no generated image (its source hasn't been added yet) renders a
 * small "pending" hint while developing and nothing at all in production — so a
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
  /** Image slug — the source filename without extension (e.g. "panda"). */
  slug: string;
  /** Alt text. Pass "" only for a purely decorative image. */
  alt: string;
  /** Optional caption shown under the image. */
  caption?: string;
  /** Max display width in px (default 640, matching the inline-SVG heroes). */
  maxWidth?: number;
  /** Eager-load + high fetch priority for an above-the-fold hero. */
  priority?: boolean;
}

export function Figure({
  slug,
  alt,
  caption,
  maxWidth = 640,
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
          Image <code>{slug}</code> pending — add a raster source named{" "}
          <code>{slug}</code> under <code>assets/images/</code> and run{" "}
          <code>npm run build:images</code>.
        </span>
      </span>
    );
  }

  // The last format is the <img> fallback; any earlier ones are <source>s.
  const fallback = entry.formats[entry.formats.length - 1];
  const sources = entry.formats.slice(0, -1);

  return (
    <figure className={styles.figure} style={{ maxWidth: `${maxWidth}px` }}>
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
    </figure>
  );
}

export default Figure;
