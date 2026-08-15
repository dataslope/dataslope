/**
 * `GitExpect` graded against real repository state: each case drives the same
 * shell the cards drive, then asserts what a card's objective would conclude.
 * Guards the property the live checklist depends on, that an objective flips
 * exactly when the repository satisfies it.
 */

import { describe, it, expect } from "vitest";
import { Bash, defineCommand } from "just-bash/browser";
import git from "isomorphic-git";
import { createGitFs } from "@/app/_components/git/gitFs";
import { createGitCommand } from "@/app/_components/git/gitCommand";
import { runCommand } from "@/app/_components/git/runCommand";
import { scenarioById } from "@/app/_components/git/scenarios";
import {
  explainGitExpect,
  gitExpectSummary,
  satisfiesGitExpect,
  type GitExpect,
} from "@/app/_components/git/gitExpect";
import { EMPTY_STATE, type CommitNode, type RepoState } from "@/app/_components/git/protocol";

const REPO = "/repo";

/** Mirrors the worker's readState, so the tests grade what a card grades. */
async function harness(scenarioId: string) {
  const { store, fs } = createGitFs();
  const clock = { commits: 0 };
  const bash = new Bash({
    fs: store as never,
    cwd: REPO,
    customCommands: [defineCommand("git", createGitCommand({ fs, dir: REPO, clock }))],
  });
  await store.mkdir(REPO, { recursive: true });

  const run = (cmd: string) => runCommand(bash, cmd);
  for (const cmd of scenarioById(scenarioId).setup) await run(cmd);

  const readState = async (): Promise<RepoState> => {
    const gitfs = fs as Parameters<typeof git.log>[0]["fs"];
    let initialized = false;
    try {
      initialized = (await store.stat(`${REPO}/.git`)).isDirectory;
    } catch {
      initialized = false;
    }
    const tree: string[] = [];
    for (const p of await store.getAllPaths()) {
      if (!p.startsWith(`${REPO}/`)) continue;
      const rel = p.slice(REPO.length + 1);
      if (rel === ".git" || rel.startsWith(".git/")) continue;
      try {
        if ((await store.stat(p)).isFile) tree.push(rel);
      } catch {
        /* gone */
      }
    }
    if (!initialized) return { ...EMPTY_STATE, tree: tree.sort() };

    const branches = await git.listBranches({ fs: gitfs, dir: REPO });
    const branch = (await git.currentBranch({ fs: gitfs, dir: REPO, fullname: false })) ?? null;
    let oid: string | null = null;
    try {
      oid = await git.resolveRef({ fs: gitfs, dir: REPO, ref: "HEAD" });
    } catch {
      oid = null;
    }
    const files = (await git.statusMatrix({ fs: gitfs, dir: REPO })).map(([p, h, w, s]) => ({
      path: String(p),
      head: Number(h),
      workdir: Number(w),
      stage: Number(s),
    }));
    const seen = new Map<string, CommitNode>();
    for (const ref of branches) {
      try {
        for (const c of await git.log({ fs: gitfs, dir: REPO, ref, depth: 60 })) {
          if (!seen.has(c.oid)) {
            seen.set(c.oid, {
              oid: c.oid,
              message: c.commit.message.trim(),
              parents: c.commit.parent,
              author: c.commit.author.name,
              timestamp: c.commit.author.timestamp,
              refs: [],
            });
          }
        }
      } catch {
        /* unborn */
      }
    }
    return {
      initialized: true,
      head: { branch, oid, detached: Boolean(oid) && branch === null },
      branches,
      files,
      commits: [...seen.values()].sort((a, b) => b.timestamp - a.timestamp),
      tree: tree.sort(),
      cwd: REPO,
    };
  };

  return { run, readState };
}

const passes = async (
  state: Promise<RepoState> | RepoState,
  e: GitExpect,
): Promise<boolean> => satisfiesGitExpect(e, await state);

describe("GitExpect", () => {
  it("flips from unmet to met as the learner works", async () => {
    const { run, readState } = await harness("linear-history");
    const objective: GitExpect = { minCommits: 4, clean: true };

    expect(await passes(readState(), objective)).toBe(false);

    await run("git add README.md");
    expect(await passes(readState(), objective)).toBe(false);

    await run('git commit -m "Update the README"');
    expect(await passes(readState(), objective)).toBe(true);
  });

  it("matches on the tip commit message", async () => {
    const { run, readState } = await harness("linear-history");
    await run("git add README.md");
    await run('git commit -m "Update the README"');
    expect(await passes(readState(), { commitMessageMatches: "update the readme" })).toBe(true);
    expect(await passes(readState(), { commitMessageMatches: "^add" })).toBe(false);
    expect(await passes(readState(), { anyCommitMessageMatches: "Add README" })).toBe(true);
  });

  it("tracks staged and unstaged paths separately", async () => {
    const { run, readState } = await harness("staged-and-unstaged");
    expect(await passes(readState(), { staged: ["notes.md"] })).toBe(true);
    expect(await passes(readState(), { unstaged: ["app.js"] })).toBe(true);
    expect(await passes(readState(), { staged: ["app.js"] })).toBe(false);

    await run("git restore --staged notes.md");
    expect(await passes(readState(), { staged: ["notes.md"] })).toBe(false);
  });

  it("checks branches, existence and absence", async () => {
    const { run, readState } = await harness("branching");
    expect(await passes(readState(), { headBranch: "main", branchesExist: ["feature"] })).toBe(true);

    await run("git merge feature");
    await run("git branch -d feature");
    expect(await passes(readState(), { branchAbsent: "feature" })).toBe(true);
  });

  it("distinguishes a merge commit from a fast-forward", async () => {
    const ff = await harness("branching");
    await ff.run("git merge feature");
    expect(await passes(ff.readState(), { graphShape: "linear" })).toBe(true);
    expect(await passes(ff.readState(), { graphShape: "merged" })).toBe(false);

    const real = await harness("conflict-pending");
    await real.run("git merge rename");
    await real.run(`printf 'title: Final\nauthor: unknown\n' > config.yml`);
    await real.run("git add config.yml");
    await real.run('git commit -m "Resolve"');
    expect(await passes(real.readState(), { graphShape: "merged" })).toBe(true);
  });

  it("grades an empty folder as uninitialized until git init", async () => {
    const { run, readState } = await harness("empty");
    expect(await passes(readState(), { initialized: true })).toBe(false);
    await run("git init");
    expect(await passes(readState(), { initialized: true })).toBe(true);
  });

  it("checks working-tree file existence", async () => {
    const { run, readState } = await harness("empty");
    await run("git init");
    expect(await passes(readState(), { filesExist: ["notes.md"] })).toBe(false);
    await run(`printf '# Notes\n' > notes.md`);
    expect(await passes(readState(), { filesExist: ["notes.md"] })).toBe(true);
  });

  it("explains what is missing rather than only failing", async () => {
    const { readState } = await harness("linear-history");
    const state = await readState();
    expect(explainGitExpect({ headBranch: "feature" }, state)).toContain("expected feature");
    expect(explainGitExpect({ minCommits: 9 }, state)).toContain("at least 9");
    expect(explainGitExpect({ clean: true }, state)).toContain("README.md");
    expect(explainGitExpect({ minCommits: 1 }, state)).toBeNull();
  });

  it("summarizes assertions for the details popover", () => {
    const summary = gitExpectSummary({ headBranch: "main", minCommits: 2, clean: true });
    expect(summary).toContain("HEAD on main");
    expect(summary).toContain("at least 2 commits");
    expect(summary).toContain("working tree clean");
  });

  it("treats an all-empty expectation as satisfied", async () => {
    const { readState } = await harness("linear-history");
    expect(await passes(readState(), {})).toBe(true);
  });
});
