"use client";

/**
 * The composed-command palette. Clicking an entry **fills the prompt** — it
 * never executes. The learner still presses Enter, so their fingers still
 * produce `git add README.md` and the skill transfers to a real shell, while
 * the memorisation wall in front of a blank prompt comes down.
 *
 * `{path}` and `{branch}` placeholders are substituted from live repo state so
 * the composed line is runnable rather than a template to hand-edit.
 */

import { useState } from "react";
import type { RepoState } from "./protocol";

interface Entry {
  label: string;
  template: string;
  /** Hidden when the repo cannot support it, so the palette never lies. */
  when?: (s: RepoState) => boolean;
}

interface Group {
  name: string;
  entries: Entry[];
}

const hasChanges = (s: RepoState) =>
  s.files.some((f) => f.workdir !== f.stage || f.stage !== f.head);
const hasStaged = (s: RepoState) => s.files.some((f) => f.stage !== f.head);
const hasCommits = (s: RepoState) => s.commits.length > 0;
const hasOtherBranch = (s: RepoState) => s.branches.some((b) => b !== s.head.branch);

const GROUPS: Group[] = [
  {
    name: "Start",
    entries: [
      { label: "Create a repository", template: "git init", when: (s) => !s.initialized },
      { label: "Check the status", template: "git status", when: (s) => s.initialized },
      {
        label: "Create a file",
        template: `printf 'hello\\n' > notes.txt`,
      },
    ],
  },
  {
    name: "Stage and commit",
    entries: [
      { label: "Stage one file", template: "git add {path}", when: hasChanges },
      { label: "Stage everything", template: "git add .", when: hasChanges },
      { label: "Unstage a file", template: "git restore --staged {path}", when: hasStaged },
      { label: "Commit", template: `git commit -m "Describe the change"`, when: hasStaged },
    ],
  },
  {
    name: "Inspect",
    entries: [
      { label: "Compact history", template: "git log --oneline", when: hasCommits },
      { label: "Unstaged changes", template: "git diff", when: hasChanges },
      { label: "Staged changes", template: "git diff --staged", when: hasStaged },
      { label: "What HEAD points at", template: "cat .git/HEAD", when: (s) => s.initialized },
      { label: "Read a commit object", template: "git cat-file -p HEAD", when: hasCommits },
      { label: "Look inside .git", template: "ls .git", when: (s) => s.initialized },
    ],
  },
  {
    name: "Branch and merge",
    entries: [
      { label: "List branches", template: "git branch", when: hasCommits },
      { label: "New branch", template: "git checkout -b feature", when: hasCommits },
      { label: "Switch branch", template: "git checkout {branch}", when: hasOtherBranch },
      { label: "Merge a branch", template: "git merge {branch}", when: hasOtherBranch },
    ],
  },
];

function fill(template: string, state: RepoState): string {
  const path =
    state.files.find((f) => f.workdir !== f.stage)?.path ?? state.tree[0] ?? "README.md";
  const branch = state.branches.find((b) => b !== state.head.branch) ?? "main";
  return template.replace("{path}", path).replace("{branch}", branch);
}

export function CommandPalette({
  state,
  onCompose,
}: {
  state: RepoState;
  onCompose: (command: string) => void;
}) {
  const [open, setOpen] = useState(true);

  return (
    <section className="git-panel git-palette">
      <header className="git-panel-head">
        <h2>Commands</h2>
        <button
          type="button"
          className="git-panel-toggle"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          {open ? "Hide" : "Show"}
        </button>
      </header>

      {open && (
        <>
          <p className="git-palette-note">Fills the prompt. You press Enter.</p>
          <div className="git-palette-groups">
            {GROUPS.map((group) => {
              const entries = group.entries.filter((e) => !e.when || e.when(state));
              if (!entries.length) return null;
              return (
                <div key={group.name} className="git-palette-group">
                  <h3>{group.name}</h3>
                  <ul>
                    {entries.map((entry) => (
                      <li key={entry.label}>
                        <button
                          type="button"
                          className="git-palette-btn"
                          onClick={() => onCompose(fill(entry.template, state))}
                          title={fill(entry.template, state)}
                        >
                          <span className="git-palette-label">{entry.label}</span>
                          <code className="git-palette-cmd">{fill(entry.template, state)}</code>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
