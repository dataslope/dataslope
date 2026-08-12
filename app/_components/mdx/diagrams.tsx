/**
 * Small, purely presentational lesson diagrams, drawn with real elements
 * instead of box-drawing characters.
 *
 * ## Why these exist
 *
 * Several lessons used to "draw" their diagrams in a fenced code block, with
 * `┌─┐│└┘` or with `+---+` and `---->`. Two things go wrong with that, and the
 * CSS box-model figure on `modern-css-layout/box-model-and-sizing` hit both:
 *
 *   1. **The glyphs are not in the code font.** Code is set in JetBrains Mono,
 *      loaded by `next/font/google` with `subsets: ["latin"]` (app/layout.tsx),
 *      and that subset stops well short of U+2500. Every box-drawing character
 *      therefore falls back to whatever monospace the reader's OS supplies,
 *      whose advance width is *not* JetBrains Mono's. A line's width then
 *      depends on how many drawn characters it happens to contain, so the rows
 *      of a nested box stop lining up and the figure arrives as scattered
 *      fragments. A directory tree survives this (every row at a given depth
 *      carries the same prefix, so siblings still align, which is why the
 *      `tree` listings in this repo are left alone); a free-drawn box does not.
 *   2. **It is a picture with no semantics.** A screen reader reads the corner
 *      glyphs out one by one, nothing scales below the width the art was drawn
 *      at, and the diagram cannot pick up the page's colors or theme.
 *
 * Everything here is a Server Component that renders plain elements and CSS, so
 * a lesson using one ships no extra JavaScript. They are registered statically
 * in `mdx-components.tsx` for that reason, next to `<Figure>` and `<Chart>`
 * rather than in `lazyWidgets.ts`.
 *
 * ## What belongs here
 *
 * A diagram whose *geometry is the explanation*: nesting, adjacency, a span of
 * syntax and the phrase that names it. A diagram that is really a graph
 * (a hierarchy, a pipeline, a state machine) belongs in a ```mermaid fence
 * instead, and tabular content belongs in a markdown table.
 */
import type { ReactNode } from "react";
import { withInlineMarkup } from "./inlineMarkup";
import styles from "./diagrams.module.css";

/** Shared `<figure>` wrapper: optional caption, rendered like `<Figure>`'s. */
function DiagramFigure({
  caption,
  label,
  children,
}: {
  caption?: string;
  /** Text alternative for the drawing itself. */
  label: string;
  children: ReactNode;
}) {
  return (
    <figure className={styles.figure}>
      <div className={styles.stage} role="img" aria-label={label}>
        {children}
      </div>
      {caption ? (
        <figcaption className={styles.caption}>
          {withInlineMarkup(caption)}
        </figcaption>
      ) : null}
    </figure>
  );
}

/* ── <BoxModel> ──────────────────────────────────────────────────────────── */

/**
 * The four layers of the CSS box model as four genuinely nested boxes.
 *
 * ```mdx
 * <BoxModel caption="Each layer wraps the one inside it." />
 * ```
 *
 * The drawing is the thing being taught, so it is made of the thing being
 * taught: each layer is a real element whose *padding* is the band the reader
 * sees, and the border layer is a real `border`. Outside-in the bands are
 * yellow, blue, green, neutral — three primary brand hues plus an inert core,
 * far enough apart to stay separable for the ~8% of readers with a color
 * vision deficiency, and each band carries its own written name so the color
 * is never the only cue.
 */
export function BoxModel({ caption }: { caption?: string }) {
  return (
    <DiagramFigure
      label="The CSS box model: a content block wrapped by padding, then by a border, then by margin."
      caption={caption}
    >
      <div className={`${styles.layer} ${styles.margin}`}>
        <span className={styles.layerName}>margin</span>
        <div className={`${styles.layer} ${styles.border}`}>
          <span className={styles.layerName}>border</span>
          <div className={`${styles.layer} ${styles.padding}`}>
            <span className={styles.layerName}>padding</span>
            <div className={styles.content}>content</div>
          </div>
        </div>
      </div>
    </DiagramFigure>
  );
}

/* ── <MemoryCells> ───────────────────────────────────────────────────────── */

export interface MemoryCell {
  /** The label on the cell's header strip: a variable name, or an address. */
  name: string;
  /** What the cell holds: a value, or an address for a pointer. */
  value: string;
  /** A small annotation under the box, e.g. the slot's address or what the
   *  byte means as a character. */
  note?: string;
  /** Draw an arrow from this cell to the next one (a pointer's referent). */
  pointsToNext?: boolean;
}

/**
 * Named memory cells in a row, optionally joined by a "points at" arrow. The
 * shape the C and C++ courses used to draw with `+-----+` and `---->`, or as
 * columns of space-padded text:
 *
 * ```mdx
 * <MemoryCells
 *   cells={[
 *     { name: "p", value: "0x100", pointsToNext: true },
 *     { name: "n", value: "7" },
 *   ]}
 *   caption="`p` holds the address of `n`."
 * />
 * ```
 *
 * The arrow is an inline SVG rather than a glyph so it cannot depend on the
 * reader's fonts, and it is `aria-hidden`: the relationship it draws is
 * already in the figure's label and in the caption underneath. Cells wrap
 * when a row of them outgrows the column, so a byte-by-byte layout can run to
 * eight boxes without being scaled down to nothing.
 */
export function MemoryCells({
  cells,
  caption,
}: {
  cells: MemoryCell[];
  caption?: string;
}) {
  const label = cells
    .map((cell, i) => {
      const where = cell.note ? ` at ${cell.note}` : "";
      return cell.pointsToNext && cells[i + 1]
        ? `${cell.name} holds ${cell.value}${where}, pointing at ${cells[i + 1].name}`
        : `${cell.name} holds ${cell.value}${where}`;
    })
    .join("; ");

  return (
    <DiagramFigure label={`Memory cells: ${label}.`} caption={caption}>
      <div className={styles.cells}>
        {cells.map((cell, i) => (
          <div className={styles.cellGroup} key={`${cell.name}-${i}`}>
            <div className={styles.cellStack}>
              <div className={styles.cell}>
                <span className={styles.cellName}>{cell.name}</span>
                <span className={styles.cellValue}>{cell.value}</span>
              </div>
              {/* Always rendered, so a row where only some cells carry a note
                  keeps every box the same height and on the same baseline. */}
              <span className={styles.cellNote}>{cell.note ?? " "}</span>
            </div>
            {cell.pointsToNext && i < cells.length - 1 ? (
              <svg
                className={styles.arrow}
                viewBox="0 0 56 12"
                preserveAspectRatio="none"
                aria-hidden="true"
                focusable="false"
              >
                <path d="M0 6 H48" />
                <path d="M46 2 L55 6 L46 10 Z" />
              </svg>
            ) : null}
          </div>
        ))}
      </div>
    </DiagramFigure>
  );
}

/* ── <SyntaxBreakdown> ───────────────────────────────────────────────────── */

export interface SyntaxPart {
  /** The literal source text of this span. */
  text: string;
  /** What this span does. Omit for connective punctuation and keywords. */
  label?: string;
}

/**
 * A line of source with an underbrace under each meaningful span and a plain
 * phrase naming it. Replaces the `└────┬────┘` "anatomy" figures:
 *
 * ```mdx
 * <SyntaxBreakdown
 *   parts={[
 *     { text: "SUM(amount)", label: "what to compute" },
 *     { text: "OVER (" },
 *     { text: "PARTITION BY region", label: "which rows share a window" },
 *     { text: ")" },
 *   ]}
 * />
 * ```
 *
 * The braces are drawn with borders on an empty element, so they stretch to
 * whatever width their span actually occupies at the reader's font size, which
 * is the part a fixed-width drawing could never do. Unlabeled parts are the
 * scaffolding between the interesting spans and sit at full opacity with no
 * brace, so the eye goes to the four things being named.
 */
export function SyntaxBreakdown({
  parts,
  caption,
}: {
  parts: SyntaxPart[];
  caption?: string;
}) {
  const label = parts
    .filter((p) => p.label)
    .map((p) => `${p.text} is ${p.label}`)
    .join("; ");

  return (
    <DiagramFigure
      label={`Syntax breakdown of ${parts.map((p) => p.text).join(" ")}: ${label}.`}
      caption={caption}
    >
      <div className={styles.syntax}>
        {parts.map((part, i) => (
          <span
            className={part.label ? styles.partLabeled : styles.part}
            key={`${part.text}-${i}`}
          >
            <code className={styles.partText}>{part.text}</code>
            {part.label ? (
              <>
                <span className={styles.brace} aria-hidden="true" />
                <span className={styles.partName}>{part.label}</span>
              </>
            ) : null}
          </span>
        ))}
      </div>
    </DiagramFigure>
  );
}

/* ── <CrcCard> ───────────────────────────────────────────────────────────── */

export interface CrcRow {
  /** One thing the class is responsible for. */
  responsibility: string;
  /** The class it leans on to do that, if any. */
  collaborator?: string;
}

/**
 * A Class-Responsibility-Collaborator card, the index card from Beck and
 * Cunningham's 1989 paper:
 *
 * ```mdx
 * <CrcCard
 *   name="Order"
 *   rows={[
 *     { responsibility: "track its line items", collaborator: "LineItem" },
 *     { responsibility: "compute its total" },
 *   ]}
 * />
 * ```
 *
 * Physically small is the whole point of a CRC card, so the card is capped in
 * width rather than filling the column: a responsibility list that overflows
 * it is the signal that the class is doing too much, and a card stretched to
 * the full article width would never give that signal.
 */
export function CrcCard({
  name,
  rows,
  caption,
}: {
  name: string;
  rows: CrcRow[];
  caption?: string;
}) {
  return (
    <DiagramFigure
      label={`CRC card for the class ${name}, listing its responsibilities and collaborators.`}
      caption={caption}
    >
      <div className={styles.crc}>
        <div className={styles.crcTitle}>
          <span className={styles.crcTitleKey}>Class</span>
          <code className={styles.crcTitleName}>{name}</code>
        </div>
        <div className={styles.crcHead}>
          <span>Responsibilities</span>
          <span>Collaborators</span>
        </div>
        <ul className={styles.crcRows}>
          {rows.map((row) => (
            <li className={styles.crcRow} key={row.responsibility}>
              <span className={styles.crcResponsibility}>
                {row.responsibility}
              </span>
              <span className={styles.crcCollaborator}>
                {row.collaborator ? <code>{row.collaborator}</code> : null}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </DiagramFigure>
  );
}
