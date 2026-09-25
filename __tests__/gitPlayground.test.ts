/**
 * The Git playground's shell + git engine, exercised the way the worker drives
 * them: one in-memory filesystem shared by just-bash and isomorphic-git.
 * Guards the two properties the design depends on — that `.git` is readable
 * through ordinary shell commands, and that commits are deterministic.
 */

import { describe, it, expect } from "vitest";
import { Bash, defineCommand } from "just-bash/browser";
import { createGitFs, FileTooLargeError } from "@/app/_components/git/gitFs";
import { createGitCommand } from "@/app/_components/git/gitCommand";
import { scenarioById } from "@/app/_components/git/scenarios";
import { MAX_FILE_BYTES } from "@/app/_components/git/protocol";
import { runCommand } from "@/app/_components/git/runCommand";

const REPO = "/repo";

async function session() {
  const { store, fs } = createGitFs();
  const clock = { commits: 0 };
  const bash = new Bash({
    fs: store as never,
    cwd: REPO,
    customCommands: [defineCommand("git", createGitCommand({ fs, dir: REPO, clock }))],
  });
  await store.mkdir(REPO, { recursive: true });
  const run = async (cmd: string) => {
    const r = await runCommand(bash, cmd);
    return { out: r.stdout, err: r.stderr, code: r.exitCode };
  };
  return { store, fs, bash, run };
}

async function seeded(id: string) {
  const s = await session();
  for (const cmd of scenarioById(id).setup) {
    const r = await s.run(cmd);
    expect(r.code, `${id}: "${cmd}" failed: ${r.err}`).toBe(0);
  }
  return s;
}

describe("git command", () => {
  it("runs the init → add → commit → log loop", async () => {
    const { run } = await session();
    expect((await run("git init")).out).toContain("Initialized empty Git repository");
    await run(`printf '# Project\n' > README.md`);

    const untracked = await run("git status");
    expect(untracked.out).toContain("Untracked files:");
    expect(untracked.out).toContain("README.md");

    await run("git add README.md");
    expect((await run("git status -s")).out.trim()).toBe("A  README.md");

    const commit = await run(`git commit -m "Add README"`);
    expect(commit.out).toContain("(root-commit)");
    expect(commit.out).toContain("Add README");

    expect((await run("git status")).out).toContain("nothing to commit, working tree clean");
    expect((await run("git log --oneline")).out).toMatch(/^[0-9a-f]{7} \(HEAD -> main\) Add README/);
  });

  it("refuses git commands outside a repository, with git's wording", async () => {
    const { run } = await session();
    const r = await run("git status");
    expect(r.code).toBe(128);
    expect(r.err).toContain("not a git repository");
  });

  it("reports an unsupported subcommand instead of failing silently", async () => {
    const { run } = await session();
    await run("git init");
    const r = await run("git bisect");
    expect(r.code).toBe(1);
    expect(r.err).toContain("is not a git command");
    expect(r.err).toContain("git help");
  });

  it("puts the merged branch's files in the working tree", async () => {
    const { run } = await seeded("branching");
    expect((await run("ls")).out).not.toContain("feature.js");

    await run("git merge feature");
    // isomorphic-git updates the ref without touching the working directory,
    // so a fast-forward would otherwise leave the file missing.
    expect((await run("ls")).out).toContain("feature.js");
    expect((await run("git status")).out).toContain("nothing to commit");
  });
});

describe("the shell sees the same filesystem as git", () => {
  it("reads .git through cat and ls — the pointer chain as files", async () => {
    const { run } = await seeded("linear-history");

    expect((await run("cat .git/HEAD")).out.trim()).toBe("ref: refs/heads/main");
    expect((await run("cat .git/refs/heads/main")).out.trim()).toMatch(/^[0-9a-f]{40}$/);

    const entries = (await run("ls .git")).out.split("\n");
    expect(entries).toContain("HEAD");
    expect(entries).toContain("objects");
    expect(entries).toContain("refs");
  });
});

describe("merge bookkeeping", () => {
  it("refuses to delete an unmerged branch with -d", async () => {
    const { run } = await seeded("branching");
    const refused = await run("git branch -d feature");
    expect(refused.code).toBe(1);
    expect(refused.err).toContain("not fully merged");

    expect((await run("git branch -D feature")).code).toBe(0);
    expect((await run("git branch")).out).not.toContain("feature");
  });

  it("aborts a conflicted merge", async () => {
    const { run } = await seeded("conflict-pending");
    await run("git merge rename");
    expect((await run("git merge --abort")).code).toBe(0);
    expect((await run("git status")).out).not.toContain("unmerged paths");
    expect((await run("git merge --abort")).code).toBe(128);
  });

  it("reports the merge in progress on the command itself, live", async () => {
    // The worker reads `merging` off the git command after every exec; the
    // UI's conflict guidance hangs on it. It has to be a live getter: the
    // first version copied its value once, at creation, and stayed null.
    const { store, fs } = createGitFs();
    const cmd = createGitCommand({ fs, dir: REPO, clock: { commits: 0 } });
    const bash = new Bash({ fs: store as never, cwd: REPO, customCommands: [defineCommand("git", cmd)] });
    await store.mkdir(REPO, { recursive: true });
    for (const c of scenarioById("conflict-pending").setup) await runCommand(bash, c);

    expect(cmd.merging).toBeNull();
    await runCommand(bash, "git merge rename");
    expect(cmd.merging).toBe("rename");
    await runCommand(bash, "git merge --abort");
    expect(cmd.merging).toBeNull();

    await runCommand(bash, "git merge rename");
    await runCommand(bash, `printf 'title: Final\nauthor: unknown\n' > config.yml`);
    await runCommand(bash, "git add config.yml");
    await runCommand(bash, 'git commit -m "Resolve"');
    expect(cmd.merging).toBeNull();
  });
});

describe("change detection", () => {
  it("notices a same-length rewrite inside one millisecond", async () => {
    // isomorphic-git's index stores mtime in whole seconds and skips hashing
    // when size and mtime match, so seeding a whole scenario in under a
    // millisecond would otherwise report a modified file as clean.
    const { run } = await session();
    await run("git init");
    await run(`printf 'const version = 1;\n' > app.js`);
    await run("git add app.js");
    await run('git commit -m "Add app"');
    await run(`printf 'const version = 2;\n' > app.js`);

    expect((await run("git status -s")).out).toContain("app.js");
  });
});

describe("determinism", () => {
  it("produces identical object ids for an identical command history", async () => {
    const head = async () => {
      const { run } = await seeded("linear-history");
      return (await run("git log --oneline")).out;
    };
    expect(await head()).toBe(await head());
  });
});

describe("size caps", () => {
  it("rejects a file over the per-file limit on every write path", async () => {
    const { store, run } = await session();

    await expect(
      store.writeFile(`${REPO}/big.bin`, "x".repeat(MAX_FILE_BYTES + 1)),
    ).rejects.toBeInstanceOf(FileTooLargeError);

    // Through the shell the cap must read as an ordinary command failure, not
    // an exception that kills the terminal.
    const viaShell = await run(`printf '%0${MAX_FILE_BYTES + 1}d' 0 > big.txt`);
    expect(viaShell.code).not.toBe(0);
    expect(viaShell.err).toContain("playground limit");
  });
});
