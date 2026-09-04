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

describe("definitions are remembered, lines are not (BG-01)", () => {
  it("remembers the function and forgets the call that shared its line", async () => {
    const { run } = await session();
    expect((await run(`greet(){ echo "hi $1"; }; greet a`)).stdout).toBe("hi a\n");
    expect((await run("greet b")).stdout).toBe("hi b\n");
    expect((await run(`echo "next command"`)).stdout).toBe("next command\n");
    expect((await run("ls")).stdout).not.toContain("hi a");
  });

  it("does not repeat a redirection that shared a line with a definition", async () => {
    const { run } = await session();
    await run("f(){ :; }; echo X >> t");
    await run("");
    await run("");
    await run("");
    expect((await run("wc -l t")).stdout.trim()).toBe("1 t");
  });

  it("prints ONCE once", async () => {
    const { run } = await session();
    expect((await run("g(){ :; }; echo ONCE")).stdout).toBe("ONCE\n");
    for (const cmd of ["pwd", "ls", "echo after", "g"]) {
      expect((await run(cmd)).stdout).not.toContain("ONCE");
    }
  });

  it("forgets a function after unset -f, and after a bare unset with no variable of that name", async () => {
    const { run } = await session();
    await run("greet(){ echo hi; }");
    expect((await run("greet")).stdout).toBe("hi\n");
    await run("unset -f greet");
    expect((await run("greet")).stderr).toContain("command not found");

    await run("again(){ echo again; }");
    await run("unset again");
    expect((await run("again")).stderr).toContain("command not found");
  });

  it("keeps a multi-line function body and one defined inside a group", async () => {
    const { run } = await session();
    await run("two() {\n  local x=1\n  echo two-$x\n}");
    expect((await run("two")).stdout).toBe("two-1\n");
    await run("{ inner(){ echo inner; }; }");
    expect((await run("inner")).stdout).toBe("inner\n");
  });

  it("does not keep a definition that only runs inside a branch that did not", async () => {
    const { run } = await session();
    await run("if false; then never(){ echo no; }; fi");
    expect((await run("never")).stderr).toContain("command not found");
  });
});

describe("shell fidelity (BG-15, BG-16, BG-27)", () => {
  it("keeps aliases across lines, on the line they are defined too", async () => {
    const { run } = await session();
    const same = await run(`alias hi='echo hello'; hi`);
    expect(same.stdout).toBe("hello\n");
    expect((await run("hi there")).stdout).toBe("hello there\n");
    await run("unalias hi");
    expect((await run("hi")).stderr).toContain("command not found");
  });

  it("says that there is no standard input rather than returning silently", async () => {
    const { run } = await session();
    const cat = await run("cat > newfile.txt");
    expect(cat.stderr).toContain("no standard input");
    expect((await run("read name")).stderr).toContain("no standard input");
    // A filter with something to read is not the same case.
    expect((await run("cat a.txt")).stderr).toBe("");
    expect((await run("echo x | cat")).stderr).toBe("");
    expect((await run("grep A a.txt")).stderr).toBe("");
  });

  it("answers $SHELL and $USER", async () => {
    const { run } = await session();
    expect((await run("echo $USER:$SHELL")).stdout.trim()).toBe("user:/bin/bash");
  });

  it("rewords an execution limit without naming the option that sets it", async () => {
    const { store } = createGitFs();
    await store.mkdir(ROOT, { recursive: true });
    const bash = new Bash({ fs: store as never, cwd: ROOT, executionLimits: { maxCommandCount: 50 } });
    const shell = new ShellSession(ROOT);
    const r = await shell.run(bash, "i=0; while [ $i -lt 1000 ]; do i=$((i+1)); done");
    expect(r.exitCode).not.toBe(0);
    expect(r.stderr).not.toContain("executionLimits");
    expect(r.stderr).toContain("keep the page responsive");
  });
});

describe("an unfinished line asks for more (BG-07)", () => {
  it("reports an open if as incomplete, and runs it once fi arrives", async () => {
    const { run } = await session();
    const open = await run("if true; then echo yes");
    expect(open.incomplete).toBe(true);
    expect(open.stdout).toBe("");
    expect(open.stderr).toContain("unexpected end of file");
    expect(open.stderr).not.toContain("Parse error");
    expect((await run("if true; then echo yes\nfi")).stdout).toBe("yes\n");
  });

  it.each([
    "for i in 1 2; do",
    "case x in",
    "f() {",
    "( echo",
    "echo 'open",
    'echo "open',
    "echo $(ls",
    "echo foo |",
    "echo foo &&",
    "echo foo \\",
    "cat <<EOF\nhello",
  ])("treats %j as incomplete", async (line) => {
    const { run } = await session();
    expect((await run(line)).incomplete).toBe(true);
    expect(ShellSession.incomplete(line)).toBe(true);
  });

  it("does not mistake a real syntax error or a finished line for an unfinished one", async () => {
    const { run } = await session();
    const bad = await run("fi");
    expect(bad.incomplete).toBeUndefined();
    expect(bad.exitCode).toBe(2);
    expect(bad.stderr).toContain("syntax error near unexpected token `fi'");
    expect(ShellSession.incomplete("echo done")).toBe(false);
    expect(ShellSession.incomplete("echo 'a\\\\'")).toBe(false);
    expect(ShellSession.incomplete("cat <<EOF\nhello\nEOF")).toBe(false);
  });

  it("reports the error against the typed line, not the prelude", async () => {
    const { run } = await session();
    await run("a(){ :; }");
    await run("b(){ :; }");
    const r = await run("if true; then echo yes");
    expect(r.stderr).not.toMatch(/\d+:\d+/);
  });
});
