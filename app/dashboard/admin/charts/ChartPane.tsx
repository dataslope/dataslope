"use client";

/**
 * One theme-pinned copy of a chart, with an expand control. `data-force` is
 * read by Chart.module.css — the same rules that paint the figure in a lesson.
 * The expand overlay gives the figure full size (side-by-side panes render at
 * ~45% scale, hiding label collisions and vanishing hairlines) while keeping
 * its pinned theme. Only this control is a client component.
 */
import { useCallback, useEffect, useState } from "react";
import { Maximize2, X } from "lucide-react";
import chartStyles from "@/app/_components/mdx/Chart.module.css";
import styles from "./charts.module.css";

interface ChartPaneProps {
  theme: "light" | "dark";
  slug: string;
  title: string;
  svg: string;
}

export function ChartPane({ theme, slug, title, svg }: ChartPaneProps) {
  const [expanded, setExpanded] = useState(false);
  const close = useCallback(() => setExpanded(false), []);

  // Esc to close, and hold the page still behind the overlay.
  useEffect(() => {
    if (!expanded) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [expanded, close]);

  return (
    <div className={`${styles.pane} ${styles[theme]}`}>
      <span className={styles.paneLabel}>{theme}</span>
      <button
        type="button"
        className={styles.expandBtn}
        onClick={() => setExpanded(true)}
        title={`Expand ${slug} (${theme})`}
        aria-label={`Expand ${slug} in ${theme} mode`}
      >
        <Maximize2 size={13} aria-hidden="true" />
      </button>
      <div
        className={chartStyles.chart}
        data-force={theme}
        role="img"
        aria-label={title}
        // Build-time output from our own spec files, never user input.
        dangerouslySetInnerHTML={{ __html: svg }}
      />

      {expanded ? (
        <div
          className={`${styles.overlay} ${styles[theme]}`}
          role="dialog"
          aria-modal="true"
          aria-label={`${slug}, ${theme} mode`}
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div className={styles.overlayBar}>
            <span className={styles.overlaySlug}>
              {slug} <span className={styles.overlayTheme}>{theme}</span>
            </span>
            <button
              type="button"
              className={styles.overlayClose}
              onClick={close}
              title="Close (Esc)"
              aria-label="Close"
            >
              <X size={17} aria-hidden="true" />
            </button>
          </div>
          <div className={styles.overlayStage}>
            <div
              className={`${chartStyles.chart} ${styles.overlayChart}`}
              data-force={theme}
              role="img"
              aria-label={title}
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
