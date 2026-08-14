"use client";

/**
 * The single Plotly renderer every output panel draws charts through, so
 * the surfaces can't drift apart. Plotly is ~4 MB and only needed once a
 * chart renders, so it's imported from the CDN on demand (see PLOTLY_CDN);
 * the dynamic import is marked ignore for both bundlers so it stays out of
 * the client bundle and the OpenNext Worker bundle.
 */
import { useEffect, useRef } from "react";

import { PLOTLY_CDN } from "./runtime/cdn";
import type { PlotlyFigure } from "./types";

/** The slice of the Plotly global this app actually calls. */
interface PlotlyAPI {
  newPlot(
    el: HTMLElement,
    data: unknown[],
    layout?: Record<string, unknown>,
    config?: Record<string, unknown>,
  ): Promise<unknown>;
  addFrames(el: HTMLElement, frames: unknown[]): Promise<unknown>;
}

/** Tighter than Plotly's default so a figure in a narrow output panel spends
 *  its pixels on the data rather than on whitespace. A layout supplied by the
 *  figure itself still wins. */
const PLOTLY_MARGIN = { l: 48, r: 24, t: 48, b: 48 };

export function PlotlyChart({
  figure,
  className,
}: {
  figure: PlotlyFigure;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let cancelled = false;
    void (async () => {
      const mod = await import(
        /* webpackIgnore: true */ /* turbopackIgnore: true */ PLOTLY_CDN
      );
      if (cancelled || !ref.current) return;
      const Plotly = (mod.default ?? mod) as unknown as PlotlyAPI;
      // The Python runtime bakes the theme-appropriate template (plotly_dark
      // in dark mode, plotly in light mode) into figure.layout.template, so
      // only the margin is defaulted here and the figure renders as-is.
      const layout = { margin: PLOTLY_MARGIN, ...(figure.layout ?? {}) };
      await Plotly.newPlot(el, figure.data, layout, {
        responsive: true,
        displayModeBar: true,
        displaylogo: false,
        modeBarButtonsToRemove: ["sendDataToCloud", "lasso2d"],
      });
      // `animation_frame=` figures carry their frames separately from
      // `layout`; without addFrames the play button and slider draw but
      // stay inert.
      if (cancelled || !ref.current) return;
      if (figure.frames?.length) await Plotly.addFrames(el, figure.frames);
    })();
    return () => {
      cancelled = true;
    };
  }, [figure]);
  return <div ref={ref} className={className} style={{ width: "100%" }} />;
}
