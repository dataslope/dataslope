import { describe, it, expect } from "vitest";
import {
  isConflicted,
  narrate,
  suggest,
  stepDone,
  stepKey,
  resolveConflicts,
  hasConflictMarkers,
} from "@/app/_components/git/repoFacts";
import { placeFiles } from "@/app/_components/git/AreasBoxes";
import { EMPTY_STATE, type FileStatus, type RepoState } from "@/app/_components/git/protocol";

const file = (path: string, head: number, workdir: number, stage: number): FileStatus => ({
  path,
  head,
  workdir,
  stage,
});

const repo = (over: Partial<RepoState>): RepoState => ({
  ...EMPTY_STATE,
  initialized: true,
  head: { branch: "main", oid: "abcdef0123", detached: false },
  branches: ["main"],
  ...over,
});

const commit = (oid: string, parents: string[] = [], refs: string[] = []) => ({
  oid,
  message: `Commit ${oid}`,
  parents,
  author: "A",
  timestamp: 0,
  refs,
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

describe("narrate", () => {
  it("says what git add did", () => {
    const before = repo({ files: [file("README.md", 1, 2, 1)] });
    const after = repo({ files: [file("README.md", 1, 2, 2)] });
    expect(narrate(before, after)).toBe("README.md moved to the staging area.");
  });

  it("says what git commit did, and names a merge", () => {
    const before = repo({ commits: [commit("aaaaaaa1")] });
    const after = repo({ commits: [commit("bbbbbbb2", ["aaaaaaa1"]), commit("aaaaaaa1")] });
    expect(narrate(before, after)).toBe("New commit bbbbbbb on main.");
    const merged = repo({
      commits: [commit("ccccccc3", ["bbbbbbb2", "ddddddd4"]), commit("bbbbbbb2")],
    });
    expect(narrate(after, merged)).toBe("Merged into main as ccccccc.");
  });

  it("follows the merge lifecycle", () => {
    const clean = repo({});
    const stopped = repo({ merging: "rename", files: [file("config.yml", 1, 2, 3)] });
    expect(narrate(clean, stopped)).toBe("Merge stopped: config.yml has a conflict.");
    expect(narrate(stopped, repo({}))).toBe("Merge aborted.");
    const finished = repo({ commits: [commit("eeeeeee5", ["a", "b"])] });
    expect(narrate(stopped, finished)).toBe("Merged rename into main.");
    // Marking the file resolved keeps the merge open; that is worth a line.
    const resolved = repo({ merging: "rename", files: [file("config.yml", 1, 2, 2)] });
    expect(narrate(stopped, resolved)).toBe("config.yml marked as resolved. Finish the merge with git commit.");
  });

  it("notices branches and switches", () => {
    const main = repo({});
    const created = repo({ branches: ["main", "feature"] });
    expect(narrate(main, created)).toBe("Created branch feature.");
    const onFeature = repo({ branches: ["main", "feature"], head: { branch: "feature", oid: "x", detached: false } });
    expect(narrate(created, onFeature)).toBe("Switched to feature.");
  });

  it("stays quiet when nothing changed", () => {
    const s = repo({ files: [file("a.txt", 1, 1, 1)] });
    expect(narrate(s, { ...s })).toBeNull();
  });
});

describe("suggest", () => {
  it("offers git init before a repository exists", () => {
    expect(suggest(repo({ initialized: false })).map((s) => s.command)).toEqual([
      "git init",
      "printf 'hello\\n' > notes.txt",
    ]);
  });

  it("offers staging for an edit, then committing once staged", () => {
    const edited = repo({ files: [file("README.md", 1, 2, 1)], commits: [commit("a")] });
    expect(suggest(edited)[0]).toEqual({ label: "Stage README.md", command: "git add README.md" });
    const staged = repo({ files: [file("README.md", 1, 2, 2)], commits: [commit("a")] });
    expect(suggest(staged)[0].command).toBe('git commit -m "Describe the change"');
  });

  it("walks a conflict to its end", () => {
    const s = repo({ merging: "rename", files: [file("config.yml", 1, 2, 3)] });
    expect(suggest(s).map((x) => x.command)).toEqual([
      "git add config.yml",
      'git commit -m "Merge rename"',
      "git merge --abort",
    ]);
  });

  it("suggests branch work on a clean tree", () => {
    const s = repo({ commits: [commit("a")], branches: ["main", "feature"] });
    expect(suggest(s).map((x) => x.command)).toEqual([
      "git log --oneline --all",
      "git checkout feature",
      "git merge feature",
    ]);
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
