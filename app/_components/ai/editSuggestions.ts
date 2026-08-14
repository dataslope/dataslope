"use client";

/**
 * "Apply AI suggestions to the editor" plumbing for the Ask AI panel. The
 * system prompt (lib/ai/prompt.ts) has the model emit complete file contents
 * in fenced blocks tagged `file=<filename>`; `parseAiEditSuggestions` extracts
 * them, and a small registry bridges the global widget to the mounted
 * playground's diff-review handler by adapter id.
 */

export interface AiEditSuggestion {
  /** Target filename exactly as tagged by the model, e.g. "App.tsx". */
  filename: string;
  /** Proposed complete file contents. */
  content: string;
}

// ```lang file=name.ext, the tag may appear anywhere in the info string
// after the fence; the filename runs to the next whitespace or backtick.
const FENCE_RE = /^```[^\n`]*?\bfile=([^\s`]+)[^\n`]*\n([\s\S]*?)^```[ \t]*$/gm;

/** Longest-match sanity caps so a malformed answer can't wedge the panel. */
const MAX_SUGGESTIONS = 8;
const MAX_FILENAME = 200;

/**
 * Extracts `file=`-tagged code blocks from an assistant message. When the
 * model revises the same file twice in one answer, the LAST block wins
 * (it's the model's final word on that file).
 */
export function parseAiEditSuggestions(markdown: string): AiEditSuggestion[] {
  if (!markdown || !markdown.includes("file=")) return [];
  const byFile = new Map<string, string>();
  FENCE_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = FENCE_RE.exec(markdown)) !== null) {
    const filename = match[1].trim().slice(0, MAX_FILENAME);
    if (!filename) continue;
    // Strip exactly one trailing newline, the fence terminator's, so the
    // proposed contents round-trip byte-identical to what the model wrote.
    const content = match[2].replace(/\n$/, "");
    byFile.set(filename, content);
    if (byFile.size >= MAX_SUGGESTIONS) break;
  }
  return [...byFile].map(([filename, content]) => ({ filename, content }));
}

// ---------------------------------------------------------------------------
// Widget ⇄ playground bridge
// ---------------------------------------------------------------------------

export type AiEditResult =
  | { ok: true }
  | { ok: false; reason: "unavailable" | "busy" | "unchanged" };

type AiEditHandler = (suggestion: AiEditSuggestion) => AiEditResult;

const handlers = new Map<string, AiEditHandler>();

/** Playground-side: register the "open a diff review in my editor" handler.
 *  Returns the unregister cleanup for the mounting effect. */
export function registerAiEditHandler(
  adapterId: string,
  handler: AiEditHandler,
): () => void {
  handlers.set(adapterId, handler);
  return () => {
    if (handlers.get(adapterId) === handler) handlers.delete(adapterId);
  };
}

/** True when a playground that can host the diff review is mounted. */
export function hasAiEditHandler(adapterId: string | undefined): boolean {
  return Boolean(adapterId && handlers.has(adapterId));
}

/** Widget-side: ask the mounted playground to open the diff review. */
export function requestAiEdit(
  adapterId: string | undefined,
  suggestion: AiEditSuggestion,
): AiEditResult {
  const handler = adapterId ? handlers.get(adapterId) : undefined;
  if (!handler) return { ok: false, reason: "unavailable" };
  return handler(suggestion);
}
