/**
 * What the Java playground asks CheerpJ to do, in order.
 *
 * CheerpJ is a ~30 MB browser download, so the run sequence is exercised
 * here against a stand-in. The one rule the stand-in models faithfully is
 * javac's about `-d`: the output directory has to exist already, because
 * javac creates the package subdirectories under it and nothing else.
 * Handed one that does not, it compiles nothing and prints
 * `javac: directory not found` — checked against the tools.jar this
 * playground ships. Nothing in Node enforces that rule, which is how a
 * per-run output directory that was never created reached production.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import type { CheerpJApi } from "../app/_components/runtime/cheerpj";
import { CLASSES_ROOT, LAUNCHER_CLASS } from "../app/_components/runtime/javaBuild";
import type { OutputCell } from "../app/_components/types";

// The adapter builds JSX (packagesFooter); stub React so it imports in Node.
vi.mock("react", () => ({ default: { createElement: () => null } }));

vi.mock("../app/_components/runtime/cheerpj", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../app/_components/runtime/cheerpj")>();
  return {
    ...actual,
    loadCheerpJ: async () => {
      if (!cheerpj) throw new Error("no CheerpJ stand-in for this test");
      return cheerpj.api;
    },
  };
});

import { javaAdapter } from "../app/_components/runtime/java";

const JAVAC = "com.sun.tools.javac.Main";
const HELLO = `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, Java Playground!");
    }
}
`;

interface RunCall {
  mainClass: string;
  classPath: string;
  args: string[];
  exitCode: number;
}

/** A CheerpJ whose filesystem is a set of paths and whose `javac` only
 *  cares whether `-d` names a directory that is in it. */
function fakeCheerpJ() {
  const dirs = new Set(["/files"]);
  const files = new Map<string, string>();
  const runs: RunCall[] = [];
  const dirOf = (path: string) => path.replace(/\/+$/, "");

  const api: CheerpJApi = {
    async cheerpjRunMain(mainClass, classPath, ...args) {
      let exitCode = 0;
      if (mainClass === JAVAC) {
        const outputDir = args[args.indexOf("-d") + 1];
        if (!dirs.has(dirOf(outputDir))) {
          // javac's own words, via the console CheerpJ writes to.
          console.log(
            `javac: directory not found: ${outputDir}\n` +
              "Usage: javac <options> <source files>\n" +
              "use -help for a list of possible options\n",
          );
          exitCode = 2;
        }
      }
      runs.push({ mainClass, classPath, args, exitCode });
      return exitCode;
    },
    cheerpjAddStringFile(path, data) {
      files.set(path, new TextDecoder().decode(data));
    },
    // Walks down like the real one: a level whose parent is missing cannot
    // be created, and an existing level is left alone.
    async mkdirp(path) {
      const parts = dirOf(path).split("/").filter(Boolean);
      let dir = "";
      for (const part of parts.slice(1)) {
        dir = `${dir || "/files"}/${part}`;
        const parent = dir.slice(0, dir.lastIndexOf("/"));
        if (!dirs.has(parent)) {
          throw new Error(`CheerpJ could not create the directory ${dir}.`);
        }
        dirs.add(dir);
      }
    },
  };
  return { api, dirs, files, runs };
}

let cheerpj: ReturnType<typeof fakeCheerpJ> | null = null;
let consoleLog: typeof console.log;
let consoleError: typeof console.error;

beforeEach(() => {
  // The runtime installs a permanent console hook to catch CheerpJ's
  // output; put Node's back afterwards.
  consoleLog = console.log;
  consoleError = console.error;
  cheerpj = fakeCheerpJ();
});

afterEach(() => {
  console.log = consoleLog;
  console.error = consoleError;
  cheerpj = null;
});

/** Boot the playground and run `code`, collecting what reached the panel. */
async function bootAndRun(code: string, times = 1) {
  const runtime = await javaAdapter.init(() => {});
  const cells: Omit<OutputCell, "id" | "elapsed">[] = [];
  for (let i = 0; i < times; i++) {
    await runtime.run(code, (cell) => {
      cells.push(cell);
    });
  }
  return cells;
}

const javacRuns = () => cheerpj!.runs.filter((r) => r.mainClass === JAVAC);
const outputDirOf = (run: RunCall) => run.args[run.args.indexOf("-d") + 1];

describe("Java playground run sequence", () => {
  it("compiles the warm-up program into a directory it created first", async () => {
    await javaAdapter.init(() => {});

    const warmUp = javacRuns()[0];
    expect(warmUp, "expected a warm-up compile").toBeTruthy();
    expect(warmUp.exitCode).toBe(0);
    expect(cheerpj!.dirs).toContain(outputDirOf(warmUp).replace(/\/+$/, ""));
    // Exit 0 is what lets the warm-up run reach the JVM at all.
    expect(cheerpj!.runs.some((r) => r.mainClass !== JAVAC)).toBe(true);
  });

  it("compiles a run into a directory it created first", async () => {
    const cells = await bootAndRun(HELLO);

    const compile = javacRuns().at(-1)!;
    const outputDir = outputDirOf(compile);
    expect(outputDir.startsWith(`${CLASSES_ROOT}/`)).toBe(true);
    expect(cheerpj!.dirs).toContain(outputDir.replace(/\/+$/, ""));
    expect(compile.exitCode).toBe(0);
    // The classes root itself is made on the way down.
    expect(cheerpj!.dirs).toContain(CLASSES_ROOT);

    // Nothing to report: the regression put javac's usage text here.
    expect(cells.filter((c) => c.type === "stderr")).toEqual([]);
    const launch = cheerpj!.runs.at(-1)!;
    expect(launch.mainClass).toBe(LAUNCHER_CLASS);
    expect(launch.classPath).toBe(outputDir);
  });

  it("gives every run its own class directory", async () => {
    await bootAndRun(HELLO, 3);

    // Drop the warm-up compile; the rest are one per run.
    const dirs = javacRuns()
      .slice(1)
      .map((run) => outputDirOf(run));
    expect(dirs).toHaveLength(3);
    expect(new Set(dirs).size).toBe(3);
    for (const dir of dirs) {
      expect(dir.startsWith(`${CLASSES_ROOT}/`)).toBe(true);
      expect(cheerpj!.dirs).toContain(dir.replace(/\/+$/, ""));
    }
  });
});
