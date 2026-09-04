/**
 * Regression tests for the September 2026 Bash & Git playground audit
 * (findings BG-02 to BG-11, BG-14, BG-18): the index and ref layer of the
 * Git emulation. Each block names the finding it pins.
 */

import { describe, it, expect } from "vitest";
import { Bash, defineCommand } from "just-bash/browser";
import { createGitFs } from "@/app/_components/git/gitFs";
import { createGitCommand, gitDate, unifiedDiff } from "@/app/_components/git/gitCommand";
import { scenarioById } from "@/app/_components/git/scenarios";
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
    return { out: r.stdout, err: r.stderr, code: r.exitCode, text: r.stdout + r.stderr };
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


describe("BG-02 · git diff marks what changed", () => {
  it("shows the seed's unstaged edit as added lines, with a real hunk header", async () => {
    const { run } = await seeded("linear-history");
    const diff = await run("git diff");
    // The seed adds a blank line and a sentence to a three-line README.
    expect(diff.out).toContain("@@ -1,3 +1,5 @@");
    expect(diff.out).toContain("+Edited but not staged.");
    expect(diff.out.split("\n").filter((l) => l.startsWith("+") && !l.startsWith("+++"))).toHaveLength(2);
    expect(diff.out).not.toMatch(/^ Edited but not staged\./m);
  });

  it("marks an appended line, an in-place change, a path argument and HEAD alike", async () => {
    const { run } = await seeded("linear-history");
    await run("echo z >> math.js");
    expect((await run("git diff math.js")).out).toContain("+z");
    await run("sed -i s/Project/Proj/ README.md");
    const both = await run("git diff");
    expect(both.out).toContain("-# Project");
    expect(both.out).toContain("+# Proj");
    expect((await run("git diff HEAD")).out).toContain("+z");
    expect((await run("git diff HEAD -- math.js")).out).not.toContain("Proj");
  });

  it("reads the staged side from the index, so --cached after add matches the unstaged diff before it", async () => {
    const { run } = await seeded("linear-history");
    const before = (await run("git diff")).out;
    await run("git add README.md");
    expect((await run("git diff")).out).toBe("");
    expect((await run("git diff --cached")).out).toBe(before);
    // Edit again after staging: unstaged is index → worktree only.
    await run("echo tail >> README.md");
    const unstaged = (await run("git diff")).out;
    expect(unstaged).toContain("+tail");
    expect(unstaged).not.toContain("+Edited but not staged.");
  });

  it("produces unified hunks with context and no-newline markers", () => {
    expect(unifiedDiff("a\nb\nc\n", "a\nB\nc\n")).toEqual(["@@ -1,3 +1,3 @@", " a", "-b", "+B", " c"]);
    expect(unifiedDiff("", "x\n")).toEqual(["@@ -0,0 +1 @@", "+x"]);
    expect(unifiedDiff("x\n", "")).toEqual(["@@ -1 +0,0 @@", "-x"]);
    expect(unifiedDiff("a\n", "a")).toEqual(["@@ -1 +1 @@", "-a", "+a", "\\ No newline at end of file"]);
    const long = Array.from({ length: 20 }, (_, i) => `l${i}`).join("\n") + "\n";
    const edited = long.replace("l10", "L10");
    expect(unifiedDiff(long, edited)[0]).toBe("@@ -8,7 +8,7 @@");
  });
});

describe("BG-03 · staged changes are classified from HEAD and the index", () => {
  it("reports a staged edit to a tracked file as modified, not new", async () => {
    const { run } = await seeded("linear-history");
    await run("echo more >> README.md");
    expect((await run("git status --short")).out).toContain(" M README.md");
    await run("git add README.md");
    expect((await run("git status --short")).out).toContain("M  README.md");
    expect((await run("git status --short")).out).not.toContain("A  README.md");
    expect((await run("git status")).out).toContain("modified:   README.md");
    expect((await run("git status")).out).not.toContain("new file:   README.md");
  });

  it("still reports a genuinely new file as added, and staged-then-edited as AM / MM", async () => {
    const { run } = await seeded("linear-history");
    await run("echo n > new.txt; git add new.txt");
    expect((await run("git status --short")).out).toContain("A  new.txt");
    await run("echo more >> new.txt");
    expect((await run("git status --short")).out).toContain("AM new.txt");
    await run("git add README.md; echo again >> README.md");
    expect((await run("git status --short")).out).toContain("MM README.md");
  });

  it("lists a git rm exactly once", async () => {
    const { run } = await seeded("linear-history");
    await run("git rm math.js");
    const short = (await run("git status --short")).out;
    expect(short.match(/math\.js/g)).toHaveLength(1);
    expect(short).toContain("D  math.js");
    const long = (await run("git status")).out;
    expect(long.match(/deleted:\s+math\.js/g)).toHaveLength(1);
  });
});

describe("BG-04 · reset resolves first, then moves everything together", () => {
  it("hard-resets to HEAD~1 and leaves HEAD attached to main", async () => {
    const { run } = await seeded("linear-history");
    await run("git restore README.md");
    const before = (await run("git log --oneline -1")).out;
    const r = await run("git reset --hard HEAD~1");
    expect(r.code).toBe(0);
    expect(r.out).toMatch(/^HEAD is now at [0-9a-f]{7} Add add\(\)/);
    expect((await run("git log --oneline -1")).out).toContain("(HEAD -> main)");
    expect((await run("git log --oneline -1")).out).not.toBe(before);
    expect((await run("git status")).out).toContain("On branch main");
    expect((await run("git branch")).out).toContain("* main");
    expect((await run("ls")).out).not.toContain(".gitignore");
  });

  it("hard-resets to a short sha", async () => {
    const { run } = await seeded("linear-history");
    await run("git restore README.md");
    const first = (await run("git log --oneline")).out.trim().split("\n").pop()!.slice(0, 7);
    expect((await run(`git reset --hard ${first}`)).code).toBe(0);
    expect((await run("git log --oneline")).out.trim().split("\n")).toHaveLength(1);
    expect((await run("git status --short")).out).toBe("");
  });

  it("soft-resets: the branch moves, the index keeps the old tree staged", async () => {
    const { run } = await seeded("linear-history");
    await run("git restore README.md");
    expect((await run("git reset --soft HEAD~1")).code).toBe(0);
    expect((await run("git log --oneline")).out.trim().split("\n")).toHaveLength(2);
    expect((await run("git status --short")).out).toContain("A  .gitignore");
    expect((await run("git status")).out).toContain("On branch main");
  });

  it("mixed-resets: the branch and index move, the working tree stays", async () => {
    const { run } = await seeded("linear-history");
    await run("git restore README.md");
    await run("git reset HEAD~1");
    expect((await run("git status --short")).out).toContain("?? .gitignore");
    expect((await run("cat .gitignore")).out).toContain("node_modules");
  });

  it("a reset to an unknown revision changes nothing", async () => {
    const { run } = await seeded("linear-history");
    const log = (await run("git log --oneline")).out;
    const status = (await run("git status")).out;
    const r = await run("git reset --hard HEAD~9");
    expect(r.code).toBe(128);
    expect(r.err).toContain("fatal: ambiguous argument 'HEAD~9': unknown revision");
    expect(r.err).not.toContain("origin/");
    expect((await run("git log --oneline")).out).toBe(log);
    expect((await run("git status")).out).toBe(status);
  });

  it("still unstages by path", async () => {
    const { run } = await seeded("staged-and-unstaged");
    await run("git reset notes.md");
    expect((await run("git status --short")).out).toContain(" M notes.md");
    await run("git add app.js");
    await run("git reset HEAD app.js");
    expect((await run("git status --short")).out).toContain(" M app.js");
  });
});

describe("BG-08 · one revision resolver", () => {
  it("resolves HEAD~1, HEAD^, main^, a tag, rev:path and cat-file -p HEAD", async () => {
    const { run } = await seeded("linear-history");
    expect((await run("git show HEAD~1 --no-patch")).out).toContain("Add add()");
    expect((await run("git show HEAD^ --no-patch")).out).toContain("Add add()");
    expect((await run("git show HEAD~2 --no-patch")).out).toContain("Add README");
    expect((await run("git show main^ --no-patch")).out).toContain("Add add()");
    expect((await run("git show HEAD:README.md")).out).toBe("# Project\n\nA small demo repository.\n");
    expect((await run("git show HEAD~2:README.md")).out).toBe("# Project\n\nA small demo repository.\n");
    await run("git tag v1.0 HEAD~1");
    expect((await run("git show v1.0 --no-patch")).out).toContain("Add add()");
    const cat = await run("git cat-file -p HEAD");
    expect(cat.code).toBe(0);
    expect(cat.out).toMatch(/^tree [0-9a-f]{40}\nparent [0-9a-f]{40}\nauthor You <you@dataslope.dev> \d+ \+0000\ncommitter You/);
    expect((await run("git cat-file -t HEAD")).out.trim()).toBe("commit");
    expect((await run("git cat-file -t HEAD:README.md")).out.trim()).toBe("blob");
    expect((await run("git cat-file -s HEAD:README.md")).out.trim()).toBe("36");
    expect((await run("git show HEAD~7 --no-patch")).err).toContain("unknown revision");
  });
});

describe("BG-09 · options are honoured or refused", () => {
  it("diffs commit to commit, with a range and with a single revision", async () => {
    const { run } = await seeded("linear-history");
    const two = await run("git diff HEAD~2 HEAD~1");
    expect(two.out).toContain("diff --git a/math.js b/math.js");
    expect(two.out).toContain("+export const add");
    expect((await run("git diff HEAD~2..HEAD~1")).out).toBe(two.out);
    const one = await run("git diff HEAD~1");
    expect(one.out).toContain("+node_modules/");
    expect(one.out).toContain("+Edited but not staged.");
  });

  it("shows patches and stats on show and log", async () => {
    const { run } = await seeded("linear-history");
    const show = await run("git show HEAD");
    expect(show.out).toContain("commit ");
    expect(show.out).toContain("+node_modules/");
    expect((await run("git show --stat HEAD")).out).toContain(".gitignore | 1 +");
    expect((await run("git log -p -1")).out).toContain("+node_modules/");
    expect((await run("git log --stat -1")).out).toContain("1 file changed, 1 insertion(+)");
    const stat = await run("git diff --stat");
    expect(stat.out).toContain("README.md | 2 ++");
    expect(stat.out).toContain("1 file changed, 2 insertions(+)");
    expect(stat.out).not.toContain("@@");
  });

  it("limits, ranges, path filters and --all", async () => {
    const { run } = await seeded("branching");
    expect((await run("git log -n 1 --oneline")).out.trim().split("\n")).toHaveLength(1);
    expect((await run("git log --max-count=1 --oneline")).out.trim().split("\n")).toHaveLength(1);
    expect((await run("git log --oneline")).out.trim().split("\n")).toHaveLength(1);
    const all = (await run("git log --oneline --all")).out;
    expect(all.trim().split("\n")).toHaveLength(2);
    expect(all).toContain("Add feature flag");
    expect((await run("git log --oneline main..feature")).out.trim()).toMatch(/Add feature flag$/);
    expect((await run("git log --oneline -- README.md")).out.trim().split("\n")).toHaveLength(1);
    expect((await run("git log --oneline --all -- feature.js")).out.trim()).toMatch(/Add feature flag$/);
  });

  it("formats and graphs", async () => {
    const { run } = await seeded("branching");
    const formatted = await run(`git log -1 --format="%an <%ae> | %ad"`);
    expect(formatted.out.trim()).toMatch(/^You <you@dataslope\.dev> \| \w{3} \w{3} \d+ \d\d:\d\d:\d\d 2026 \+0000$/);
    expect((await run("git log --format=%s --all")).out).toContain("Add feature flag");
    await run("git merge --no-ff feature");
    const graph = (await run("git log --graph --oneline")).out;
    expect(graph).toMatch(/^\* /m);
    expect(graph).toContain("|\\");
    expect(graph).toContain("|/");
  });

  it("refuses an option it does not implement instead of ignoring it", async () => {
    const { run } = await seeded("linear-history");
    const r = await run("git log --walk-reflogs");
    expect(r.code).toBe(129);
    expect(r.err).toContain("error: unknown option '--walk-reflogs'");
    expect(r.err).toContain("usage: git log");
    expect((await run("git diff --word-diff")).err).toContain("unknown option");
    expect((await run("git status -z")).err).toContain("unknown option");
    expect((await run("git log --help")).out).toContain("usage: git log");
  });

  it("counts insertions and deletions on commit", async () => {
    const { run } = await seeded("linear-history");
    await run("git add README.md");
    const c = await run('git commit -m "Edit README"');
    expect(c.out).toContain("1 file changed, 2 insertions(+)");
    await run("echo x > new.txt; git add new.txt");
    expect((await run('git commit -m "New"')).out).toContain("create mode 100644 new.txt");
  });
});

describe("BG-10 · commit -a and -am", () => {
  it("accepts clustered -am and stages tracked changes for -a", async () => {
    const { run } = await seeded("linear-history");
    const r = await run('git commit -am "add all"');
    expect(r.code).toBe(0);
    expect(r.out).toContain("add all");
    expect((await run("git status --short")).out).toBe("");
    await run("echo y >> math.js; echo n > untracked.txt");
    expect((await run('git commit -a -m "all flag"')).out).toContain("all flag");
    expect((await run("git status --short")).out.trim()).toBe("?? untracked.txt");
  });

  it("says why there is nothing to commit", async () => {
    const { run } = await seeded("linear-history");
    const dirty = await run('git commit -m "nothing staged"');
    expect(dirty.code).toBe(1);
    expect(dirty.err).toContain('no changes added to commit (use "git add" and/or "git commit -a")');
    expect(dirty.err).not.toContain("working tree clean");
    await run("git restore README.md");
    expect((await run('git commit -m "clean"')).err).toContain("nothing to commit, working tree clean");
    await run("echo n > u.txt");
    expect((await run('git commit -m "untracked"')).err).toContain("untracked files present");
  });
});

describe("BG-11 · commands that did the wrong thing", () => {
  it("deletes a tag, and never leaks a JavaScript hint", async () => {
    const { run } = await seeded("linear-history");
    await run("git tag v1.0");
    const d = await run("git tag -d v1.0");
    expect(d.code).toBe(0);
    expect(d.out).toMatch(/^Deleted tag 'v1\.0' \(was [0-9a-f]{7}\)/);
    expect((await run("git tag")).out).toBe("");
    expect((await run("git tag -d v1.0")).err).toContain("error: tag 'v1.0' not found.");
    await run("git tag v2.0");
    const dup = await run("git tag v2.0");
    expect(dup.err).toContain("fatal: tag 'v2.0' already exists");
    expect(dup.err).not.toContain("force: true");
    await run('git tag -a v3.0 -m "third"');
    expect((await run("git cat-file -t v3.0")).out.trim()).toBe("tag");
    expect((await run("git log --oneline -1")).out).toContain("tag: v3.0");
  });

  it("renames a branch rather than copying it", async () => {
    const { run } = await seeded("branching");
    await run("git branch -m feature topic");
    expect((await run("git branch")).out).toBe("* main\n  topic\n");
    await run("git branch -m trunk");
    expect((await run("git branch")).out).toBe("  topic\n* trunk\n");
    expect((await run("git log --oneline -1")).out).toContain("HEAD -> trunk");
  });

  it("checks out a commit detached, and comes back", async () => {
    const { run } = await seeded("linear-history");
    await run("git restore README.md");
    const older = (await run("git log --oneline")).out.trim().split("\n")[1].slice(0, 7);
    const r = await run(`git checkout ${older}`);
    expect(r.code).toBe(0);
    expect(r.out).toContain("You are in 'detached HEAD' state");
    expect(r.out).toContain(`HEAD is now at ${older}`);
    expect((await run("git status")).out).toContain(`HEAD detached at ${older}`);
    expect((await run("git branch")).out).toContain(`* (HEAD detached at ${older})`);
    expect((await run("git checkout main")).out).toContain("Switched to branch 'main'");
    expect((await run("git switch --detach HEAD~1")).code).toBe(0);
    expect((await run("git switch HEAD~1")).err).toContain("a branch is expected");
  });

  it("discards a change with checkout -- and restore alike", async () => {
    const { run } = await seeded("linear-history");
    await run("echo z >> math.js");
    expect((await run("git checkout -- math.js")).code).toBe(0);
    expect((await run("git status --short")).out).not.toContain("math.js");
    expect((await run("git checkout -- nope.js")).err).toContain("did not match any file(s) known to git");
    await run("echo z >> math.js");
    expect((await run("git checkout math.js")).code).toBe(0);
    expect((await run("git status --short")).out).not.toContain("math.js");
  });

  it("switches back with switch - and checkout -", async () => {
    const { run } = await seeded("branching");
    // The seed itself came back from feature, so that is the previous branch.
    expect((await run("git switch -")).out).toContain("Switched to branch 'feature'");
    expect((await run("git switch -")).out).toContain("Switched to branch 'main'");
    expect((await run("git checkout -")).out).toContain("Switched to branch 'feature'");
    const fresh = await session();
    await fresh.run("git init; echo a > a; git add a; git commit -m a");
    expect((await fresh.run("git switch -")).err).toContain("no previous branch");
  });

  it("refuses git init from a subdirectory instead of reinitialising the root", async () => {
    const { run } = await seeded("linear-history");
    await run("mkdir sub");
    const r = await run("cd sub && git init");
    expect(r.code).toBe(128);
    expect(r.err).toContain("one repository");
    expect(r.out).not.toContain("Reinitialized");
  });
});

describe("BG-14 · conflicts", () => {
  it("marks a conflicted path UU, labels the markers HEAD, and knows when they are all fixed", async () => {
    const { run } = await seeded("conflict-pending");
    expect((await run("git merge rename")).code).toBe(1);
    expect((await run("git status --short")).out.trim()).toBe("UU config.yml");
    const status = await run("git status");
    expect(status.out).toContain("You have unmerged paths.");
    expect(status.out).toContain("both modified:   config.yml");
    const file = (await run("cat config.yml")).out;
    expect(file).toContain("<<<<<<< HEAD");
    expect(file).toContain(">>>>>>> rename");
    expect(file).not.toContain("<<<<<<< main");
    expect((await run('git commit -m "too soon"')).err).toContain("unmerged files");
    await run("printf 'title: Final\\nauthor: unknown\\n' > config.yml");
    await run("git add config.yml");
    const fixed = await run("git status");
    expect(fixed.out).toContain("All conflicts fixed but you are still merging.");
    expect(fixed.out).not.toContain("unmerged paths");
    expect((await run("git status --short")).out.trim()).toBe("M  config.yml");
    const c = await run('git commit -m "Merge rename"');
    expect(c.code).toBe(0);
    expect((await run("git log --oneline")).out).toContain("Merge rename");
  });
});

describe("BG-18 · message fidelity", () => {
  it("prints the fast-forward range and stat", async () => {
    const { run } = await seeded("branching");
    const r = await run("git merge feature");
    expect(r.out).toMatch(/^Updating [0-9a-f]{7}\.\.[0-9a-f]{7}\nFast-forward\n feature\.js \| 1 \+\n 1 file changed, 1 insertion\(\+\)\n$/);
    expect((await run("git merge feature")).out).toBe("Already up to date.\n");
  });

  it("says Already on, and refuses to merge what does not exist", async () => {
    const { run } = await seeded("branching");
    expect((await run("git checkout main")).out).toBe("Already on 'main'\n");
    const r = await run("git merge nothing");
    expect(r.code).toBe(1);
    expect(r.err).toBe("merge: nothing - not something we can merge\n");
  });

  it("names the author from git config, and lists config in help", async () => {
    const { run } = await seeded("linear-history");
    await run("git config user.name Grace");
    await run("git config user.email grace@example.com");
    expect((await run("git config user.name")).out.trim()).toBe("Grace");
    await run("git add README.md; git commit -m 'By Grace'");
    expect((await run("git log -1")).out).toContain("Author: Grace <grace@example.com>");
    expect((await run("cat .git/config")).out).toContain("Grace");
    expect((await run("git help")).out).toContain("config");
  });

  it("prints dates the way git does", async () => {
    const { run } = await seeded("linear-history");
    expect((await run("git log -1")).out).toMatch(/Date:   Thu Jan 1 00:0\d:00 2026 \+0000/);
    expect(gitDate(1767225660)).toBe("Thu Jan 1 00:01:00 2026 +0000");
    expect(gitDate(1767225660, -60)).toBe("Thu Jan 1 01:01:00 2026 +0100");
  });

  it("keeps the merge commit's stat honest", async () => {
    const { run } = await seeded("branching");
    const r = await run("git merge --no-ff feature");
    expect(r.out).toContain("Merge made by the 'ort' strategy.");
    expect(r.out).toContain("feature.js | 1 +");
  });
});
