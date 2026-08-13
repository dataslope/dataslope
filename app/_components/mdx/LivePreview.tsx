"use client";

/**
 * <LivePreview>, a "renders instantly, no Run button" HTML/CSS demo for the
 * Modern CSS course. It paints the given `html` + `css` into a Shadow DOM the
 * moment it mounts, so the learner sees the real, browser-rendered result
 * inline, then shows the exact source that produced it directly underneath.
 *
 * Why a Shadow DOM: the demo's CSS must not leak into the surrounding article
 * (and the article's Tailwind/Fumadocs styles must not leak into the demo).
 * A shadow root gives complete, two-way style isolation with native CSS
 * semantics intact, no reset is imposed on the demo (so box-model lessons see
 * the browser's real `content-box` default, `:hover`, media queries, grid,
 * animations, etc. all behave exactly as they would on a standalone page).
 *
 * Usage in MDX (CSS shown by default; pass `hideHtml` to show only the CSS
 * when the markup is boilerplate):
 * ```mdx
 * <LivePreview
 *   html={`<div class="box">Hi</div>`}
 *   css={`.box { padding: 1rem; background: papayawhip; }`}
 * />
 * ```
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
  /** Space the stage holds for the demo (number → px).
   *
   *  A floor, not a cap: the demo still grows past it (a narrow viewport
   *  wraps the markup and makes it taller), so a number that is a little
   *  small costs a small shift rather than clipping the lesson's own
   *  example.
   *
   *  Worth setting on every demo, because the stage is **empty until
   *  hydration** — the shadow root is filled in an effect, so the server's
   *  HTML has a zero-height box where the demo will be. Unreserved, a page
   *  of these grows by thousands of pixels the moment its JavaScript runs,
   *  which is the "deep link lands screens away from the heading" bug that
   *  `<HashScrollFix>` then has three seconds to paper over. Reserving the
   *  space means there is nothing to paper over.
   *
   *  Measure rather than guess: the natural heights across the course range
   *  from 83px to 613px, so there is no default worth having. */
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

/** Minimal base styles injected ahead of the demo CSS: only a readable
 *  default font + text color so untyped demos aren't Times New Roman on
 *  black. Deliberately no `box-sizing` / margin reset, the CSS course
 *  teaches those defaults, so the shadow root must expose them faithfully. */
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
    // `minHeight`, not `height`: the reservation has to survive a viewport
    // narrow enough to wrap the demo taller than it was measured at, and a
    // demo that outgrows its box should push the page down a little rather
    // than get its own point cropped off.
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
