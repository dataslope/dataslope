/**
 * What the Java playground compiles and launches.
 *
 * CheerpJ is a ~30 MB CDN download, so the decisions made before it is
 * called — which class to start, what the launcher does once it is running,
 * and how javac's output reads — are exercised here. The launcher is real
 * Java, so where a JDK is on the machine it is compiled and run for real:
 * the claims about thread names, EOF on `System.in` and the shape of a
 * stack trace are claims about a JVM, not about string assembly.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  annotateJava8,
  buildLauncherSource,
  buildWarmupSource,
  declaredMainClass,
  findMainClassName,
  hasJavaMain,
  java8Notes,
  LAUNCHER_CLASS,
  LAUNCHER_FILENAME,
  packageOf,
  resolveEntryPoint,
  stripSourceDir,
} from "../app/_components/runtime/javaBuild";
import { JavaOutputRouter } from "../app/_components/runtime/javaOutput";

describe("packageOf", () => {
  it("is null for the default package", () => {
    expect(packageOf("public class Main {}\n")).toBeNull();
  });

  it("reads a package declaration", () => {
    expect(packageOf("package myapp;\n\npublic class Main {}\n")).toBe("myapp");
  });

  it("reads a dotted package, whitespace and all", () => {
    expect(packageOf("package  com . example . util ;\nclass A {}")).toBe(
      "com.example.util",
    );
  });

  it("ignores a package keyword inside a comment", () => {
    expect(packageOf("// package myapp;\npublic class Main {}")).toBeNull();
    expect(packageOf("/* package myapp; */\npublic class Main {}")).toBeNull();
  });

  it("ignores a package keyword inside a string", () => {
    expect(
      packageOf('class Main { String s = "\\npackage myapp;"; }'),
    ).toBeNull();
  });
});

describe("declaredMainClass", () => {
  it("prefers the class that declares main", () => {
    const source = `class Helper { void go() {} }
public class Runner {
    public static void main(String[] args) {}
}`;
    expect(declaredMainClass(source)).toBe("Runner");
  });

  it("does not mistake a nested class for a top-level one", () => {
    const source = `public class Outer {
    static class Inner {
        public static void main(String[] args) {}
    }
}`;
    expect(declaredMainClass(source)).toBe("Outer");
  });

  it("falls back to the public class when nothing declares main", () => {
    expect(declaredMainClass("class A {}\npublic class B {}")).toBe("B");
  });

  it("is null when the file declares no class", () => {
    expect(declaredMainClass("")).toBeNull();
    expect(declaredMainClass("import java.util.*;\n")).toBeNull();
  });

  it("still hands javac a name to complain about", () => {
    expect(findMainClassName("")).toBe("Main");
  });
});

describe("hasJavaMain", () => {
  it("finds main however it is spelled", () => {
    expect(hasJavaMain("public static void main(String[] a) {}")).toBe(true);
    expect(hasJavaMain("static public void main(String... a) {}")).toBe(true);
  });

  it("does not count main inside a string or comment", () => {
    expect(hasJavaMain('String s = "public static void main(";')).toBe(false);
    expect(hasJavaMain("// public static void main(String[] a)")).toBe(false);
  });
});

describe("resolveEntryPoint", () => {
  it("qualifies the class with its package", () => {
    // JV-01: the launcher used to invoke the filename, so a `package` line
    // sent the compiled class to myapp/Main.class while `Main` still
    // resolved — to whatever an earlier compile had left behind.
    const entry = resolveEntryPoint(
      "package myapp;\n\npublic class Main {\n    public static void main(String[] a) {}\n}",
      "Main.java",
    );
    expect(entry).toEqual({
      className: "Main",
      packageName: "myapp",
      binaryName: "myapp.Main",
    });
  });

  it("launches the class the file declares, not the file", () => {
    const entry = resolveEntryPoint(
      "class Calculator {\n    public static void main(String[] a) {}\n}",
      "App.java",
    );
    expect(entry.binaryName).toBe("Calculator");
  });

  it("uses the filename when the file declares nothing", () => {
    expect(resolveEntryPoint("", "App.java").binaryName).toBe("App");
    expect(resolveEntryPoint("", "src/App.java").binaryName).toBe("App");
  });

  it("has an answer with no filename at all", () => {
    expect(resolveEntryPoint("").binaryName).toBe("Main");
  });
});

describe("stripSourceDir", () => {
  it("removes the virtual directory the user has never seen", () => {
    // JV-10: /str/ is CheerpJ's host-populated mount and it prefixed every
    // error and warning the playground printed.
    const diagnostics =
      "/str/Main.java:6: error: cannot find symbol\n" +
      '        var name = "Ada";\n' +
      "        ^\n" +
      "/str/Greeter.java:13: error: incompatible types\n";
    expect(stripSourceDir(diagnostics, "/str/")).toBe(
      "Main.java:6: error: cannot find symbol\n" +
        '        var name = "Ada";\n' +
        "        ^\n" +
        "Greeter.java:13: error: incompatible types\n",
    );
  });

  it("only strips at the start of a line", () => {
    expect(stripSourceDir('String p = "/str/x";', "/str/")).toBe(
      'String p = "/str/x";',
    );
  });
});

describe("java8Notes", () => {
  // Verbatim javac output for the audit's six-line repro, captured from a
  // real javac at -source 8.
  const modernApiDiagnostics = `Main.java:6: error: cannot find symbol
        var name = "Ada";
        ^
  symbol:   class var
  location: class Main
Main.java:7: error: cannot find symbol
        List<String> xs = List.of("a", "b", "c");
                              ^
  symbol:   method of(String,String,String)
  location: interface List
Main.java:8: error: cannot find symbol
        Map<String,Integer> m = Map.of("k", 1);
                                   ^
  symbol:   method of(String,int)
  location: interface Map
Main.java:9: error: cannot find symbol
        String r = "ab".repeat(3);
                       ^
  symbol:   method repeat(int)
  location: class String
Main.java:10: error: cannot find symbol
        boolean b = "  ".isBlank();
                        ^
  symbol:   method isBlank()
  location: class String
Main.java:11: error: cannot find symbol
        List<String> ys = xs.stream().toList();
                                     ^
  symbol:   method toList()
  location: interface Stream<String>
6 errors`;

  it("names the language level behind each cannot-find-symbol", () => {
    expect(java8Notes(modernApiDiagnostics, [])).toEqual([
      "`var` (Java 10)",
      "`List.of` / `Set.of` / `Map.of` (Java 9)",
      "`String.repeat` / `isBlank` / `strip` / `lines` (Java 11)",
      "`Stream.toList` (Java 16)",
    ]);
  });

  it("says nothing about an ordinary typo", () => {
    const typo = `Main.java:3: error: cannot find symbol
        System.out.printn("hi");
                  ^
  symbol:   method printn(String)
  location: variable out of type PrintStream
1 error`;
    expect(java8Notes(typo, ["class Main {}"])).toEqual([]);
  });

  it("attributes syntax that never reaches a symbol lookup", () => {
    expect(java8Notes("", ['String s = """\nhi\n""";'])).toEqual([
      'text blocks (`"""`) (Java 15)',
    ]);
    expect(java8Notes("", ["public record Point(int x, int y) {}"])).toEqual([
      "`record` declarations (Java 16)",
    ]);
    expect(java8Notes("", ["switch (n) {\n    case 1 -> print();\n}"])).toEqual(
      ["arrow `switch` (Java 14)"],
    );
    expect(java8Notes("", ["if (o instanceof String s) { }"])).toEqual([
      "`instanceof` pattern matching (Java 16)",
    ]);
    expect(
      java8Notes("", ["public sealed interface Shape permits Circle {}"]),
    ).toEqual(["`sealed` types (Java 17)"]);
  });

  it("does not fire on Java 8 that only mentions the syntax", () => {
    // A note that appeared on correct Java 8 would be worse than no note.
    const java8 = `class Main {
    // record Point(int x, int y) {} is Java 16
    String arrow = "case 1 -> two";
    boolean b = o instanceof String;
    void go() { switch (n) { case 1: break; } }
}`;
    expect(java8Notes("", [java8])).toEqual([]);
  });

  it("reports each feature once across a multi-file workspace", () => {
    expect(
      java8Notes("", ["var a = 1;\nrecord A() {}", "record B() {}"]),
    ).toEqual(["`record` declarations (Java 16)"]);
  });
});

describe("annotateJava8", () => {
  it("appends the explanation the error text withholds", () => {
    const annotated = annotateJava8(
      "Main.java:6: error: cannot find symbol\n  symbol:   class var\n  location: class Main\n1 error",
      [],
    );
    expect(annotated).toContain(
      "This playground runs Java 8, and the code above uses newer Java:",
    );
    expect(annotated).toContain("  • `var` (Java 10)");
  });

  it("leaves an unrelated failure alone", () => {
    const diagnostics = "Main.java:3: error: ';' expected\n1 error";
    expect(annotateJava8(diagnostics, ["class Main { int x }"])).toBe(
      diagnostics,
    );
  });
});

/**
 * The launcher is the part of this playground that is Java rather than
 * TypeScript, and every claim it makes — the thread is named `main`,
 * `System.in` ends, a missing class is a message rather than a crash — is a
 * claim about a JVM. So it is compiled and run on one.
 */
describe("against a real JDK", () => {
  const jdk = (() => {
    try {
      execFileSync("javac", ["-version"], { stdio: "pipe" });
      return true;
    } catch {
      return false;
    }
  })();

  /** This sandbox injects JAVA_TOOL_OPTIONS, which every JVM echoes to
   *  stderr on startup; unset it so the traces under test are the traces.
   *  An empty value is not enough — the JVM still announces it. */
  const env = { ...process.env };
  delete env.JAVA_TOOL_OPTIONS;
  delete env._JAVA_OPTIONS;

  /** Compile sources at Java 8 and return javac's diagnostics. */
  function compile(dir: string, sources: Record<string, string>): string {
    for (const [name, content] of Object.entries(sources)) {
      writeFileSync(join(dir, name), content);
    }
    const result = spawnSync(
      "javac",
      [
        "--release",
        "8",
        "-g:lines,source",
        "-Xlint",
        "-d",
        "out",
        ...Object.keys(sources),
      ],
      { cwd: dir, encoding: "utf8", env },
    );
    // -Xlint at --release 8 warns about the release itself, which the real
    // toolchain (a Java 8 javac) cannot say.
    return (result.stderr ?? "")
      .split("\n")
      .filter((line) => !/\[options\]|warnings?$/.test(line))
      .join("\n")
      .trim();
  }

  function run(dir: string, mainClass: string) {
    return spawnSync("java", ["-cp", "out", mainClass], {
      cwd: dir,
      encoding: "utf8",
      env,
    });
  }

  it.skipIf(!jdk)("compiles clean under -Xlint at Java 8", () => {
    const dir = mkdtempSync(join(tmpdir(), "ds-java-"));
    const diagnostics = compile(dir, {
      [LAUNCHER_FILENAME]: buildLauncherSource({
        binaryName: "myapp.Main",
        stdinPath: join(dir, "stdin"),
        vmVersion: "4.3",
        classesDirName: "r1",
      }),
      "__DataslopeWarmup.java": buildWarmupSource("__DataslopeWarmup"),
    });
    expect(diagnostics).toBe("");
  });

  it.skipIf(!jdk)(
    "runs a class in a package, and names the thread main",
    () => {
      // JV-01 and JV-04: the packaged class is what runs, and a crash reads
      // `Exception in thread "main"` rather than `"Thread-0"`.
      const dir = mkdtempSync(join(tmpdir(), "ds-java-"));
      expect(
        compile(dir, {
          "Main.java": `package myapp;

public class Main {
    public static void main(String[] args) {
        System.out.println("VERSION TWO");
        System.out.println("thread = " + Thread.currentThread().getName());
    }
}
`,
          [LAUNCHER_FILENAME]: buildLauncherSource({
            binaryName: resolveEntryPoint(
              "package myapp;\npublic class Main { public static void main(String[] a) {} }",
              "Main.java",
            ).binaryName,
            stdinPath: null,
            vmVersion: "4.3",
            classesDirName: "r1",
          }),
        }),
      ).toBe("");
      const result = run(dir, LAUNCHER_CLASS);
      expect(result.stdout).toBe("VERSION TWO\nthread = main\n");
      expect(result.status).toBe(0);
    },
  );

  it.skipIf(!jdk)("hands Scanner an end of input instead of a wait", () => {
    // JV-05: `new Scanner(System.in).hasNextLine()` hung forever, with no
    // Stop control and no prompt on screen.
    const dir = mkdtempSync(join(tmpdir(), "ds-java-"));
    expect(
      compile(dir, {
        "Main.java": `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        System.out.println("hasNextLine = " + sc.hasNextLine());
    }
}
`,
        [LAUNCHER_FILENAME]: buildLauncherSource({
          binaryName: "Main",
          stdinPath: null,
          vmVersion: "4.3",
          classesDirName: "r1",
        }),
      }),
    ).toBe("");
    expect(run(dir, LAUNCHER_CLASS).stdout).toBe("hasNextLine = false\n");
  });

  it.skipIf(!jdk)("reads stdin from the file the workspace supplies", () => {
    const dir = mkdtempSync(join(tmpdir(), "ds-java-"));
    writeFileSync(join(dir, "stdin"), "Ada\n42\n");
    expect(
      compile(dir, {
        "Main.java": `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        System.out.println("name = " + sc.nextLine());
        System.out.println("n = " + (sc.nextInt() * 2));
    }
}
`,
        [LAUNCHER_FILENAME]: buildLauncherSource({
          binaryName: "Main",
          stdinPath: join(dir, "stdin"),
          vmVersion: "4.3",
          classesDirName: "r1",
        }),
      }),
    ).toBe("");
    expect(run(dir, LAUNCHER_CLASS).stdout).toBe("name = Ada\nn = 84\n");
  });

  it.skipIf(!jdk)(
    "says so when the class it was told to launch is absent",
    () => {
      const dir = mkdtempSync(join(tmpdir(), "ds-java-"));
      expect(
        compile(dir, {
          [LAUNCHER_FILENAME]: buildLauncherSource({
            binaryName: "Nowhere",
            stdinPath: null,
            vmVersion: "4.3",
            classesDirName: "r1",
          }),
        }),
      ).toBe("");
      const result = run(dir, LAUNCHER_CLASS);
      expect(result.stderr).toContain(
        "could not find or load main class Nowhere",
      );
      expect(result.status).toBe(1);
    },
  );

  it.skipIf(!jdk)("leaves System.exit's code alone", () => {
    const dir = mkdtempSync(join(tmpdir(), "ds-java-"));
    compile(dir, {
      "Main.java":
        "public class Main { public static void main(String[] a) { System.exit(3); } }\n",
      [LAUNCHER_FILENAME]: buildLauncherSource({
        binaryName: "Main",
        stdinPath: null,
        vmVersion: "4.3",
        classesDirName: "r1",
      }),
    });
    expect(run(dir, LAUNCHER_CLASS).status).toBe(3);
  });

  it.skipIf(!jdk)("prints the trace the JVM would have printed", () => {
    // The launcher invokes main reflectively, which appends the accessor
    // frames and the launcher's own frame to every trace and inflates each
    // `... N more`. Running the same class both ways says whether the
    // cleanup puts it back exactly.
    const dir = mkdtempSync(join(tmpdir(), "ds-java-"));
    expect(
      compile(dir, {
        "Main.java": `public class Main {
    static void boom() { throw new IllegalStateException("inner"); }
    static void mid() {
        try { boom(); } catch (RuntimeException e) { throw new RuntimeException("outer", e); }
    }
    public static void main(String[] args) { mid(); }
}
`,
        [LAUNCHER_FILENAME]: buildLauncherSource({
          binaryName: "Main",
          stdinPath: null,
          vmVersion: "4.3",
          classesDirName: "r1",
        }),
      }),
    ).toBe("");

    const direct = run(dir, "Main").stderr;
    const throughLauncher = run(dir, LAUNCHER_CLASS).stderr;
    expect(throughLauncher).not.toBe(direct);
    expect(throughLauncher).toContain(LAUNCHER_CLASS);

    let cleaned = "";
    const router = new JavaOutputRouter((chunk) => {
      cleaned += chunk.content;
    });
    // CheerpJ delivers one console call per PrintStream write, which for a
    // stack trace is one call per line.
    for (const line of throughLauncher.split(/(?<=\n)/)) {
      router.write("stderr", line);
    }
    router.flush();
    expect(cleaned).toBe(direct);
  });
});
