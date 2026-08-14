/**
 * The wire shape Python hands back after a run, and its conversion into
 * `OutputCell`s. Both producers (pyodide-worker.ts at run time,
 * scripts/build-block-outputs.mjs at build time) come through here, so a
 * prepopulated panel and a freshly-run one render identically.
 */
import type { OutputCell, PlotlyFigure } from "../types";

export interface PyDisplayDataframe { type: "dataframe"; html: string }
export interface PyDisplayHtml { type: "html"; html: string }
export interface PyDisplayImage { type: "image"; data: string }
export interface PyDisplayStdout { type: "stdout"; text: string }
export interface PyDisplayStderr { type: "stderr"; text: string }
export interface PyDisplayPlot { type: "plot"; json: string }

export type PyDisplayOutput =
  | PyDisplayDataframe
  | PyDisplayHtml
  | PyDisplayImage
  | PyDisplayStdout
  | PyDisplayStderr
  | PyDisplayPlot;

export function isPyDisplayOutputs(v: unknown): v is PyDisplayOutput[] {
  return Array.isArray(v);
}

/** An output cell before the surface stamps an id and elapsed time. */
export type BareOutputCell = Omit<OutputCell, "id" | "elapsed">;

/**
 * Convert one Python-side output list into cells. Empty text segments are
 * dropped; a figure whose JSON doesn't parse is skipped.
 */
export function toOutputCells(raw: unknown): BareOutputCell[] {
  if (!isPyDisplayOutputs(raw)) return [];
  const cells: BareOutputCell[] = [];
  for (const out of raw) {
    if (out.type === "dataframe" || out.type === "html") {
      cells.push({ type: "html", content: out.html });
    } else if (out.type === "image") {
      cells.push({ type: "image", content: out.data });
    } else if (out.type === "stdout" || out.type === "stderr") {
      const text = out.text.trim();
      if (text) cells.push({ type: out.type, content: text });
    } else if (out.type === "plot") {
      try {
        const fig = JSON.parse(out.json) as PlotlyFigure;
        cells.push({ type: "plot", content: out.json, plot: fig });
      } catch {
        /* malformed figure JSON, skip the cell */
      }
    }
  }
  return cells;
}
