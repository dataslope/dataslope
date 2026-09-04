/**
 * `ShellSession` is what makes an embedded terminal behave like a terminal.
 * just-bash scopes `exec` to one call — cwd, variables and functions are all
 * restored afterwards — so without this, `cd src` followed by `ls` would list
 * the directory the learner started in.
 */

import { describe, it, expect } from "vitest";
import { Bash } from "just-bash/browser";
import { createGitFs } from "@/app/_components/git/gitFs";
import { runCommand, ShellSession } from "@/app/_components/git/runCommand";

/** The root a shell session gets; see SESSION_ROOTS. */
const ROOT = "/home/user";

async function session() {
  const { store } = createGitFs();
  await store.mkdir(`${ROOT}/src/lib`, { recursive: true });
  await store.writeFile(`${ROOT}/a.txt`, "A\n");
  await store.writeFile(`${ROOT}/src/b.txt`, "B\n");
  const bash = new Bash({ fs: store as never, cwd: ROOT });
  const shell = new ShellSession(ROOT);
  const run = (cmd: string) => shell.run(bash, cmd);
  return { bash, shell, run, store };
}

describe("ShellSession", () => {
  it("keeps the working directory across commands", async () => {
    const { run, shell } = await session();
    expect((await run("pwd")).stdout.trim()).toBe(ROOT);

    await run("cd src");
    expect(shell.cwd).toBe(`${ROOT}/src`);
    expect((await run("pwd")).stdout.trim()).toBe(`${ROOT}/src`);
    expect((await run("ls")).stdout).toContain("b.txt");

    await run("cd lib");
    expect((await run("pwd")).stdout.trim()).toBe(`${ROOT}/src/lib`);

    await run("cd ../..");
    expect((await run("pwd")).stdout.trim()).toBe(ROOT);
  });

  it("keeps variables and exports across commands", async () => {
    const { run } = await session();
    await run("NAME=world");
    expect((await run("echo hi-$NAME")).stdout.trim()).toBe("hi-world");

    await run("export COUNT=3");
    expect((await run("echo count=$COUNT")).stdout.trim()).toBe("count=3");
  });

  it("keeps functions across commands, latest definition winning", async () => {
    const { run } = await session();
    await run("greet() { echo hello $1; }");
    expect((await run("greet there")).stdout.trim()).toBe("hello there");

    await run("greet() { echo HI $1; }");
    expect((await run("greet again")).stdout.trim()).toBe("HI again");
  });

  it("does not remember a definition that failed to parse", async () => {
    const { run } = await session();
    const broken = await run("oops() { echo ");
    expect(broken.exitCode).not.toBe(0);
    expect((await run("oops")).stderr).toContain("command not found");
  });

  it("resolves relative paths against the carried directory", async () => {
    const { run } = await session();
    await run("cd src");
    await run("printf 'made\\n' > made.txt");
    expect((await run("cat made.txt")).stdout.trim()).toBe("made");
    // Written where the learner actually was, not at the root.
    expect((await run(`cat ${ROOT}/src/made.txt`)).stdout.trim()).toBe("made");
  });

  it("still reports a failed command rather than throwing", async () => {
    const { run } = await session();
    const r = await run("cat nope.txt");
    expect(r.exitCode).not.toBe(0);
    expect(r.stderr).toContain("No such file");
  });

  it("leaves the plain runner stateless, for scripted seeding", async () => {
    // Scenario setup is a script, not a session: it must not inherit or leak
    // a working directory.
    const { bash } = await session();
    await runCommand(bash, "cd src");
    expect((await runCommand(bash, "pwd")).stdout.trim()).toBe(ROOT);
  });
});
