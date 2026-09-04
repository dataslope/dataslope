import { describe, it, expect } from "vitest";
import { HOME, displayCwd } from "@/app/_components/bash/prompt";
import { SESSION_ROOTS } from "@/app/_components/git/protocol";

describe("displayCwd", () => {
  it("writes the home directory as a tilde", () => {
    expect(displayCwd(HOME)).toBe("~");
  });

  it("writes directories under it relative to the tilde", () => {
    expect(displayCwd(`${HOME}/src`)).toBe("~/src");
    expect(displayCwd(`${HOME}/src/lib`)).toBe("~/src/lib");
  });

  it("leaves anywhere else absolute, as a real prompt does", () => {
    expect(displayCwd("/tmp")).toBe("/tmp");
    expect(displayCwd("/home/other")).toBe("/home/other");
    // A prefix match that is not a path boundary is not the home directory.
    expect(displayCwd("/home/userland")).toBe("/home/userland");
  });

  it("keeps a Git session's root out of the shell's home", () => {
    expect(SESSION_ROOTS.git).not.toBe(SESSION_ROOTS.bash);
    expect(displayCwd(SESSION_ROOTS.git)).toBe(SESSION_ROOTS.git);
  });
});
