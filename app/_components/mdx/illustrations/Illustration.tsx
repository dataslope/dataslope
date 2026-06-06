/**
 * <Illustration> — renders a registered lesson illustration as an inline,
 * server-rendered <svg> wrapped in a captioned <figure>.
 *
 * The art paints itself from the `--il-*` tokens declared in
 * `Illustration.module.css`, which are overridden under `.dark`, so a single
 * piece renders correctly in both light and dark mode with no client JS.
 *
 * Usage in MDX:
 *   <Illustration
 *     name="closure-backpack"
 *     caption="A returned function carries a backpack of the variables it closed over."
 *   />
 */
import type { CSSProperties, ReactNode } from "react";
import styles from "./Illustration.module.css";
import { ART } from "./registry";

export interface IllustrationProps {
  /** Registry key, e.g. "closure-backpack" (see registry.ts). */
  name: string;
  /** Optional caption shown beneath the art. */
  caption?: ReactNode;
  /** Override the accessible label (defaults to the registry's description). */
  alt?: string;
  /** Override the natural max width (CSS length). */
  maxWidth?: string;
}

export default function Illustration({ name, caption, alt, maxWidth }: IllustrationProps) {
  const entry = ART[name];

  if (!entry) {
    // Never crash the page on an authoring typo — render a visible, obvious
    // placeholder and log the available names instead.
    if (typeof console !== "undefined") {
      console.error(`<Illustration>: unknown name "${name}". Known names: ${Object.keys(ART).join(", ")}`);
    }
    return (
      <figure className={styles.figure}>
        <div className={styles.missing}>missing illustration: {name}</div>
      </figure>
    );
  }

  const { viewBox, defaultAlt, Art } = entry;
  const width = maxWidth ?? entry.maxWidth;
  const style = width ? ({ "--il-max-width": width } as CSSProperties) : undefined;

  return (
    <figure className={styles.figure} style={style}>
      <svg
        className={styles.svg}
        viewBox={viewBox}
        role="img"
        aria-label={alt ?? defaultAlt}
        xmlns="http://www.w3.org/2000/svg"
      >
        <Art />
      </svg>
      {caption ? <figcaption className={styles.caption}>{caption}</figcaption> : null}
    </figure>
  );
}
