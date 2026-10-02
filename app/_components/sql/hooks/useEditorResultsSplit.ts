"use client";

import { useEffect, useState, type CSSProperties, type RefObject } from "react";
import {
  clampEditorFraction,
  editorSplitProperties,
  editorSplitStyle,
  readEditorFraction,
} from "../utils/editorSplit";

interface EditorResultsSplitRefs {
  resizer: RefObject<HTMLElement | null>;
  panes: RefObject<HTMLElement | null>;
  editorPane: RefObject<HTMLElement | null>;
  resultsPane: RefObject<HTMLElement | null>;
}

/** Drag-to-resize for the handle between the SQL editor and its results.
 *  Returns the style to spread onto the `.sql-panes` element.
 *
 *  The split lives in React state (hydrated from `storageKey`) so that it is
 *  re-applied by render, not left on the DOM by a drag: switching to a table
 *  view, an ER diagram, query history or settings and back, remounting the
 *  playground, or reloading the page all come back to the same split. While
 *  a drag is in flight the properties are written straight to the element,
 *  so a mousemove never re-renders the playground; the final value is
 *  committed to state, and persisted, on mouseup. */
export function useEditorResultsSplit(
  refs: EditorResultsSplitRefs,
  storageKey: string,
): CSSProperties | undefined {
  // The SQL playgrounds are client-only (`ssr: false`), so reading
  // localStorage during the first render cannot cause a hydration mismatch,
  // and doing it here avoids a frame painted at the default split.
  const [fraction, setFraction] = useState<number | null>(() =>
    readEditorFraction(storageKey),
  );

  const { resizer: resizerRef, panes: panesRef } = refs;
  const { editorPane: editorPaneRef, resultsPane: resultsPaneRef } = refs;

  useEffect(() => {
    const resizer = resizerRef.current;
    const panes = panesRef.current;
    const editorPane = editorPaneRef.current;
    const resultsPane = resultsPaneRef.current;
    if (!resizer || !panes || !editorPane || !resultsPane) return;
    let dragging = false;
    let startY = 0;
    let startEditorH = 0;
    let startResultsH = 0;
    let dragged: number | null = null;
    const onDown = (e: MouseEvent) => {
      dragging = true;
      dragged = null;
      startY = e.clientY;
      startEditorH = editorPane.offsetHeight;
      startResultsH = resultsPane.offsetHeight;
      resizer.classList.add("dragging");
      document.body.style.cursor = "row-resize";
      document.body.style.userSelect = "none";
    };
    const onMove = (e: MouseEvent) => {
      if (!dragging) return;
      const total = startEditorH + startResultsH;
      if (total <= 0) return;
      const dy = e.clientY - startY;
      dragged = clampEditorFraction((startEditorH + dy) / total);
      for (const [name, value] of Object.entries(editorSplitProperties(dragged))) {
        panes.style.setProperty(name, value);
      }
    };
    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      resizer.classList.remove("dragging");
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      if (dragged == null) return;
      setFraction(dragged);
      try {
        localStorage.setItem(storageKey, String(dragged));
      } catch {
        // ignore
      }
    };
    resizer.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      resizer.removeEventListener("mousedown", onDown);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [resizerRef, panesRef, editorPaneRef, resultsPaneRef, storageKey]);

  return editorSplitStyle(fraction);
}
