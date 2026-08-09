"use client";

/**
 * The one Plotly surface every output panel renders charts through.
 *
 * This used to be two hand-copied components, one in `Playground.tsx` and one
 * in `CodeBlock.tsx`, with a comment on each saying they were kept in sync by
 * hand. `ChallengeCard.tsx` had neither: its `OutputCellView` is a trimmed
 * copy of `<CodeBlock>`'s renderer and never grew a `plot` branch, so a
 * `fig.show()` inside a challenge fell through to the text fallback and
 * printed `fig.to_json()` into the output panel as a wall of escaped JSON.
 * Three renderers with a copy each is how that happens, so there is now one.
 *
 * Plotly is ~4 MB and only needed once a chart actually renders, so it is
 * imported from the CDN on demand rather than bundled (see PLOTLY_CDN in
 * runtime/cdn). The dynamic import is marked ignore for both bundlers so it
 * stays out of the client bundle and out of the OpenNext Worker bundle.
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
      // `animation_frame=` puts the play button and the slider in `layout`
      // and the thing they animate in `frames`, which newPlot's positional
      // form has no parameter for. Without this the controls draw, and both
      // the play button and the slider are inert: their handlers look up
      // frames by name and find none registered on the graph.
      if (cancelled || !ref.current) return;
      if (figure.frames?.length) await Plotly.addFrames(el, figure.frames);
    })();
    return () => {
      cancelled = true;
    };
  }, [figure]);
  return <div ref={ref} className={className} style={{ width: "100%" }} />;
}
