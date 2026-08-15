/**
 * The credit line under a figure. Not a GFM footnote: captions are JSX string
 * props markdown never touches (a `[^1]` would arrive literally), and a
 * figure's credit is part of reading it, so it renders in place. Server
 * Component — no client JS.
 */
import { withInlineMarkup } from "./inlineMarkup";
import styles from "./FigureSources.module.css";

export interface FigureSource {
  /** How the reference reads on the page; takes the same inline markup as a
   *  caption. */
  text: string;
  /** Stable public home for the work; omit rather than link something that
   *  will rot. */
  href?: string;
}

export function FigureSources({ sources }: { sources: readonly FigureSource[] }) {
  if (sources.length === 0) return null;

  return (
    <span className={styles.sources}>
      <span className={styles.label}>
        {sources.length > 1 ? "Sources" : "Source"}
      </span>
      {sources.map((source, i) => (
        <span className={styles.entry} key={`${source.href ?? source.text}-${i}`}>
          {source.href ? (
            <a href={source.href} target="_blank" rel="noreferrer">
              {withInlineMarkup(source.text)}
            </a>
          ) : (
            withInlineMarkup(source.text)
          )}
        </span>
      ))}
    </span>
  );
}

export default FigureSources;
