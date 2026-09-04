/**
 * Declarative grading for Git challenges.
 *
 * The stdout-shaped `StdoutExpect` in `challengeHarness.ts` does not fit here:
 * the interesting outcome of `git commit` is not what it printed. These
 * assertions read repo state instead, which is cheap enough to evaluate after
 * every command — so a card's objectives can flip live rather than only when
 * the learner presses Check.
 *
 * Isomorphic (no DOM), so tests and the card share one implementation.
 */

import type { RepoState } from "./protocol";

export interface GitExpect {
  /** HEAD is on this branch. */
  headBranch?: string;
  /** Exactly this many commits reachable across all branches. */
  commitCount?: number;
  /** At least this many commits. */
  minCommits?: number;
  /** The tip commit's message matches this regex (string, since MDX cannot
   *  express a literal RegExp). */
  commitMessageMatches?: string;
  /** Any commit's message matches. */
  anyCommitMessageMatches?: string;
  /** These paths are staged (index differs from HEAD). */
  staged?: string[];
  /** These paths have unstaged working-tree changes. */
  unstaged?: string[];
  /** Nothing staged and nothing modified. */
  clean?: boolean;
  /** These branches exist. */
  branchesExist?: string[];
  /** This branch does not exist. */
  branchAbsent?: string;
  /** These paths exist in the working tree. */
  filesExist?: string[];
  /** HEAD is detached. */
  isDetached?: boolean;
  /** Shape of the commit graph. */
  graphShape?: "linear" | "merged";
  /** A repository exists at all. */
  initialized?: boolean;
}

const isStaged = (s: RepoState, path: string) =>
  s.files.some((f) => f.path === path && f.stage !== f.head);

const isUnstaged = (s: RepoState, path: string) =>
  s.files.some((f) => f.path === path && f.workdir !== f.stage);

/** One human-readable reason per failed assertion, most useful first. */
export function explainGitExpect(expect: GitExpect, state: RepoState): string | null {
  if (expect.initialized !== undefined && state.initialized !== expect.initialized) {
    return expect.initialized ? "No repository yet." : "A repository already exists.";
  }
  if (expect.headBranch !== undefined && state.head.branch !== expect.headBranch) {
    return `HEAD is on ${state.head.branch ?? "no branch"}, expected ${expect.headBranch}.`;
  }
  if (expect.isDetached !== undefined && state.head.detached !== expect.isDetached) {
    return expect.isDetached ? "HEAD is not detached." : "HEAD is detached.";
  }
  if (expect.commitCount !== undefined && state.commits.length !== expect.commitCount) {
    return `${state.commits.length} commits, expected ${expect.commitCount}.`;
  }
  if (expect.minCommits !== undefined && state.commits.length < expect.minCommits) {
    return `${state.commits.length} commits, expected at least ${expect.minCommits}.`;
  }
  if (expect.commitMessageMatches !== undefined) {
    const tip = state.commits[0]?.message ?? "";
    if (!new RegExp(expect.commitMessageMatches, "i").test(tip)) {
      return tip ? `The latest commit message is "${tip}".` : "There are no commits yet.";
    }
  }
  if (expect.anyCommitMessageMatches !== undefined) {
    const re = new RegExp(expect.anyCommitMessageMatches, "i");
    if (!state.commits.some((c) => re.test(c.message))) {
      return "No commit message matches yet.";
    }
  }
  for (const path of expect.branchesExist ?? []) {
    if (!state.branches.includes(path)) return `Branch ${path} does not exist.`;
  }
  if (expect.branchAbsent !== undefined && state.branches.includes(expect.branchAbsent)) {
    return `Branch ${expect.branchAbsent} still exists.`;
  }
  for (const path of expect.staged ?? []) {
    if (!isStaged(state, path)) return `${path} is not staged.`;
  }
  for (const path of expect.unstaged ?? []) {
    if (!isUnstaged(state, path)) return `${path} has no unstaged changes.`;
  }
  for (const path of expect.filesExist ?? []) {
    if (!state.tree.includes(path)) return `${path} is not in the working tree.`;
  }
  if (expect.clean) {
    const dirty = state.files.filter((f) => f.workdir !== f.stage || f.stage !== f.head);
    if (dirty.length) return `${dirty.map((f) => f.path).join(", ")} still has changes.`;
  }
  if (expect.graphShape !== undefined) {
    const merged = state.commits.some((c) => c.parents.length > 1);
    if (expect.graphShape === "merged" && !merged) return "No merge commit yet.";
    if (expect.graphShape === "linear" && merged) return "The history contains a merge commit.";
  }
  return null;
}

export const satisfiesGitExpect = (expect: GitExpect, state: RepoState): boolean =>
  explainGitExpect(expect, state) === null;

/** One-line summary of what an assertion checks, for the details popover. */
export function gitExpectSummary(expect: GitExpect): string {
  const parts: string[] = [];
  if (expect.initialized !== undefined) parts.push(expect.initialized ? "repository exists" : "no repository");
  if (expect.headBranch) parts.push(`HEAD on ${expect.headBranch}`);
  if (expect.isDetached !== undefined) parts.push(expect.isDetached ? "HEAD detached" : "HEAD attached");
  if (expect.commitCount !== undefined) parts.push(`${expect.commitCount} commits`);
  if (expect.minCommits !== undefined) parts.push(`at least ${expect.minCommits} commits`);
  if (expect.commitMessageMatches) parts.push(`latest message matches /${expect.commitMessageMatches}/i`);
  if (expect.anyCommitMessageMatches) parts.push(`a message matches /${expect.anyCommitMessageMatches}/i`);
  if (expect.branchesExist?.length) parts.push(`branches: ${expect.branchesExist.join(", ")}`);
  if (expect.branchAbsent) parts.push(`no branch ${expect.branchAbsent}`);
  if (expect.staged?.length) parts.push(`staged: ${expect.staged.join(", ")}`);
  if (expect.unstaged?.length) parts.push(`unstaged: ${expect.unstaged.join(", ")}`);
  if (expect.filesExist?.length) parts.push(`files: ${expect.filesExist.join(", ")}`);
  if (expect.clean) parts.push("working tree clean");
  if (expect.graphShape) parts.push(`${expect.graphShape} history`);
  return parts.join("\n");
}

/** One objective on a challenge card. */
export interface GitObjective {
  id: string;
  name: string;
  description?: string;
  expect: GitExpect;
}
