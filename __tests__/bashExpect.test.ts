/**
 * `BashExpect` graded against a real shell and a real filesystem, driven the
 * way `<BashChallengeCard>` drives them. Guards the property the live
 * checklist depends on: an objective flips exactly when the output or the
 * files satisfy it, and not before.
 */

import { describe, it, expect } from "vitest";
import { Bash, defineCommand } from "just-bash/browser";
import { createGitFs } from "@/app/_components/git/gitFs";
import { createGitCommand } from "@/app/_components/git/gitCommand";
import { runCommand } from "@/app/_components/git/runCommand";
import { EMPTY_STATE, MAX_SNAPSHOT_FILE_BYTES, type RepoState } from "@/app/_components/git/protocol";
import { BASH_SCENARIOS, bashScenarioById } from "@/app/_components/bash/bashScenarios";
import {
  bashExpectSummary,
  explainBashExpect,
  satisfiesBashExpect,
  type BashContext,
  type BashExpect,
  type BashTranscriptEntry,
} from "@/app/_components/bash/bashExpect";

const REPO = "/repo";

/** Mirrors the worker's bash path, so the tests grade what a card grades. */
async function harness(scenarioId: string) {
  const { store, fs } = createGitFs();
  const bash = new Bash({
    fs: store as never,
    cwd: REPO,
    customCommands: [
      defineCommand("git", createGitCommand({ fs, dir: REPO, clock: { commits: 0 } })),
    ],
  });
  await store.mkdir(REPO, { recursive: true });

  const scenario = bashScenarioById(scenarioId);
  for (const [path, contents] of Object.entries(scenario.files)) {
    const slash = path.lastIndexOf("/");
    if (slash > 0) await store.mkdir(`${REPO}/${path.slice(0, slash)}`, { recursive: true });
    await store.writeFile(`${REPO}/${path}`, contents);
  }

  const transcript: BashTranscriptEntry[] = [];
  const run = async (command: string) => {
    const r = await runCommand(bash, command);
    transcript.push({ command, stdout: r.stdout, stderr: r.stderr, exitCode: r.exitCode });
    return r;
  };

  const readState = async (): Promise<RepoState> => {
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
    tree.sort();
    const contents: Record<string, string> = {};
    for (const rel of tree) {
      try {
        if ((await store.stat(`${REPO}/${rel}`)).size > MAX_SNAPSHOT_FILE_BYTES) continue;
        contents[rel] = await store.readFile(`${REPO}/${rel}`);
      } catch {
        /* binary */
      }
    }
    return { ...EMPTY_STATE, kind: "bash", tree, cwd: REPO, contents };
  };

  const ctx = async (): Promise<BashContext> => ({ state: await readState(), transcript });
  return { run, ctx };
}

const passes = async (ctx: Promise<BashContext>, e: BashExpect) =>
  satisfiesBashExpect(e, await ctx);

describe("BashExpect", () => {
  it("is unmet before anything runs", async () => {
    const { ctx } = await harness("small-project");
    expect(await passes(ctx(), { stdoutContains: "README.md" })).toBe(false);
    expect(explainBashExpect({ stdoutContains: "x" }, await ctx())).toBe("Nothing has run yet.");
  });

  it("grades the last command's output", async () => {
    const { run, ctx } = await harness("small-project");
    await run("ls");
    expect(await passes(ctx(), { stdoutContains: ["README.md", "notes.txt"] })).toBe(true);
    expect(await passes(ctx(), { stdoutContains: "nope.txt" })).toBe(false);

    // A later command replaces what "the last output" means.
    await run("echo hello");
    expect(await passes(ctx(), { stdoutEquals: "hello" })).toBe(true);
    expect(await passes(ctx(), { stdoutContains: "README.md" })).toBe(false);
    // ...but the whole transcript is still searchable.
    expect(await passes(ctx(), { anyOutputContains: "README.md" })).toBe(true);
  });

  it("counts output lines, ignoring blanks", async () => {
    const { run, ctx } = await harness("log-files");
    await run("grep ERROR app.log");
    expect(await passes(ctx(), { stdoutLineCount: 2 })).toBe(true);
    expect(await passes(ctx(), { stdoutLineCount: 3 })).toBe(false);
  });

  it("matches output with a regex", async () => {
    const { run, ctx } = await harness("sales-csv");
    await run("head -1 sales.csv");
    expect(await passes(ctx(), { stdoutMatches: "^date,region" })).toBe(true);
  });

  it("reads stderr as output too", async () => {
    // A learner reading the terminal does not distinguish the streams.
    const { run, ctx } = await harness("small-project");
    await run("cat missing.txt");
    expect(await passes(ctx(), { stdoutContains: "No such file" })).toBe(true);
    expect(await passes(ctx(), { exitCode: 0 })).toBe(false);
    expect(await passes(ctx(), { noErrors: true })).toBe(false);
  });

  it("tracks files created, changed and removed", async () => {
    const { run, ctx } = await harness("small-project");
    expect(await passes(ctx(), { filesExist: ["out.txt"] })).toBe(false);

    await run("grep -c . notes.txt > out.txt");
    expect(await passes(ctx(), { filesExist: ["out.txt"] })).toBe(true);
    expect(await passes(ctx(), { fileContains: { path: "out.txt", text: "3" } })).toBe(true);

    await run("rm notes.txt");
    expect(await passes(ctx(), { fileAbsent: "notes.txt" })).toBe(true);
  });

  it("counts lines in a file", async () => {
    const { run, ctx } = await harness("log-files");
    await run("grep ERROR app.log > errors.log");
    expect(await passes(ctx(), { fileLineCount: { path: "errors.log", lines: 2 } })).toBe(true);
    expect(await passes(ctx(), { fileMatches: { path: "errors.log", pattern: "timeout" } })).toBe(true);
  });

  it("can grade the route as well as the result", async () => {
    const { run, ctx } = await harness("log-files");
    await run("cat app.log | grep ERROR");
    expect(await passes(ctx(), { commandMatches: "grep" })).toBe(true);
    expect(await passes(ctx(), { commandMatches: "\\bawk\\b" })).toBe(false);
  });

  it("explains what is missing rather than only failing", async () => {
    const { run, ctx } = await harness("small-project");
    await run("ls");
    const c = await ctx();
    expect(explainBashExpect({ stdoutContains: "zzz" }, c)).toContain('does not contain "zzz"');
    expect(explainBashExpect({ filesExist: ["nope"] }, c)).toContain("nope does not exist");
    expect(explainBashExpect({ fileContains: { path: "README.md", text: "zzz" } }, c)).toContain(
      "does not contain",
    );
    expect(explainBashExpect({ stdoutContains: "README.md" }, c)).toBeNull();
  });

  it("summarizes assertions for the details popover", () => {
    const s = bashExpectSummary({ stdoutLineCount: 3, filesExist: ["a.txt"], noErrors: true });
    expect(s).toContain("output has 3 lines");
    expect(s).toContain("files exist: a.txt");
    expect(s).toContain("no command failed");
  });

  it("treats an all-empty expectation as satisfied", async () => {
    const { ctx } = await harness("small-project");
    expect(await passes(ctx(), {})).toBe(true);
  });
});

describe("bash scenarios", () => {
  it.each(BASH_SCENARIOS.map((s) => s.id))("%s seeds a usable filesystem", async (id) => {
    const { run, ctx } = await harness(id);
    const listing = await run("ls -a");
    expect(listing.exitCode).toBe(0);

    const expected = Object.keys(bashScenarioById(id).files);
    const { state } = await ctx();
    for (const path of expected) expect(state.tree).toContain(path);
  });

  it("puts nested scenario files in real directories", async () => {
    const { run } = await harness("small-project");
    const nested = await run("cat src/lib/parse.js");
    expect(nested.exitCode).toBe(0);
    expect(nested.stdout).toContain("JSON.parse");
  });
});
