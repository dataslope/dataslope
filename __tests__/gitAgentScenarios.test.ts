/**
 * The two scenarios the Working with Coding Agents course is built on. Each
 * lesson's GitBlock relies on a specific shape of history (which commit
 * touched which file, what the agent's test asserts), so these pin that shape:
 * a change to the fixtures that breaks a lesson's point fails here first.
 */

import { describe, it, expect } from "vitest";
import { Bash, defineCommand } from "just-bash/browser";
import { createGitFs } from "@/app/_components/git/gitFs";
import { createGitCommand } from "@/app/_components/git/gitCommand";
import { scenarioById } from "@/app/_components/git/scenarios";
import { runCommand } from "@/app/_components/git/runCommand";

const REPO = "/repo";

async function seeded(id: string) {
  const { store, fs } = createGitFs();
  const bash = new Bash({
    fs: store as never,
    cwd: REPO,
    customCommands: [defineCommand("git", createGitCommand({ fs, dir: REPO, clock: { commits: 0 } }))],
  });
  await store.mkdir(REPO, { recursive: true });
  const run = async (cmd: string) => {
    const r = await runCommand(bash, cmd);
    return { out: r.stdout, err: r.stderr, code: r.exitCode };
  };
  for (const cmd of scenarioById(id).setup) {
    const r = await run(cmd);
    expect(r.code, `${id}: "${cmd}" failed: ${r.err}`).toBe(0);
  }
  return run;
}

describe("agent-session", () => {
  it("is one human commit followed by three agent commits", async () => {
    const run = await seeded("agent-session");
    const log = (await run("git log --oneline")).out.trim().split("\n");
    expect(log).toHaveLength(4);
    expect(log[0]).toContain("Tidy up formatting helpers");
    expect(log[1]).toContain("Fix failing discount test");
    expect(log[2]).toContain("Add 10% discount on orders of $100 or more");
    expect((await run("git status --short")).out).toBe("");
  });

  it("touches files the request never mentioned", async () => {
    const run = await seeded("agent-session");
    const files = (await run("git diff HEAD~3 --name-only")).out.trim().split("\n");
    expect(files.sort()).toEqual(["format.py", "pricing.py", "report.py", "test_pricing.py"]);
  });

  it("edits the threshold test to match the code instead of fixing the code", async () => {
    const run = await seeded("agent-session");
    expect((await run("git show HEAD~2:pricing.py")).out).toContain("if total > DISCOUNT_THRESHOLD:");
    const fix = (await run("git show HEAD~1")).out;
    expect(fix).toContain("-    assert order_total([{\"price\": 5_000, \"qty\": 2}]) == 9_000");
    expect(fix).toContain("+    assert order_total([{\"price\": 5_000, \"qty\": 2}]) == 10_000");
    expect((await run("git diff HEAD~2 HEAD~1 --name-only")).out.trim()).toBe("test_pricing.py");
  });

  it("can restore the two tidied files from before the session", async () => {
    const run = await seeded("agent-session");
    expect((await run("git restore --source=HEAD~3 format.py report.py")).code).toBe(0);
    expect((await run("cat format.py")).out).toContain("def cents_to_str(cents):");
    expect((await run("git status --short")).out.split("\n").filter(Boolean).sort()).toEqual([" M format.py", " M report.py"]);
  });

  it("hands commits back to the default author", async () => {
    const run = await seeded("agent-session");
    expect((await run("git log -1")).out).toContain("Author: Coding Agent <agent@example.com>");
    expect((await run("git config user.name")).out).toBe("");
  });
});

describe("agent-branch", () => {
  it("leaves the agent's work on its own branch with main checked out", async () => {
    const run = await seeded("agent-branch");
    expect((await run("git branch --show-current")).out.trim()).toBe("main");
    const all = (await run("git log --oneline --all")).out;
    expect(all).toContain("Add SAVE10 coupon");
    expect(all).toContain("Add order totals with flat shipping");
    expect((await run("git log --oneline")).out).not.toContain("SAVE10");
  });

  it("discounts shipping, and its test asserts exactly that", async () => {
    const run = await seeded("agent-branch");
    const diff = (await run("git diff main..agent/coupon")).out;
    expect(diff).toContain("+    total = subtotal + SHIPPING");
    expect(diff).toContain("+        total = round(total * (1 - COUPONS[coupon]))");
    expect(diff).toContain('coupon="SAVE10") == 1_349');
  });

  it("can be merged or thrown away", async () => {
    const merge = await seeded("agent-branch");
    expect((await merge("git merge agent/coupon")).code).toBe(0);
    expect((await merge("cat pricing.py")).out).toContain("COUPONS");

    const drop = await seeded("agent-branch");
    expect((await drop("git branch -D agent/coupon")).code).toBe(0);
    expect((await drop("git log --oneline --all")).out).not.toContain("SAVE10");
  });
});
