"use client";

/**
 * <ReactPreview>, the React-course counterpart to <LivePreview>: a live
 * interactive component (`children`, mounts immediately) with the TSX that
 * defines it (`code`, shown verbatim) underneath. Reusable demo components
 * live in reactDemos.tsx, registered globally in mdx-components.tsx.
 */

import type { ReactNode } from "react";
import { Boxes } from "lucide-react";
import styles from "./livePreview.module.css";
import { PreviewCode } from "./PreviewCode";

interface ReactPreviewProps {
  /** The live, interactive component instance to render on the stage. */
  children: ReactNode;
  /** TSX source shown below the rendered result. */
  code: string;
  /** Language chip label for the code panel. Defaults to "TSX". */
  lang?: string;
  /** Fixed stage height (number → px). Omit to size to content. */
  height?: number | string;
  /** Inline background for the stage (defaults to the canvas texture). */
  background?: string;
  /** Small label shown next to the "Live preview" badge. */
  title?: string;
  /** Optional explanatory footnote under the whole widget. */
  note?: ReactNode;
}

export function ReactPreview({
  children,
  code,
  lang = "TSX",
  height,
  background,
  title,
  note,
}: ReactPreviewProps) {
  const stageStyle: React.CSSProperties = {};
  if (height !== undefined) {
    stageStyle.height = typeof height === "number" ? `${height}px` : height;
  }
  if (background) stageStyle.background = background;

  return (
    <div className={styles.preview}>
      <div className={styles.header}>
        <span className={styles.badge}>
          <Boxes size={12} aria-hidden />
          Live preview
        </span>
        {title ? <span className={styles.title}>{title}</span> : null}
      </div>
      <div
        className={`${styles.stage} ${background ? "" : styles.stageCanvas}`}
        style={stageStyle}
      >
        <div className={styles.reactStage}>{children}</div>
      </div>
      <PreviewCode lang={lang} source={code} />
      {note ? <div className={styles.note}>{note}</div> : null}
    </div>
  );
}

export default ReactPreview;
