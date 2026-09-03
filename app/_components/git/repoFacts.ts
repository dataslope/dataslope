/**
 * Pure derivations over `RepoState`, kept out of the components so they can
 * be tested without a DOM and reused by the playground and the blocks.
 *
 * Three questions the UI keeps asking: what changed since the last command
 * (`narrate`), what a reader would sensibly do next (`suggest`), and whether a
 * suggested step has been done (`stepDone`). Plus the two small facts the
 * conflict flow needs: which file is conflicted, and how to resolve markers.
 */

import type { FileStatus, RepoState } from "./protocol";

/**
 * A file is conflicted when a merge is in progress and both the index and
 * the working tree disagree with HEAD: the merge wrote the markers to the
 * file and left the index unresolved. That is also the shape `statusMatrix`
 * reports as "staged, then edited", which is why that label was wrong here.
 */
export const isConflicted = (f: FileStatus, merging: string | null): boolean =>
  merging !== null && f.stage !== f.head && f.workdir !== f.stage;

export const changedFiles = (s: RepoState): FileStatus[] =>
  s.files.filter((f) => f.workdir !== f.stage || f.stage !== f.head);
export const stagedFiles = (s: RepoState): FileStatus[] =>
  s.files.filter((f) => f.stage !== f.head);
export const unstagedFiles = (s: RepoState): FileStatus[] =>
  s.files.filter((f) => f.workdir !== f.stage);

const short = (oid: string | null | undefined) => (oid ? oid.slice(0, 7) : "?");

/**
 * One sentence about what the last command did, from the state before and
 * after it. This is what makes the chip animation legible to a reader who
 * blinked, and it replaces the scenario description that used to sit under
 * the prompt describing a starting state long since gone.
 *
 * Returns null when nothing worth saying changed (a `git status`, an `ls`).
 */
export function narrate(prev: RepoState, next: RepoState): string | null {
  if (!prev.initialized && next.initialized) return "Created an empty repository.";
  if (!next.initialized) return null;

  // The merge lifecycle first: it is what the reader most needs told.
  if (!prev.merging && next.merging) {
    const file = next.files.find((f) => isConflicted(f, next.merging));
    return file
      ? `Merge stopped: ${file.path} has a conflict.`
      : "Merge stopped on a conflict.";
  }
  const newest = next.commits[0];
  const committed = newest !== undefined && newest.oid !== prev.commits[0]?.oid;
  if (prev.merging && !next.merging) {
    return committed
      ? `Merged ${prev.merging} into ${next.head.branch ?? "HEAD"}.`
      : "Merge aborted.";
  }
  if (prev.merging && next.merging) {
    // Mid-merge, the thing worth saying is a conflict being marked resolved.
    const resolved = prev.files.find(
      (p) => isConflicted(p, prev.merging) && !next.files.some((n) => n.path === p.path && isConflicted(n, next.merging)),
    );
    if (resolved) {
      const left = next.files.filter((f) => isConflicted(f, next.merging)).length;
      return left
        ? `${resolved.path} marked as resolved. ${left} conflict${left === 1 ? "" : "s"} left.`
        : `${resolved.path} marked as resolved. Finish the merge with git commit.`;
    }
  }

  if (committed) {
    if (newest.parents.length > 1) {
      return `Merged into ${next.head.branch ?? "HEAD"} as ${short(newest.oid)}.`;
    }
    return next.head.branch
      ? `New commit ${short(newest.oid)} on ${next.head.branch}.`
      : `New commit ${short(newest.oid)}.`;
  }

  if (prev.head.branch !== next.head.branch || prev.head.detached !== next.head.detached) {
    if (next.head.detached) return `HEAD is detached at ${short(next.head.oid)}.`;
    if (next.head.branch) return `Switched to ${next.head.branch}.`;
  }
  const created = next.branches.find((b) => !prev.branches.includes(b));
  if (created) return `Created branch ${created}.`;
  const deleted = prev.branches.find((b) => !next.branches.includes(b));
  if (deleted) return `Deleted branch ${deleted}.`;

  const before = new Map(prev.files.map((f) => [f.path, f]));
  for (const f of next.files) {
    const p = before.get(f.path);
    const wasStaged = p ? p.stage !== p.head : false;
    const nowStaged = f.stage !== f.head;
    if (!wasStaged && nowStaged) return `${f.path} moved to the staging area.`;
    if (wasStaged && !nowStaged && f.workdir !== f.head) {
      return `${f.path} moved back to the working directory.`;
    }
    if (!p && f.head === 0) return `${f.path} appeared in the working directory.`;
    if (p && p.workdir !== 0 && f.workdir === 0) return `${f.path} was deleted from the working directory.`;
    if (p && p.workdir === 1 && f.workdir === 2) return `${f.path} changed in the working directory.`;
  }
  for (const p of prev.files) {
    if (!next.files.some((f) => f.path === p.path) && p.head === 0) {
      return `${p.path} was removed from the working directory.`;
    }
  }
  return null;
}

export interface Suggestion {
  label: string;
  command: string;
}

/**
 * The next few commands a reader would sensibly run from here, in order of
 * how likely they are to be what the reader wants. Every entry fills the
 * prompt rather than executing, so this is a hint, not an autopilot.
 */
export function suggest(state: RepoState, max = 3): Suggestion[] {
  const out: Suggestion[] = [];
  const push = (label: string, command: string) => {
    if (out.length < max && !out.some((s) => s.command === command)) out.push({ label, command });
  };

  if (state.merging) {
    const file = state.files.find((f) => isConflicted(f, state.merging));
    if (file) push(`Mark ${file.path} resolved`, `git add ${file.path}`);
    push("Finish the merge", `git commit -m "Merge ${state.merging}"`);
    push("Abort the merge", "git merge --abort");
    return out;
  }

  if (!state.initialized) {
    push("Create a repository", "git init");
    push("Create a file", `printf 'hello\\n' > notes.txt`);
    return out;
  }

  const unstaged = unstagedFiles(state);
  const staged = stagedFiles(state);
  const other = state.branches.find((b) => b !== state.head.branch);

  if (unstaged.length) {
    const f = unstaged[0];
    const untracked = f.head === 0 && f.stage === 0;
    push(untracked ? `Start tracking ${f.path}` : `Stage ${f.path}`, `git add ${f.path}`);
    if (unstaged.length > 1) push("Stage everything", "git add .");
    if (!untracked) push("See what changed", "git diff");
  }
  if (staged.length) {
    push("Commit these changes", `git commit -m "Describe the change"`);
    push(`Unstage ${staged[0].path}`, `git restore --staged ${staged[0].path}`);
    push("See what is staged", "git diff --staged");
  }
  if (!unstaged.length && !staged.length) {
    if (state.commits.length) {
      push("See the history", "git log --oneline --all");
      if (other) {
        push(`Switch to ${other}`, `git checkout ${other}`);
        push(`Merge ${other} in`, `git merge ${other}`);
      } else {
        push("Start a branch", "git checkout -b feature");
      }
      push("Create a file", `printf 'hello\\n' > notes.txt`);
    } else if (state.tree.length) {
      push("Stage everything", "git add .");
    } else {
      push("Create a file", `printf 'hello\\n' > notes.txt`);
    }
  }
  return out;
}

/**
 * The shape of a command that decides whether it matches a suggested step:
 * the git subcommand, plus its target for the ones where the target is the
 * point (`checkout feature` is not `checkout main`). For everything else the
 * first word is enough, so `printf` with any redirect counts as "create a
 * file".
 */
export function stepKey(command: string): string {
  const t = command.trim().split(/\s+/);
  if (t[0] !== "git") return t[0] ?? "";
  const sub = t[1] ?? "";
  if (["checkout", "switch", "merge"].includes(sub)) {
    const target = t.slice(2).find((w) => !w.startsWith("-")) ?? "";
    return `git ${sub} ${target}`;
  }
  return `git ${sub}`;
}

export const stepDone = (step: { command: string }, history: string[]): boolean => {
  const key = stepKey(step.command);
  return history.some((h) => stepKey(h) === key);
};

/**
 * Resolve every conflict block in a file by keeping one side, or both. The
 * markers are the three Git writes, in order; anything outside them is left
 * alone. This edits the working directory, which is exempt from the
 * terminal-only rule: the file is the reader's, the repository is Git's.
 */
export function resolveConflicts(text: string, keep: "mine" | "theirs" | "both"): string {
  const block = /<<<<<<< [^\n]*\n([\s\S]*?)=======\n([\s\S]*?)>>>>>>> [^\n]*\n?/g;
  return text.replace(block, (_m, mine: string, theirs: string) =>
    keep === "mine" ? mine : keep === "theirs" ? theirs : mine + theirs,
  );
}

export const hasConflictMarkers = (text: string): boolean =>
  /^<<<<<<< /m.test(text) && /^>>>>>>> /m.test(text);
