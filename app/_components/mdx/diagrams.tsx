/**
 * Small presentational lesson diagrams drawn with real elements instead of
 * box-drawing characters (which fall outside the JetBrains Mono latin subset,
 * misalign, and carry no semantics). All Server Components — plain elements +
 * CSS, no client JS — registered statically in `mdx-components.tsx`. Diagrams
 * that are really graphs belong in a mermaid fence instead.
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
 * The four layers of the CSS box model as genuinely nested boxes: each layer
 * is a real element whose padding is the visible band, and each band carries
 * its own written name so color is never the only cue.
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
 * arrow is an inline SVG (font-independent) and aria-hidden — the relationship
 * is already in the figure's label.
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
 * A line of source with an underbrace under each meaningful span and a phrase
 * naming it. Braces are border-drawn so they stretch to the span's actual
 * width at the reader's font size; unlabeled parts get no brace.
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
 * A Class-Responsibility-Collaborator index card. Deliberately capped in
 * width: an overflowing responsibility list is the signal that the class does
 * too much, which a full-width card would never give.
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
