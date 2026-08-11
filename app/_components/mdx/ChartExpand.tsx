"use client";

/**
 * "See the whole chart" for narrow screens.
 *
 * A chart is one fixed 680px drawing that stops scaling at the width its
 * smallest label needs (see `legibleMinWidth` in scripts/build-charts.mjs), so
 * on a phone it sits at ~578px inside a ~358px column and its container
 * scrolls. That bargain keeps the type readable, and it works for reading one
 * end of a chart at a time — but most of these figures are comparisons, and no
 * amount of sideways scrolling puts both panels in front of the reader at
 * once.
 *
 * This offers the other half of the bargain: a view that uses the whole
 * viewport, where the entire drawing is on screen at the largest size that
 * fits. In portrait that is small; turned sideways a phone gives about 844px,
 * which is more than the chart's own width, so the whole thing lands at full
 * size and full legibility. The hint says so, because "rotate your phone" is
 * not a thing readers think to try.
 *
 * The button only exists below the breakpoint where the chart is clipped
 * (Chart.module.css decides that, not this component) — above it the whole
 * drawing is already on screen.
 *
 * ── Why the markup is cloned from the DOM ───────────────────────────────────
 *
 * The obvious shape is to pass the SVG string in as a prop, and it is the
 * wrong one: the markup averages ~13KB per chart and would then cross into the
 * client payload a second time, doubling every chart's cost on a lesson that
 * carries six of them. The chart is already in the document, so the overlay
 * reads `innerHTML` off the rendered node when it opens. It is our own
 * build-time markup either way.
 *
 * The clone is given the same `.chart` class as the original, which is where
 * the `--ds-chart-*` role tokens live — without it the SVG's `var()` colors
 * resolve to nothing and the chart opens blank.
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
