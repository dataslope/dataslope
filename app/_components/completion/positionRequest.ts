// Builds the cursor snapshot the runtime-backed sources send: the document
// with the surface's read-only init code prepended (so whole-file analyzers
// see the names it defines), and the cursor mapped into that text.

import type { EditorState } from "@codemirror/state";

import type { PositionRequest } from "../types";

export interface PositionContext {
  /** Read-only init code prepended to the doc; read per request so tab
   *  switches don't require an editor reconfigure. */
  getContextPrefix?: () => string;
  /** Active workspace-relative filename, for multi-file surfaces. */
  getFilename?: () => string | undefined;
}

export function buildPositionRequest(
  state: EditorState,
  pos: number,
  ctx: PositionContext,
): PositionRequest {
  const cursorLine = state.doc.lineAt(pos);
  const prefix = ctx.getContextPrefix?.() ?? "";
  const prefixBlock = prefix.trim() ? `${prefix.trimEnd()}\n` : "";
  return {
    doc: prefixBlock + state.doc.toString(),
    offset: prefixBlock.length + pos,
    line: cursorLine.text,
    column: pos - cursorLine.from,
    lineNumber:
      cursorLine.number + (prefixBlock ? prefixBlock.split("\n").length - 1 : 0),
    filename: ctx.getFilename?.(),
  };
}
