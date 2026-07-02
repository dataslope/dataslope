"use client";

/**
 * Entry-focus policy shared by every playground's editor.
 *
 * On the FIRST focus after a playground mounts ("entering" the playground):
 * - Desktop viewports focus the editor with the cursor at the END of the
 *   restored code, ready to continue typing where the work left off.
 * - Mobile viewports skip the focus entirely — focusing CodeMirror pops the
 *   on-screen keyboard, which covers a large share of the screen before the
 *   user has asked to type.
 *
 * Subsequent tab/file operations keep focusing unconditionally in the
 * playgrounds (they're user-initiated, so the keyboard is expected).
 */

import type { EditorView } from "@codemirror/view";

/** Matches the stylesheet's mobile breakpoint (playground.css and
 *  SqlPlaygroundShell both key off `max-width: 768px`). */
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
