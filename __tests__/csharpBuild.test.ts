/**
 * What the C# playground sends to Roslyn, and how it reads what comes back.
 *
 * The .NET WebAssembly bundle is a CDN download in production, but the
 * published copy lives in `cdn-assets/_dotnet/`, so where it is on disk
 * these tests boot it over a loopback server and compile real C#. Every
 * claim about Roslyn — that `#line` moves a diagnostic onto the reader's
 * file, that `Console.SetIn` makes `Console.ReadLine` work, that
 * `Environment.Exit` arrives as an `ExitStatus` object — is checked against
 * the runtime rather than against a memory of it.
 */
import { createServer, type Server } from "node:http";
import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  allDiagnosticsMapped,
  composeProgram,
  csharpString,
  describeThrown,
  EXIT_OUTPUT_NOTE,
  formatUncaught,
  LAST_EXCEPTION_KEY,
  parseDiagnostics,
  renderDiagnostics,
  stripCSharpUsings,
} from "../app/_components/runtime/csharpBuild";
import {
  CSHARP_VERSION,
  DOTNET_VERSION,
  WARMUP_SCRIPT,
} from "../app/_components/runtime/dotnet";

describe("version labels", () => {
  it("say what the runtime is, in every place that says it", () => {
    // CS-10: the panel read "C# 13" and every package badge "v.NET 9",
    // understating the playground by a whole major version. The runtime's
    // own answer is checked against DOTNET_VERSION further down.
    const adapter = readFileSync(
      join(__dirname, "..", "app", "_components", "runtime", "csharp.tsx"),
      "utf-8",
    );
    const declared = /runtimeInfo:\s*\{[\s\S]*?version:\s*"([^"]+)"/.exec(
      adapter,
    );
    expect(declared?.[1]).toBe(`${CSHARP_VERSION} (.NET ${DOTNET_VERSION})`);

    const hub = readFileSync(
      join(
        __dirname,
        "..",
        "app",
        "playground",
        "_components",
        "LanguageCategories.tsx",
      ),
      "utf-8",
    );
    expect(hub).toContain(
      `{ id: "csharp", label: "C#", version: "${CSHARP_VERSION} · .NET ${DOTNET_VERSION.split(".")[0]}" }`,
    );
  });
});

describe("stripCSharpUsings", () => {
  it("reports how far into the file the body starts", () => {
    // The `#line` directive that puts the reader's numbering back needs
    // exactly this: usings are hoisted, so the body no longer starts at 1.
    const source =
      "using System;\nusing System.Linq;\n\nConsole.WriteLine(1);\n";
    expect(stripCSharpUsings(source)).toEqual({
      usings: ["using System;", "using System.Linq;"],
      body: "Console.WriteLine(1);\n",
      consumedLines: 3,
    });
  });

  it("leaves a file with no usings where it is", () => {
    expect(stripCSharpUsings("Console.WriteLine(1);").consumedLines).toBe(0);
  });

  it("counts leading comments and blank lines as consumed", () => {
    const { consumedLines, usings } = stripCSharpUsings(
      "// a note\n\nusing System;\nvar x = 1;",
    );
    expect(consumedLines).toBe(3);
    expect(usings).toEqual(["using System;"]);
  });
});

describe("composeProgram", () => {
  const entryCode =
    "using System.Linq;\n\nConsole.WriteLine(new Greeter().Hello());\n";
  const greeter =
    'using System;\n\npublic class Greeter {\n    public string Hello() => "hi";\n}\n';

  it("names every file with a #line directive", () => {
    // CS-02: without these, one combined text meant one set of line
    // numbers, none of which existed in any file the reader had open.
    const { source } = composeProgram({
      entryFilename: "Program.cs",
      entryCode,
      files: [["Greeter.cs", greeter]],
      stdin: null,
      instrument: false,
    });
    expect(source).toBe(
      [
        "using System.Linq;",
        "using System;",
        '#line 3 "Program.cs"',
        "Console.WriteLine(new Greeter().Hello());\n",
        '#line 3 "Greeter.cs"',
        'public class Greeter {\n    public string Hello() => "hi";\n}\n',
      ].join("\n"),
    );
  });

  it("puts top-level statements ahead of type declarations", () => {
    // A class file first is what produced a phantom CS8803 pointing into
    // a file the reader had not touched.
    const { source } = composeProgram({
      entryFilename: "Program.cs",
      entryCode: "Console.WriteLine(1);",
      files: [["Types.cs", "class A { }"]],
      stdin: null,
      instrument: false,
    });
    expect(source.indexOf("Console.WriteLine(1);")).toBeLessThan(
      source.indexOf("class A { }"),
    );
  });

  it("hoists and de-duplicates usings", () => {
    const { source } = composeProgram({
      entryFilename: "Program.cs",
      entryCode: "using System;\nvar x = 1;",
      files: [["B.cs", "using System;\nclass B { }"]],
      stdin: null,
      instrument: false,
    });
    expect(source.split("using System;").length - 1).toBe(1);
  });

  it("keeps the staged copy of the entry from being appended twice", () => {
    const { source } = composeProgram({
      entryFilename: "Program.cs",
      entryCode: "var fresh = 1;",
      files: [["Program.cs", "var stale = 2;"]],
      stdin: null,
      instrument: false,
    });
    expect(source).toContain("var fresh = 1;");
    expect(source).not.toContain("var stale = 2;");
  });

  it("hides the prelude from the compiler's line numbering", () => {
    const { source } = composeProgram({
      entryFilename: "Program.cs",
      entryCode: "var x = 1;",
      files: [],
      stdin: "hello\n",
      instrument: true,
    });
    expect(source).toContain("#line hidden");
    expect(source).toContain(
      'System.Console.SetIn(new System.IO.StringReader("hello\\n"));',
    );
    expect(source.indexOf("#line hidden")).toBeLessThan(
      source.indexOf('#line 1 "Program.cs"'),
    );
  });

  it("leaves stdin alone when the workspace has no stdin.txt", () => {
    const { source } = composeProgram({
      entryFilename: "Program.cs",
      entryCode: "var x = 1;",
      files: [],
      stdin: null,
      instrument: true,
    });
    expect(source).not.toContain("SetIn");
  });
});

describe("csharpString", () => {
  it("keeps a multi-line value on one line", () => {
    // The prelude is one line so the `#line` arithmetic after it is fixed.
    expect(csharpString('a\nb\t"c"\\d')).toBe('"a\\nb\\t\\"c\\"\\\\d"');
    expect(csharpString("a\nb")).not.toContain("\n");
  });

  it("escapes control characters Roslyn will not take raw", () => {
    expect(csharpString(`a${String.fromCharCode(1)}b`)).toBe('"a\\u0001b"');
  });
});

describe("parseDiagnostics", () => {
  it("reads a diagnostic that names its file", () => {
    const raw =
      "Greeter.cs(4,25): error CS0029: Cannot implicitly convert type 'string' to 'int'";
    expect(parseDiagnostics(raw)).toEqual([
      {
        filename: "Greeter.cs",
        line: 4,
        column: 25,
        severity: "error",
        code: "CS0029",
        message: "Cannot implicitly convert type 'string' to 'int'",
        raw,
      },
    ]);
  });

  it("reads one that names none", () => {
    const [diagnostic] = parseDiagnostics("(7,11): error CS0029: nope");
    expect(diagnostic.filename).toBeNull();
    expect(diagnostic.line).toBe(7);
  });

  it("keeps a line it cannot parse rather than dropping it", () => {
    const [diagnostic] = parseDiagnostics("something else entirely");
    expect(diagnostic.raw).toBe("something else entirely");
    expect(diagnostic.filename).toBeNull();
  });
});

describe("renderDiagnostics", () => {
  const sources = new Map([
    ["Program.cs", ["var a = 1;", 'int zzz = "boom";']],
    ["Greeter.cs", ["public class Greeter {", "}"]],
  ]);

  it("echoes the offending line with a caret under it", () => {
    const rendered = renderDiagnostics(
      parseDiagnostics(
        "Program.cs(2,11): error CS0029: Cannot implicitly convert type 'string' to 'int'",
      ),
      sources,
    );
    expect(rendered).toBe(
      "Program.cs(2,11): error CS0029: Cannot implicitly convert type 'string' to 'int'\n" +
        'int zzz = "boom";\n' +
        "          ^",
    );
  });

  it("sorts by position, so reading down walks down the file", () => {
    const rendered = renderDiagnostics(
      parseDiagnostics(
        "Program.cs(2,1): error CS1003: second\nProgram.cs(1,1): error CS0103: first",
      ),
      sources,
    );
    expect(rendered.indexOf("first")).toBeLessThan(rendered.indexOf("second"));
  });

  it("keeps tabs in the caret row so the caret lands under the column", () => {
    const rendered = renderDiagnostics(
      parseDiagnostics("T.cs(1,3): error CS0000: x"),
      new Map([["T.cs", ["\t\tvalue"]]]),
    );
    expect(rendered.endsWith("\n\t\t^")).toBe(true);
  });

  it("prints a diagnostic whose line is not in the file as it arrived", () => {
    const rendered = renderDiagnostics(
      parseDiagnostics("Program.cs(99,1): error CS0000: past the end"),
      sources,
    );
    expect(rendered).toBe("Program.cs(99,1): error CS0000: past the end");
  });
});

describe("allDiagnosticsMapped", () => {
  const sources = new Map([["Program.cs", ["var a = 1;"]]]);

  it("is true when every diagnostic names a file the reader has", () => {
    expect(
      allDiagnosticsMapped(
        parseDiagnostics("Program.cs(1,1): error CS0000: x"),
        sources,
      ),
    ).toBe(true);
  });

  it("is false for a diagnostic about code the reader never wrote", () => {
    expect(
      allDiagnosticsMapped(
        parseDiagnostics("(7,11): error CS0000: x"),
        sources,
      ),
    ).toBe(false);
  });
});

describe("formatUncaught", () => {
  const stashed =
    "System.Reflection.TargetInvocationException: Exception has been thrown by the target of an invocation.\n" +
    " ---> System.InvalidOperationException: deliberate uncaught\n" +
    "   at Program.<<Main>$>g__Boom|0_1()\n" +
    "   at Program.<Main>$(String[] args)\n" +
    "   at System.Reflection.MethodBaseInvoker.InterpretedInvoke_Method(Object obj, IntPtr* args)\n" +
    "   --- End of inner exception stack trace ---";

  it("reports the exception the program threw, not the reflection wrapper", () => {
    // CS-05: the type name is half the diagnosis in C#, and it never
    // appeared — the reader got the host's own wrapper sentence instead.
    expect(
      formatUncaught(
        "Exception has been thrown by the target of an invocation.\ndeliberate uncaught\n",
        stashed,
      ),
    ).toBe(
      "Unhandled exception. System.InvalidOperationException: deliberate uncaught\n" +
        "   at Boom()\n" +
        "   at top-level statements",
    );
  });

  it("ignores a stash left by an exception the program caught", () => {
    expect(
      formatUncaught(
        "Exception has been thrown by the target of an invocation.\nsomething else\n",
        "System.Exception: swallowed earlier",
      ),
    ).toBe("something else");
  });

  it("drops the wrapper even with no stash at all", () => {
    expect(
      formatUncaught(
        "Exception has been thrown by the target of an invocation.\nOperation is not supported on this platform.\n",
        null,
      ),
    ).toBe("Operation is not supported on this platform.");
  });

  it("leaves a failure that is not a reflection wrapper alone", () => {
    expect(formatUncaught("Program.cs(1,1): error CS0000: x\n", stashed)).toBe(
      "Program.cs(1,1): error CS0000: x",
    );
  });
});

describe("describeThrown", () => {
  it("reads the runtime's exit signal", () => {
    // CS-01: this object reached the output pane as the literal text
    // `[object Object]`, in place of everything the program printed.
    expect(
      describeThrown({
        name: "ExitStatus",
        message: "Program terminated with exit(3)",
        status: 3,
      }),
    ).toEqual({ message: "", exitCode: 3 });
  });

  it("never produces [object Object]", () => {
    for (const value of [
      {},
      { a: 1 },
      Object.create(null),
      new Error("boom"),
      "plain",
      undefined,
      null,
      42,
    ]) {
      expect(describeThrown(value).message).not.toBe("[object Object]");
    }
  });

  it("survives a value that cannot be serialised", () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(() => describeThrown(circular)).not.toThrow();
  });
});

/**
 * The published .NET bundle, driven for real.
 *
 * `cdn-assets/_dotnet/` is what jsDelivr serves, so booting it here
 * exercises the same `ScriptRunner.dll` the playground talks to. Assets go
 * over a loopback server because the runtime fetches them, and the JS
 * modules stay on disk because Node's ESM loader will not import over
 * http. Skipped when the bundle is not checked out.
 */
describe("against the published .NET runtime", () => {
  const BUNDLE = join(__dirname, "..", "cdn-assets", "_dotnet");
  const available = existsSync(join(BUNDLE, "dotnet.js"));

  let server: Server | undefined;
  let runScript: ((code: string) => Promise<string>) | undefined;

  beforeAll(async () => {
    if (!available) return;
    const types: Record<string, string> = {
      ".js": "text/javascript",
      ".mjs": "text/javascript",
      ".wasm": "application/wasm",
      ".json": "application/json",
    };
    server = createServer((req, res) => {
      const name = decodeURIComponent((req.url ?? "").split("?")[0]).replace(
        /^\/+/,
        "",
      );
      const file = join(BUNDLE, name);
      if (
        !file.startsWith(BUNDLE) ||
        !existsSync(file) ||
        statSync(file).isDirectory()
      ) {
        res.writeHead(404);
        res.end("not found");
        return;
      }
      res.writeHead(200, {
        "content-type": types[extname(file)] ?? "application/octet-stream",
      });
      createReadStream(file).pipe(res);
    });
    await new Promise<void>((resolve) =>
      server!.listen(0, "127.0.0.1", resolve),
    );
    const address = server!.address();
    const port = typeof address === "object" && address ? address.port : 0;
    const base = `http://127.0.0.1:${port}/`;

    // Built at runtime so the bundler leaves the import alone.
    const entry = join(BUNDLE, "dotnet.js");
    const mod = (await import(/* @vite-ignore */ entry)) as {
      dotnet: {
        withConfigSrc(src: string): typeof mod.dotnet;
        withResourceLoader(
          loader: (type: string, name: string) => string,
        ): typeof mod.dotnet;
        create(): Promise<{
          setModuleImports(
            name: string,
            imports: Record<string, unknown>,
          ): void;
          getAssemblyExports(name: string): Promise<Record<string, never>>;
        }>;
      };
    };
    const host = await mod.dotnet
      .withConfigSrc("./dotnet.boot.js")
      .withResourceLoader((_type, name) => {
        const clean = String(name).replace(/^\.?\//, "");
        return /\.m?js$/.test(clean) ? `./${clean}` : new URL(clean, base).href;
      })
      .create();
    host.setModuleImports("main.js", {
      getDotnetBundleBaseUrl: () => base,
    });
    const exports = (await host.getAssemblyExports(
      "ScriptRunner",
    )) as unknown as {
      ScriptRunner: { Runner: { RunScript(code: string): Promise<string> } };
    };
    runScript = (code) => exports.ScriptRunner.Runner.RunScript(code);
    // Exactly what the loader does after boot: pull the reference
    // assemblies and install the one exception hook.
    await runScript(WARMUP_SCRIPT);
  }, 600_000);

  afterAll(() => server?.close());

  interface ScriptResult {
    stdout: string;
    stderr: string;
    exitCode: number;
  }

  /** Compile and run, returning the host's result or the value it threw. */
  async function run(
    code: string,
  ): Promise<{ result?: ScriptResult; thrown?: unknown }> {
    try {
      return { result: JSON.parse(await runScript!(code)) as ScriptResult };
    } catch (thrown) {
      return { thrown };
    }
  }

  const stashKey = LAST_EXCEPTION_KEY as keyof typeof globalThis;
  const readStash = () =>
    (globalThis as Record<string, unknown>)[LAST_EXCEPTION_KEY] as
      | string
      | undefined;
  const clearStash = () => {
    delete (globalThis as Record<string, unknown>)[stashKey as string];
  };

  const workspace = {
    entryFilename: "Program.cs",
    entryCode:
      'using System.Linq;\n\nvar g = new Greeter(Console.ReadLine() ?? "nobody");\nConsole.WriteLine(g.Hello());\nConsole.WriteLine(new[] { 3, 1, 2 }.OrderBy(x => x).Sum());\n',
    files: [
      [
        "Greeter.cs",
        'public class Greeter {\n    private readonly string _name;\n    public Greeter(string name) { _name = name; }\n    public string Hello() => $"Hello, {_name}!";\n}\n',
      ],
    ] as Array<[string, string]>,
  };

  it.skipIf(!available)(
    "runs a multi-file workspace, reading the stdin the composer supplied",
    async () => {
      const { source } = composeProgram({
        ...workspace,
        stdin: "Ada\n",
        instrument: true,
      });
      const { result } = await run(source);
      expect(result?.stderr).toBe("");
      expect(result?.stdout).toBe("Hello, Ada!\n6\n");
      expect(result?.exitCode).toBe(0);
    },
    600_000,
  );

  it.skipIf(!available)(
    "reports an error in the second file at that file's own line",
    async () => {
      // CS-02: this used to arrive as `(18,37)` with no filename, in a
      // workspace whose longest file was 13 lines.
      const broken = workspace.files[0][1].replace(
        "public string Hello()",
        "public int Hello()",
      );
      const { source, sources } = composeProgram({
        ...workspace,
        files: [["Greeter.cs", broken]],
        stdin: null,
        instrument: true,
      });
      const { result } = await run(source);
      const diagnostics = parseDiagnostics(result!.stderr);
      expect(allDiagnosticsMapped(diagnostics, sources)).toBe(true);
      expect(diagnostics[0].filename).toBe("Greeter.cs");
      expect(diagnostics[0].line).toBe(4);
      expect(renderDiagnostics(diagnostics, sources)).toContain(
        "public int Hello()",
      );
    },
    600_000,
  );

  it.skipIf(!available)(
    "reports a one-line file's error on line 1",
    async () => {
      const { source, sources } = composeProgram({
        entryFilename: "Program.cs",
        entryCode: 'int zzz = "boom";',
        files: [],
        stdin: null,
        instrument: true,
      });
      const diagnostics = parseDiagnostics((await run(source)).result!.stderr);
      expect(diagnostics[0].filename).toBe("Program.cs");
      expect(diagnostics[0].line).toBe(1);
      // No reported line may exceed the length of the file it names.
      for (const d of diagnostics) {
        expect(d.line).toBeLessThanOrEqual(sources.get(d.filename!)!.length);
      }
    },
    600_000,
  );

  it.skipIf(!available)(
    "recovers the type and frames of an uncaught exception",
    async () => {
      // CS-05: all the reader got was the host's reflection wrapper and a
      // bare message — no type, which is half the diagnosis in C#.
      clearStash();
      const { source } = composeProgram({
        entryFilename: "Program.cs",
        entryCode:
          'void Boom() => throw new InvalidOperationException("deliberate uncaught");\nBoom();\n',
        files: [],
        stdin: null,
        instrument: true,
      });
      const { result } = await run(source);
      expect(result!.exitCode).toBe(1);
      const rendered = formatUncaught(result!.stderr, readStash());
      expect(rendered).toContain("System.InvalidOperationException");
      expect(rendered).toContain("deliberate uncaught");
      expect(rendered).not.toContain("target of an invocation");
      expect(rendered).toContain("at Boom()");
    },
    600_000,
  );

  it.skipIf(!available)(
    "does not blame a failure on an exception the program caught",
    async () => {
      clearStash();
      const { source } = composeProgram({
        entryFilename: "Program.cs",
        entryCode:
          'try { throw new Exception("swallowed"); } catch { }\nConsole.WriteLine("ok");\n',
        files: [],
        stdin: null,
        instrument: true,
      });
      const { result } = await run(source);
      expect(result!.exitCode).toBe(0);
      expect(result!.stdout).toBe("ok\n");
      // The stash is per-throw, so it holds the caught one; nothing may
      // report it, because the run succeeded.
      expect(readStash()).toContain("swallowed");
    },
    600_000,
  );

  it.skipIf(!available)(
    "reads Environment.Exit as an exit code rather than an object",
    async () => {
      // CS-01: the pane held the literal text `[object Object]` and
      // nothing else, under a header that read `Done`.
      const { source } = composeProgram({
        entryFilename: "Program.cs",
        entryCode: 'Console.WriteLine("before exit");\nEnvironment.Exit(3);\n',
        files: [],
        stdin: null,
        instrument: true,
      });
      const { thrown } = await run(source);
      expect(thrown).toBeDefined();
      expect(describeThrown(thrown)).toEqual({ message: "", exitCode: 3 });
      expect(EXIT_OUTPUT_NOTE).toContain("return");
    },
    600_000,
  );

  it.skipIf(!available)(
    "keeps the output when the program returns an exit code instead",
    async () => {
      // The alternative EXIT_OUTPUT_NOTE points at, checked rather than
      // assumed.
      const { source } = composeProgram({
        entryFilename: "Program.cs",
        entryCode: 'Console.WriteLine("kept");\nreturn 3;\n',
        files: [],
        stdin: null,
        instrument: true,
      });
      const { result } = await run(source);
      expect(result).toEqual({ stdout: "kept\n", stderr: "", exitCode: 3 });
    },
    600_000,
  );

  it.skipIf(!available)(
    "still runs a program written as an explicit Main",
    async () => {
      // Instrumentation is off for this shape: there is no file-scope
      // statement position to put a prelude in.
      const { source } = composeProgram({
        entryFilename: "Program.cs",
        entryCode:
          'class App { static void Main() { System.Console.WriteLine("from Main"); } }\n',
        files: [],
        stdin: null,
        instrument: false,
      });
      const { result } = await run(source);
      expect(result?.stdout).toBe("from Main\n");
    },
    600_000,
  );

  it.skipIf(!available)(
    "reports the .NET version the runtime actually is",
    async () => {
      // CS-10: the UI labelled it .NET 9 / C# 13.
      const { source } = composeProgram({
        entryFilename: "Program.cs",
        entryCode:
          "Console.WriteLine(System.Runtime.InteropServices.RuntimeInformation.FrameworkDescription);\n",
        files: [],
        stdin: null,
        instrument: true,
      });
      expect((await run(source)).result?.stdout.trim()).toBe(
        `.NET ${DOTNET_VERSION}`,
      );
    },
    600_000,
  );
});
