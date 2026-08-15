"use client";

/**
 * The working tree, with a plain textarea editor. File editing is exempt from
 * the terminal-only rule — that is the working tree, not Git — but every
 * *Git* operation still goes through a typed command.
 *
 * Deliberately a textarea rather than CodeMirror: this pane is a supporting
 * surface, and pulling the editor graph in for it would cost far more than it
 * teaches. Rejected writes (the size caps) surface inline.
 */

import { useState } from "react";
import { FilePlus2, Save } from "lucide-react";
import type { RepoState } from "./protocol";
import type { CommandResult } from "./useGitWorker";

interface Props {
  state: RepoState;
  busy: boolean;
  readFile: (path: string) => Promise<CommandResult>;
  writeFile: (path: string, content: string) => Promise<CommandResult>;
  onRefresh: () => void;
}

export function WorkingTree({ state, busy, readFile, writeFile, onRefresh }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [loaded, setLoaded] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  // Derived, not synced: a file deleted from under us simply stops being the
  // active one on the next render.
  const active = selected && state.tree.includes(selected) ? selected : null;

  async function open(path: string) {
    setSelected(path);
    setMessage(null);
    const result = await readFile(path);
    setDraft(result.content ?? "");
    setLoaded(result.content ?? "");
  }

  async function save() {
    if (!active) return;
    const result = await writeFile(active, draft);
    if (result.exitCode !== 0) {
      setMessage(result.stderr.trim());
      return;
    }
    setLoaded(draft);
    setMessage("Saved");
    onRefresh();
    setTimeout(() => setMessage(null), 1500);
  }

  async function create() {
    const name = window.prompt("New file name", "notes.txt");
    if (!name) return;
    const clean = name.replace(/^\/+/, "").trim();
    if (!clean) return;
    const result = await writeFile(clean, "");
    if (result.exitCode !== 0) {
      setMessage(result.stderr.trim());
      return;
    }
    onRefresh();
    void open(clean);
  }

  const dirty = active !== null && draft !== loaded;

  return (
    <section className="git-panel git-files">
      <header className="git-panel-head">
        <h2>Working tree</h2>
        <button type="button" className="git-panel-toggle" onClick={() => void create()} disabled={busy}>
          <FilePlus2 size={13} aria-hidden="true" />
          <span>New</span>
        </button>
      </header>

      {state.tree.length === 0 ? (
        <p className="git-panel-empty">
          Empty. Create a file above, or run{" "}
          <code>printf &apos;hi\n&apos; &gt; notes.txt</code> in the terminal.
        </p>
      ) : (
        <ul className="git-file-list">
          {state.tree.map((path) => {
            const status = state.files.find((f) => f.path === path);
            const modified = status ? status.workdir !== status.stage : false;
            const staged = status ? status.stage !== status.head : false;
            return (
              <li key={path}>
                <button
                  type="button"
                  className={active === path ? "git-file active" : "git-file"}
                  onClick={() => void open(path)}
                >
                  <span
                    className={`git-file-mark${staged ? " staged" : ""}${modified ? " modified" : ""}`}
                    aria-hidden="true"
                  />
                  <span className="git-file-name">{path}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {active && (
        <div className="git-editor">
          <div className="git-editor-head">
            <code>{active}</code>
            <button type="button" className="git-panel-toggle" onClick={() => void save()} disabled={!dirty}>
              <Save size={13} aria-hidden="true" />
              <span>{dirty ? "Save" : "Saved"}</span>
            </button>
          </div>
          <textarea
            className="git-editor-area"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            spellCheck={false}
            aria-label={`Contents of ${active}`}
          />
          {message && <p className="git-editor-msg">{message}</p>}
        </div>
      )}
    </section>
  );
}
