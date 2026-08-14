"use client";

/**
 * "See the whole chart" overlay for narrow screens: the entire drawing at the
 * largest size that fits the viewport. The button only exists below the
 * breakpoint where the chart is clipped (Chart.module.css decides). The markup
 * is cloned from the rendered DOM rather than passed as a prop — the ~13KB SVG
 * would otherwise cross into the client payload a second time. The clone keeps
 * the `.chart` class, where the `--ds-chart-*` tokens live; without it the
 * `var()` colors resolve to nothing and the chart opens blank.
 */
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Maximize2, X } from "lucide-react";
import styles from "./Chart.module.css";

interface ChartExpandProps {
  /** The chart's accessible name; becomes the dialog's label. */
  label: string;
  /** The rendered chart, as `<Chart>` builds it. */
  children: React.ReactNode;
}

export default function ChartExpand({ label, children }: ChartExpandProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [markup, setMarkup] = useState<string | null>(null);
  const hintId = useId();

  const open = useCallback(() => {
    const svgHost = stageRef.current?.querySelector(`.${styles.chart}`);
    if (svgHost) setMarkup(svgHost.innerHTML);
  }, []);

  const close = useCallback(() => {
    setMarkup(null);
    // Hand focus back to the control that opened the overlay, or the reader is
    // returned to the top of the document.
    openerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (markup === null) return;
    closeRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.defaultPrevented) {
        e.preventDefault(); // claim it, so nothing underneath also closes
        close();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [markup, close]);

  return (
    <div className={styles.stage} ref={stageRef}>
      {children}
      <button
        type="button"
        ref={openerRef}
        className={styles.expandBtn}
        onClick={open}
        title="View the whole chart"
        aria-label="View the whole chart full screen"
      >
        <Maximize2 className={styles.expandIcon} strokeWidth={2} aria-hidden="true" />
      </button>

      {markup !== null ? (
        <div
          className={styles.backdrop}
          role="dialog"
          aria-modal="true"
          aria-label={label}
          aria-describedby={hintId}
        >
          <button
            type="button"
            ref={closeRef}
            className={styles.closeBtn}
            onClick={close}
            title="Close (Esc)"
            aria-label="Close"
          >
            <X size={18} strokeWidth={2} aria-hidden="true" />
          </button>
          <div
            className={`${styles.chart} ${styles.lightboxStage}`}
            role="img"
            aria-label={label}
            // Cloned from the node above, which <Chart> filled with build-time
            // output from our own spec files. Never user input.
            dangerouslySetInnerHTML={{ __html: markup }}
          />
          <p className={styles.lightboxHint} id={hintId}>
            Turn your phone sideways for the chart at full size, or pinch to zoom.
          </p>
        </div>
      ) : null}
    </div>
  );
}
