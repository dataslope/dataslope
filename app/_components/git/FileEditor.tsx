"use client";

/**
 * The working-directory editor, opened over the Changes pane when a chip is
 * clicked. A plain textarea on purpose: this is a supporting surface, and
 * every *Git* operation still goes through a typed command.
 *
 * Editing a file is exempt from the terminal-only rule, which is also why
 * the conflict toolbar lives here: keeping "mine" or "theirs" edits the
 * reader's file, not the repository. The raw markers stay the default view,
 * because a reader who has seen them once is not frightened of them twice.
 *
 * Nothing typed here is ever lost to navigation: the draft is written to the
 * working directory when the textarea loses focus and when the reader goes
 * back to the Changes pane. Ctrl+S and the Save button save on demand; a
 * phone, which has neither, still gets the autosave.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Save } from "lucide-react";
import type { CommandResult } from "./gitRuntime";
import { hasConflictMarkers, resolveConflicts } from "./repoFacts";

interface Props {
  path: string;
  /** The state word shown beside the name, in the reader's vocabulary. */
  word: string;
  merging: string | null;
  busy: boolean;
  readFile: (path: string) => Promise<CommandResult>;
  writeFile: (path: string, content: string) => Promise<CommandResult>;
  /** Called after a successful save so the host can record it for Undo. */
  onSaved: (path: string, content: string) => void;
  onClose: () => void;
}

export function FileEditor({ path, word, merging, busy, readFile, writeFile, onSaved, onClose }: Props) {
  const [draft, setDraft] = useState("");
  const [loaded, setLoaded] = useState("");
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void readFile(path).then((r) => {
      if (cancelled) return;
      setDraft(r.content ?? "");
      setLoaded(r.content ?? "");
      setNote(null);
    });
    return () => {
      cancelled = true;
    };
  }, [path, readFile]);

  const dirty = draft !== loaded;
  /** The latest draft, for the save that runs as the editor is left. */
  const latest = useRef({ draft, loaded });
  useEffect(() => {
    latest.current = { draft, loaded };
  }, [draft, loaded]);

  const save = useCallback(async () => {
    const result = await writeFile(path, draft);
    if (result.exitCode !== 0) {
      setNote(result.stderr.trim());
      return;
    }
    setLoaded(draft);
    setNote("Saved.");
    onSaved(path, draft);
    setTimeout(() => setNote(null), 1500);
  }, [draft, onSaved, path, writeFile]);

  /** Save whatever is unsaved, silently; used on blur and on leaving. */
  const flush = useCallback(async () => {
    const { draft: d, loaded: l } = latest.current;
    if (d === l) return;
    const result = await writeFile(path, d);
    if (result.exitCode !== 0) {
      setNote(result.stderr.trim());
      return;
    }
    setLoaded(d);
    onSaved(path, d);
  }, [onSaved, path, writeFile]);

  const close = useCallback(() => {
    void flush();
    onClose();
  }, [flush, onClose]);

  const conflicted = merging !== null && hasConflictMarkers(draft);

  return (
    <div className="gitx-editor">
      <header className="gitx-editor-head">
        <button type="button" className="gitx-btn quiet" onClick={close}>
          <ArrowLeft size={14} aria-hidden="true" />
          <span>Changes</span>
        </button>
        <span className="gitx-editor-name">
          <code>{path}</code>
          {word && <small>{word}</small>}
        </span>
        <span className="gitx-editor-sep" />
        <button
          type="button"
          className={dirty ? "gitx-btn primary" : "gitx-btn"}
          onClick={() => void save()}
          disabled={!dirty || busy}
        >
          <Save size={14} aria-hidden="true" />
          <span>{dirty ? "Save" : "Saved"}</span>
        </button>
      </header>

      {conflicted && (
        <div className="gitx-conflict-tools" role="group" aria-label="Resolve the conflict">
          <span>
            Both branches changed this. Keep the lines you want, then <code>git add</code> it.
          </span>
          <span className="gitx-conflict-btns">
            <button type="button" className="gitx-btn" onClick={() => setDraft(resolveConflicts(draft, "mine"))}>
              Keep mine
            </button>
            <button type="button" className="gitx-btn" onClick={() => setDraft(resolveConflicts(draft, "theirs"))}>
              Keep {merging}
            </button>
            <button type="button" className="gitx-btn" onClick={() => setDraft(resolveConflicts(draft, "both"))}>
              Keep both
            </button>
          </span>
        </div>
      )}

      <textarea
        className={`gitx-editor-area${conflicted ? " conflicted" : ""}`}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => void flush()}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "s") {
            e.preventDefault();
            if (dirty && !busy) void save();
          }
        }}
        spellCheck={false}
        aria-label={`Contents of ${path}`}
      />
      <p className="gitx-editor-note">
        {note ?? (dirty ? "Unsaved. Saved when you leave, or press Ctrl+S." : "Edits here change the working directory only.")}
      </p>
    </div>
  );
}
