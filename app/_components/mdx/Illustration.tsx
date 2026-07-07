/**
 * Renders an optimized raster illustration (a transparent Recraft PNG) inside a
 * lesson or course/interview landing page:
 *
 * ```mdx
 * <Illustration slug="panda" alt="A giant panda, mascot for the pandas library" priority />
 * ```
 *
 * The actual bytes live in `assets/course-art/<slug>.png`; the build step
 * (`scripts/build-course-art.mjs`) crushes each source into a `.png` + `.webp`
 * pair under `public/course-art/` and records its intrinsic size in the
 * generated manifest this component imports. That lets the `<img>` reserve
 * layout space (no CLS) and serve WebP first with a PNG fallback via
 * `<picture>`.
 *
 * A slug with no generated image (its PNG hasn't been added yet) renders a
 * small "pending" hint while developing and nothing at all in production — so a
 * placement can be authored before its artwork exists without shipping a broken
 * or placeholder box to learners.
 *
 * Recraft sources are drawn to read on both the light (#ffffff) and dark
 * (#121212) lesson backgrounds, so no per-theme swap is needed here.
 */
import { ImageIcon } from "lucide-react";
import courseArt from "@/lib/generated/course-art";
import styles from "./Illustration.module.css";

const PUBLIC_BASE = "/course-art";

interface IllustrationProps {
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

export function Illustration({
  slug,
  alt,
  caption,
  maxWidth = 640,
  priority = false,
}: IllustrationProps) {
  const entry = courseArt[slug];

  if (!entry) {
    // No generated image for this slug yet. Surface the pending slot in dev so
    // authors see what's missing; render nothing in production.
    if (process.env.NODE_ENV !== "development") return null;
    return (
      <span
        className={styles.pending}
        role="img"
        aria-label={`Illustration pending: ${slug}`}
      >
        <ImageIcon className={styles.pendingIcon} aria-hidden="true" />
        <span>
          Illustration <code>{slug}</code> pending — add{" "}
          <code>assets/course-art/{slug}.png</code> and run{" "}
          <code>npm run build:course-art</code>.
        </span>
      </span>
    );
  }

  return (
    <figure className={styles.figure} style={{ maxWidth: `${maxWidth}px` }}>
      <picture>
        <source srcSet={`${PUBLIC_BASE}/${slug}.webp`} type="image/webp" />
        <img
          src={`${PUBLIC_BASE}/${slug}.png`}
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

export default Illustration;
