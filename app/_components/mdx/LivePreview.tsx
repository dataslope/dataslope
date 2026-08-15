"use client";

/**
 * <LivePreview>, a "renders instantly, no Run button" HTML/CSS demo for the
 * Modern CSS course: paints `html` + `css` into a Shadow DOM on mount, source
 * shown underneath. Shadow DOM gives two-way style isolation with no imposed
 * reset, so the demo sees the browser's real defaults.
 */

import { useEffect, useRef, type ReactNode } from "react";
import { Eye } from "lucide-react";
import styles from "./livePreview.module.css";
import { PreviewCode } from "./PreviewCode";

interface LivePreviewProps {
  /** Markup rendered inside the shadow root (no <html>/<body> needed). */
  html: string;
  /** CSS applied inside the shadow root. Scoped, never leaks to the page. */
  css: string;
  /** Space the stage reserves for the demo (number → px). A floor, not a cap.
   *  Set it on every demo: the stage is empty until hydration (the shadow root
   *  fills in an effect), so unreserved space means large layout shifts and
   *  deep links landing screens away. Measure rather than guess. */
  height?: number | string;
  /** Inline background for the stage, overriding the default canvas texture
   *  (e.g. `"#fff"` for a demo that draws on white). */
  background?: string;
  /** Small label shown in the header next to the "Live preview" badge. */
  title?: string;
  /** Hide the HTML source (when the markup is boilerplate scaffolding). */
  hideHtml?: boolean;
  /** Hide the CSS source (rare; e.g. an HTML-only structure demo). */
  hideCss?: boolean;
  /** Optional explanatory footnote rendered under the whole widget. */
  note?: ReactNode;
}

/** Minimal base styles ahead of the demo CSS: a readable default font only.
 *  Deliberately no `box-sizing`/margin reset — the course teaches those
 *  defaults, so the shadow root must expose them faithfully. */
const SHADOW_BASE = `:host { display: block; }
:where(*) { font-family: system-ui, -apple-system, "Segoe UI", sans-serif; }`;

export function LivePreview({
  html,
  css,
  height,
  background,
  title,
  hideHtml = false,
  hideCss = false,
  note,
}: LivePreviewProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const root = host.shadowRoot ?? host.attachShadow({ mode: "open" });
    root.innerHTML = `<style>${SHADOW_BASE}\n${css}</style>${html}`;
  }, [html, css]);

  const stageStyle: React.CSSProperties = {};
  if (height !== undefined) {
    // `minHeight`, not `height`: a demo that outgrows its box should push the
    // page down rather than get cropped.
    stageStyle.minHeight = typeof height === "number" ? `${height}px` : height;
  }
  if (background) stageStyle.background = background;

  return (
    <div className={styles.preview}>
      <div className={styles.header}>
        <span className={styles.badge}>
          <Eye size={12} aria-hidden />
          Live preview
        </span>
        {title ? <span className={styles.title}>{title}</span> : null}
      </div>
      <div
        className={`${styles.stage} ${background ? "" : styles.stageCanvas}`}
        style={stageStyle}
      >
        {/* Shadow host, filled in the effect above. suppressHydrationWarning
            because the shadow content is client-only and must not be diffed
            against the (empty) SSR markup. */}
        <div
          ref={hostRef}
          className={styles.shadowHost}
          suppressHydrationWarning
        />
      </div>
      {!hideHtml ? <PreviewCode lang="HTML" source={html} /> : null}
      {!hideCss ? <PreviewCode lang="CSS" source={css} /> : null}
      {note ? <div className={styles.note}>{note}</div> : null}
    </div>
  );
}

export default LivePreview;
