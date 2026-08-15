"use client";

/**
 * Entry-focus policy for playground editors. On first focus after mount,
 * desktop focuses the editor with the cursor at the end; mobile skips the
 * focus so the on-screen keyboard doesn't pop before the user asks to type.
 * Later tab/file operations focus unconditionally (user-initiated).
 */

import type { EditorView } from "@codemirror/view";

/** Keep in sync with the stylesheets' `max-width: 768px` mobile breakpoint. */
export function isMobileViewport(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(max-width: 768px)").matches
  );
}

/** First-load focus: no-op on mobile; on desktop, land the cursor at the
 *  end of the document (scrolled into view) and focus the editor. */
export function applyEntryFocus(view: EditorView): void {
  if (isMobileViewport()) return;
  view.dispatch({
    selection: { anchor: view.state.doc.length },
    scrollIntoView: true,
  });
  view.focus();
}
