import { describe, it, expect } from "vitest";
import { Bash } from "just-bash/browser";
import { createGitFs } from "@/app/_components/git/gitFs";
import { ShellSession } from "@/app/_components/git/runCommand";

/** The root a shell session gets; see SESSION_ROOTS. */
const HOME = "/home/user";

/**
 * The primitive the Bash playground's split terminals rest on: several
 * `ShellSession`s over one `Bash` instance and one filesystem. Same files,
 * separate working directory, environment and functions.
 */
async function machine() {
  const { store } = createGitFs();
  await store.mkdir(`${HOME}/src`, { recursive: true });
  await store.writeFile(`${HOME}/README.md`, "# hi\n");
  const bash = new Bash({ fs: store as never, cwd: HOME });
  const open = (cwd = HOME) => {
    const s = new ShellSession(cwd);
    return { session: s, run: (cmd: string) => s.run(bash, cmd) };
  };
  return { bash, open };
}

describe("two shells, one filesystem", () => {
  it("share files but not the working directory", async () => {
    const { open } = await machine();
    const one = open();
    const two = open();
    await one.run("cd src");
    expect(one.session.cwd).toBe(`${HOME}/src`);
    expect(two.session.cwd).toBe(HOME);

    await one.run("touch made-here.txt");
    expect((await two.run("ls src")).stdout).toContain("made-here.txt");
    expect((await two.run("ls")).stdout).not.toContain("made-here.txt");
  });

  it("keep variables and functions to themselves", async () => {
    const { open } = await machine();
    const one = open();
    const two = open();
    await one.run("NAME=one");
    await one.run("greet() { echo hello; }");
    expect((await one.run("echo $NAME")).stdout.trim()).toBe("one");
    expect((await two.run("echo ${NAME:-unset}")).stdout.trim()).toBe("unset");
    expect((await two.run("greet")).exitCode).not.toBe(0);
  });

  it("can open in the directory of the shell they were split from", async () => {
    const { open } = await machine();
    const one = open();
    await one.run("cd src");
    const two = open(one.session.cwd);
    expect((await two.run("pwd")).stdout.trim()).toBe(`${HOME}/src`);
  });

  it("resolve in order when run back to back without awaiting", async () => {
    const { open } = await machine();
    const one = open();
    const two = open();
    const out: string[] = [];
    // Both write to the same file; the second must see the first's line.
    await Promise.all([
      one.run("echo first >> log.txt").then(() => out.push("one")),
      two.run("echo second >> log.txt").then(() => out.push("two")),
    ]);
    const log = (await one.run("cat log.txt")).stdout.trim().split("\n");
    expect(log).toHaveLength(2);
    expect(new Set(log)).toEqual(new Set(["first", "second"]));
  });
});
