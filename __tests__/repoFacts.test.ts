import { describe, it, expect } from "vitest";
import {
  isConflicted,
  stepDone,
  stepKey,
  resolveConflicts,
  hasConflictMarkers,
} from "@/app/_components/git/repoFacts";
import { placeFiles } from "@/app/_components/git/AreasBoxes";
import type { FileStatus } from "@/app/_components/git/protocol";

const file = (path: string, head: number, workdir: number, stage: number): FileStatus => ({
  path,
  head,
  workdir,
  stage,
});

describe("isConflicted", () => {
  it("needs a merge in progress and both areas off HEAD", () => {
    const f = file("config.yml", 1, 2, 3);
    expect(isConflicted(f, "rename")).toBe(true);
    expect(isConflicted(f, null)).toBe(false);
    expect(isConflicted(file("config.yml", 1, 2, 1), "rename")).toBe(false);
    // Staged and unchanged since is not a conflict, whatever the merge says.
    expect(isConflicted(file("config.yml", 1, 2, 2), "rename")).toBe(false);
  });
});

describe("placeFiles", () => {
  it("puts each file in the box of its most pending state", () => {
    const chips = placeFiles(
      [
        file("untracked.txt", 0, 2, 0),
        file("edited.txt", 1, 2, 1),
        file("staged.txt", 1, 2, 2),
        file("both.txt", 1, 2, 3),
        file("clean.txt", 1, 1, 1),
        file("gone.txt", 1, 0, 1),
      ],
      null,
    );
    const by = Object.fromEntries(chips.map((c) => [c.path, c]));
    expect(by["untracked.txt"]).toMatchObject({ area: "work", word: "new" });
    expect(by["edited.txt"]).toMatchObject({ area: "work", word: "modified" });
    expect(by["staged.txt"]).toMatchObject({ area: "stage", word: "staged" });
    expect(by["both.txt"]).toMatchObject({ area: "stage", word: "staged, edited since" });
    expect(by["clean.txt"]).toMatchObject({ area: "head", tone: "clean" });
    expect(by["gone.txt"]).toMatchObject({ area: "work", word: "deleted" });
  });

  it("calls a conflicted file a conflict, not staged-then-edited", () => {
    const [chip] = placeFiles([file("config.yml", 1, 2, 3)], "rename");
    // Unmerged work lives on disk, in the working directory, never "ready".
    expect(chip).toMatchObject({ area: "work", word: "conflict", tone: "conflict" });
  });
});

describe("stepDone", () => {
  it("matches on the subcommand, and on the target where the target matters", () => {
    expect(stepKey("git add README.md")).toBe("git add");
    expect(stepKey("git checkout -b feature")).toBe("git checkout feature");
    expect(stepKey("printf 'x' > a.txt")).toBe("printf");
    expect(stepDone({ command: "git add README.md" }, ["git status", "git add ."])).toBe(true);
    expect(stepDone({ command: "git checkout feature" }, ["git checkout main"])).toBe(false);
    expect(stepDone({ command: "git checkout feature" }, ["git checkout feature"])).toBe(true);
  });
});

describe("resolveConflicts", () => {
  const text = "title: x\n<<<<<<< HEAD\nmine\n=======\ntheirs\n>>>>>>> rename\nauthor: y\n";
  it("keeps one side or both and leaves the rest alone", () => {
    expect(hasConflictMarkers(text)).toBe(true);
    expect(resolveConflicts(text, "mine")).toBe("title: x\nmine\nauthor: y\n");
    expect(resolveConflicts(text, "theirs")).toBe("title: x\ntheirs\nauthor: y\n");
    expect(resolveConflicts(text, "both")).toBe("title: x\nmine\ntheirs\nauthor: y\n");
    expect(hasConflictMarkers(resolveConflicts(text, "both"))).toBe(false);
  });
});
