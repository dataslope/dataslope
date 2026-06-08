import styles from "./illustration.module.css";

/**
 * `<Illustration>` — a decorative / informative vector figure for lessons.
 *
 * The illustrations themselves are generated externally (e.g. with Recraft)
 * as SVGs and dropped into `public/illustrations/<course>/…`. Until a file is
 * generated, the component renders a **placeholder frame** that shows the
 * generation `prompt`, so authors can scaffold a whole course with the right
 * art direction first and fill in the real artwork later.
 *
 * Authoring (in MDX, no import needed — registered in `mdx-components.tsx`):
 *
 * ```mdx
 * <Illustration
 *   prompt="Flat abstract vector illustration of a row of numbered mailboxes…"
 *   alt="A row of memory cells, each holding one byte"
 *   caption="RAM as a long row of numbered, byte-sized boxes."
 *   ratio="16 / 9"
 * />
 * ```
 *
 * Props:
 *   - `prompt`  (required) the image-generation prompt. Shown in the
 *               placeholder; ignored once `src` is supplied.
 *   - `src`     path to the generated SVG (served from `/public`). When set,
 *               the real artwork renders instead of the placeholder.
 *   - `alt`     accessible description for the final `<img>`. Omit (or pass
 *               `""`) for purely decorative art so screen readers skip it.
 *   - `caption` optional visible caption rendered as a `<figcaption>`.
 *   - `ratio`   CSS `aspect-ratio` for the frame (default `16 / 9`).
 *
 * Art-direction guidance for the prompt lives in `docs/illustrations.md`; in
 * short: flat vector, no strokes/borders on shapes, must read on both light
 * and dark backgrounds, and stick to the brand blue/green/yellow/red 500s.
 */

export interface IllustrationProps {
  prompt: string;
  src?: string;
  alt?: string;
  caption?: string;
  ratio?: string;
}

export function Illustration({
  prompt,
  src,
  alt = "",
  caption,
  ratio = "16 / 9",
}: IllustrationProps) {
  return (
    <figure className={styles.figure}>
      {src ? (
        // Real artwork. SVGs sit in /public; a plain <img> keeps them
        // theme-agnostic (the SVG itself carries the dual-mode palette).
        // Vector SVGs gain nothing from next/image's raster optimization.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className={styles.image}
          src={src}
          alt={alt}
          style={{ aspectRatio: ratio }}
          loading="lazy"
        />
      ) : (
        <div
          className={styles.placeholder}
          style={{ aspectRatio: ratio }}
          role="img"
          aria-label={alt || "Illustration placeholder"}
        >
          <div className={styles.frameIcon} aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" width="28" height="28">
              <rect x="3" y="4" width="18" height="16" rx="2" fill="currentColor" opacity="0.12" />
              <circle cx="8.5" cy="9" r="1.8" fill="var(--ds-yellow-500)" />
              <path d="M4 18l5-5 3 3 4-4 4 4v1a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" fill="var(--ds-blue-500)" />
              <path d="M11 16l4-4 3 3v1a1 1 0 0 1-1 1h-7z" fill="var(--ds-green-500)" />
            </svg>
          </div>
          <span className={styles.kicker}>Illustration · placeholder</span>
          <p className={styles.prompt}>{prompt}</p>
          <span className={styles.palette} aria-hidden="true">
            <i style={{ background: "var(--ds-blue-500)" }} />
            <i style={{ background: "var(--ds-green-500)" }} />
            <i style={{ background: "var(--ds-yellow-500)" }} />
            <i style={{ background: "var(--ds-red-500)" }} />
          </span>
        </div>
      )}
      {caption && <figcaption className={styles.caption}>{caption}</figcaption>}
    </figure>
  );
}

export default Illustration;
