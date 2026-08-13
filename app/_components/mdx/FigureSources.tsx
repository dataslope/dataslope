/**
 * The credit line under a figure: where its numbers came from.
 *
 * ```mdx
 * <Chart
 *   slug="bug-cost-by-stage"
 *   sources={[
 *     { text: "Boehm, *Software Engineering Economics* (1981)", href: "https://…" },
 *   ]}
 * />
 * ```
 *
 * A chart spec usually carries its own (`export const sources` in
 * `charts/<slug>.mjs`), so the credit travels with the figure to every lesson
 * that embeds it rather than being re-typed on each one — `bug-cost-by-stage`
 * appears on three.
 *
 * ## Why this is not a footnote
 *
 * GFM footnotes work in a lesson body (`remark-gfm` is first in the fumadocs
 * preset), and a claim made in *prose* should use one: the reference belongs
 * at the foot of the page with a numbered link back to the sentence. A figure
 * is different in two ways. Its caption is a JSX string prop, which markdown
 * never touches, so a `[^1]` written in one arrives on the page as those four
 * characters. And a figure is a quotation of someone's data: the credit is
 * part of reading it, not an aside to look up later, which is why this renders
 * in place under the caption.
 *
 * A Server Component rendering plain elements, like the rest of the figure
 * family, so a lesson using one ships no extra JavaScript.
 */
import { withInlineMarkup } from "./inlineMarkup";
import styles from "./FigureSources.module.css";

export interface FigureSource {
  /**
   * How the reference reads on the page: author, title, publisher, year. The
   * same inline markup a caption takes, so a title goes in `*asterisks*` and
   * an identifier in backticks.
   */
  text: string;
  /**
   * Where it lives, when it has a stable public home. Prefer a landing page
   * for the work itself (a publisher, Open Library, a DOI) over a copy that
   * can move; omit it rather than link something that will rot.
   */
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
