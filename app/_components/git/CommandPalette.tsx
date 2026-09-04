"use client";

/**
 * The composed-command palette. Clicking an entry **fills the prompt** — it
 * never executes. The learner still presses Enter, so their fingers still
 * produce `git add README.md` and the skill transfers to a real shell, while
 * the memorisation wall in front of a blank prompt comes down.
 *
 * `{path}` and `{branch}` placeholders are substituted from live repo state so
 * the composed line is runnable rather than a template to hand-edit.
 *
 * Every class here is `gitx-palette-*` and has a rule in gitPlayground.css;
 * a stylesheet test pins the two together, because an earlier rename left
 * the markup with classes no stylesheet knew.
 */

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
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
const hasParent = (s: RepoState) => s.commits.length > 1;
const hasOtherBranch = (s: RepoState) => s.branches.some((b) => b !== s.head.branch);

export const PALETTE_GROUPS: Group[] = [
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
      { label: "Stage and commit tracked changes", template: `git commit -am "Describe the change"`, when: hasChanges },
    ],
  },
  {
    name: "Inspect",
    entries: [
      { label: "Compact history", template: "git log --oneline", when: hasCommits },
      { label: "History of every branch", template: "git log --oneline --all --graph", when: hasOtherBranch },
      { label: "Unstaged changes", template: "git diff", when: hasChanges },
      { label: "Staged changes", template: "git diff --staged", when: hasStaged },
      { label: "What the last commit changed", template: "git show --stat HEAD", when: hasCommits },
      { label: "Diff the last two commits", template: "git diff HEAD~1 HEAD", when: hasParent },
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
      { label: "Tag this commit", template: "git tag v1.0", when: hasCommits },
    ],
  },
  {
    name: "Undo",
    entries: [
      { label: "Discard a file's edits", template: "git restore {path}", when: (s) => s.files.some((f) => f.workdir !== f.stage && f.stage !== 0) },
      { label: "Undo the last commit, keep the work", template: "git reset --soft HEAD~1", when: hasParent },
      { label: "Throw the last commit away", template: "git reset --hard HEAD~1", when: hasParent },
    ],
  },
];

export function fillTemplate(template: string, state: RepoState): string {
  const path =
    state.files.find((f) => f.workdir !== f.stage)?.path ?? state.tree[0] ?? "README.md";
  const branch = state.branches.find((b) => b !== state.head.branch) ?? "main";
  return template.replace("{path}", path).replace("{branch}", branch);
}

export function CommandPalette({
  state,
  onCompose,
  onClose,
}: {
  state: RepoState;
  onCompose: (command: string) => void;
  /** Close the palette: the Close button, and Escape anywhere inside it. */
  onClose: () => void;
}) {
  const first = useRef<HTMLButtonElement>(null);

  // A dialog takes focus when it opens, so the keyboard is in it and Escape
  // reaches it; the host puts focus back on the prompt when it closes.
  useEffect(() => {
    first.current?.focus({ preventScroll: true });
  }, []);

  return (
    <section
      className="gitx-palette-panel"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <header className="gitx-palette-head">
        <h2 className="gitx-palette-title">All commands</h2>
        <button type="button" className="gitx-btn quiet small" onClick={onClose} aria-label="Close the command list">
          <X size={14} aria-hidden="true" />
        </button>
      </header>
      <p className="gitx-palette-note">Fills the prompt. You press Enter.</p>
      <div className="gitx-palette-groups">
        {PALETTE_GROUPS.map((group, gi) => {
          const entries = group.entries.filter((e) => !e.when || e.when(state));
          if (!entries.length) return null;
          return (
            <div key={group.name} className="gitx-palette-group">
              <h3>{group.name}</h3>
              <ul className="gitx-palette-list">
                {entries.map((entry, ei) => {
                  const command = fillTemplate(entry.template, state);
                  return (
                    <li key={entry.label}>
                      <button
                        type="button"
                        className="gitx-palette-btn"
                        ref={gi === 0 && ei === 0 ? first : undefined}
                        onClick={() => onCompose(command)}
                        title={command}
                      >
                        <span className="gitx-palette-label">{entry.label}</span>
                        <code className="gitx-palette-cmd">{command}</code>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
