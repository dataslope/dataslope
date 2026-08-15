/**
 * Headless runtimes for the `<CodeBlock>` languages whose output is text:
 * javascript/typescript via `AlmostNodeRunner` (the browser shim itself) and
 * c/cpp via browsercc (the same pinned clang-in-wasm toolchain, flags and WASI
 * harness as `browsercc-worker.ts`). Using the browser's own runtimes is the
 * point: a prepopulated panel must not disagree with what Run produces.
 * Python stays in the generator (structured cells via
 * `pythonDisplayOutputs.ts`); r/java/csharp/php are captured from a real page
 * by `scripts/capture-browser-outputs.mjs`.
 *
 * `createRunner(adapter)` resolves to `{ run(block), dispose() }`. `run`
 * returns `{ type, content }` cells in the order and at the granularity the
 * language's browser worker posts them (js: one cell per `console.*` call;
 * c/cpp: one cell for all of stdout, trailing newlines trimmed) and never
 * throws. Runners boot lazily and are reused across a language's blocks.
 */
import { existsSync, mkdirSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/** Adapters this module can run. Everything else is browser-only or Python. */
export const TEXT_ADAPTERS = ["javascript", "typescript", "c", "cpp"];

/** Adapters no Node process can run, recorded by
 *  `scripts/capture-browser-outputs.mjs`. `build-block-outputs.mjs` carries
 *  their manifest entries forward rather than regenerating them. Kept beside
 *  `TEXT_ADAPTERS` so the two lists cannot drift. */
export const BROWSER_ADAPTERS = ["r", "java", "csharp", "web", "react", "php"];

/** The bytes a file contributes: the hidden setup, then the visible buffer.
 *  Matches what Run executes, and what the output key is hashed from. */
export function fileBody(f) {
  return f.initCode ? `${f.initCode}\n${f.starterCode}` : f.starterCode;
}

// ─── javascript / typescript ────────────────────────────────────────────

// Snapshot what this module needs from the real `process` at module load:
// almostnode mutates the host process on first run and never restores it
// (`process.exit` throws on any code, `process.cwd()` re-bases to its VFS
// root, `getActiveResourcesInfo` disappears). Reading these off the global
// later is a bug.
const exitProcess = process.exit.bind(process);
const realCwd = process.cwd();
const getActiveResources = process.getActiveResourcesInfo.bind(process);

/** Timers and immediates the process is currently holding open. */

function pendingTimers() {
  return getActiveResources().filter(
    (r) => r === "Timeout" || r === "Immediate",
  ).length;
}

/** How long a block may keep emitting after its top level returns, and how
 *  much silence ends the wait. 10s sits under the generator's 20s per-block
 *  ceiling, so a runaway interval is stopped here without discarding the
 *  block's output. */
const DRAIN_LIMIT_MS = 10_000;
const DRAIN_IDLE_MS = 600;

/** Source that could still emit after its top level returns; anything
 *  without one of these skips the drain wait entirely. */
const ASYNC_SOURCE =
  /\bawait\b|\basync\b|\bsetTimeout\b|\bsetInterval\b|\bsetImmediate\b|\bPromise\b|\.then\s*\(|queueMicrotask|nextTick/;

/**
 * Wait for output that arrives after the entry module returns —
 * `runner.run()` resolves when the top level finishes, so async blocks would
 * otherwise record blank panels. The idle window restarts on every new cell
 * (catches chained awaits); a pending timer keeps a silent block waiting
 * (catches an unfired `setTimeout`), but cannot hold the wait past
 * `DRAIN_IDLE_MS` of silence — an interval that only ticks would never end.
 */
async function drain(baseline, count) {
  const deadline = Date.now() + DRAIN_LIMIT_MS;
  let seen = count();
  let lastChange = Date.now();
  for (;;) {
    if (count() !== seen) {
      seen = count();
      lastChange = Date.now();
    }
    const idleFor = Date.now() - lastChange;
    const pending = pendingTimers() > baseline;
    if (!pending) return; // nothing outstanding: it cannot speak again
    if (idleFor >= DRAIN_IDLE_MS) return; // holding a timer, but saying nothing
    if (Date.now() >= deadline) return;
    await new Promise((resolve) => setTimeout(resolve, 15));
  }
}

async function createJsRunner(adapter) {
  const { AlmostNodeRunner, normalizeVfsPath } =
    await import("../../app/_components/runtime/almostnode-worker-shared.ts");
  const { isTsPath, transpileTs, tsToJsPath } =
    await import("../../app/_components/runtime/tsTranspile.ts");

  const runner = new AlmostNodeRunner();
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const isTs = adapter === "typescript";

  /** Mirrors the TypeScript worker's prepare-fs transform: transpile each
   *  .ts file, write it under the .js path, and keep the .ts out of the VFS
   *  so the resolver never sees two copies of one module. */
  const stageTransform = (diagnostics) => (path, bytes) => {
    if (!isTsPath(path)) return [[path, bytes]];
    const { outputText, diagnostics: diags } = transpileTs(
      decoder.decode(bytes),
      path,
    );
    for (const d of diags) diagnostics.push(`TS (${path}): ${d}`);
    return [[tsToJsPath(path), encoder.encode(outputText)]];
  };

  /** Run `fn` with the host console silenced. almostnode routes `console.*`
   *  to the sink (the authority — it is what the browser reads) but also
   *  echoes to the host console, which floods the build log and blocks a
   *  piped stdout nobody drains. */
  async function muted(fn) {
    const real = {};
    const methods = ["log", "info", "warn", "error", "debug", "trace", "dir"];
    for (const m of methods) {
      real[m] = console[m];
      console[m] = () => {};
    }
    const realCwdFn = process.cwd;
    try {
      return await fn();
    } finally {
      for (const m of methods) console[m] = real[m];
      // Hand the real answer back, whether almostnode replaced the function
      // or the process genuinely moved.
      process.cwd = realCwdFn;
      try {
        if (process.cwd() !== realCwd) process.chdir(realCwd);
      } catch {
        process.cwd = () => realCwd;
      }
    }
  }

  return {
    async run(block) {
      const files = block.files ?? [];
      const entryName =
        block.entry ?? files[0]?.filename ?? (isTs ? "index.ts" : "index.js");
      const entryFile = files.find((f) => f.filename === entryName) ?? files[0];
      const entrySource = entryFile ? fileBody(entryFile) : (block.code ?? "");

      // One cell per console call, matching `javascript-worker.ts`.
      const cells = [];
      const diagnostics = [];
      // After the drain gives up, a never-cleared `setInterval` must not keep
      // pushing into an array already bound for the manifest.
      let closed = false;
      try {
        // Multi-file blocks stage their siblings; a single-file block gets a
        // fresh empty VFS from the runner, which keeps one block's leftovers
        // out of the next.
        if (files.length > 1) {
          runner.stage(
            files.map((f) => [f.filename, encoder.encode(fileBody(f))]),
            isTs ? stageTransform(diagnostics) : undefined,
          );
        }
        const entryVfsPath = normalizeVfsPath(
          isTs ? tsToJsPath(entryName) : entryName,
        );
        // Timers the harness holds (e.g. `runBounded`'s deadline) predate the
        // block and must not count as its own.
        const baseline = pendingTimers();
        const mayRunOn = files.some((f) => ASYNC_SOURCE.test(fileBody(f)))
          || ASYNC_SOURCE.test(entrySource);
        await muted(async () => {
          await runner.run(
            entryVfsPath,
            (vfs) => {
              if (!isTs) return entrySource;
              if (vfs.existsSync(entryVfsPath))
                return decoder.decode(vfs.readFileSync(entryVfsPath));
              const { outputText, diagnostics: diags } = transpileTs(
                entrySource,
                entryName,
              );
              for (const d of diags) diagnostics.push(`TS: ${d}`);
              return outputText;
            },
            {
              stdout: (c) => closed || cells.push({ type: "stdout", content: c }),
              stderr: (c) => closed || cells.push({ type: "stderr", content: c }),
            },
          );
          if (mayRunOn) await drain(baseline, () => cells.length);
        });
        closed = true;
      } catch (e) {
        closed = true;
        cells.push({ type: "stderr", content: String(e?.message ?? e) });
      }
      // Transpiler diagnostics first, as in the worker.
      return diagnostics
        .map((d) => ({ type: "stderr", content: d }))
        .concat(cells);
    },
    // almostnode's `process.exit` replacement throws on any code, including 0.
    dispose() {
      process.exit = exitProcess;
    },
  };
}

// ─── c / cpp ────────────────────────────────────────────────────────────

/** Keep in step with `check-cpp-blocks.mjs` and `runtime/browsercc.ts`. The
 *  cache directory is shared so the ~114 MB download is not duplicated. */
const BROWSERCC_VERSION = "0.1.1";
const WASI_SHIM_VERSION = "0.4.2";
const CACHE = ".browsercc-cache";

/** Download and unpack one npm tarball into the cache, once. */
async function ensurePackage(spec, dir) {
  const root = join(CACHE, dir, "package");
  if (existsSync(root)) return root;
  mkdirSync(join(CACHE, dir), { recursive: true });
  const meta = await (await fetch(`https://registry.npmjs.org/${spec}`)).json();
  const res = await fetch(meta.dist.tarball);
  if (!res.ok) throw new Error(`${meta.dist.tarball} → ${res.status}`);
  await writeFile(
    join(CACHE, dir, "pkg.tgz"),
    Buffer.from(await res.arrayBuffer()),
  );
  const { execFileSync } = await import("node:child_process");
  execFileSync("tar", ["xzf", "pkg.tgz"], { cwd: join(CACHE, dir) });
  return root;
}

async function createCppRunner(adapter) {
  // browsercc fetches `sysroot.tar` / `stdc++.h.pch` relative to
  // import.meta.url; under Node those are `file://` URLs, which undici
  // refuses, so widen `fetch` rather than patch the library.
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url =
      typeof input === "string" ? input : (input?.url ?? String(input));
    if (url.startsWith("file://"))
      return new Response(await readFile(fileURLToPath(url)));
    return realFetch(input, init);
  };

  const bccRoot = await ensurePackage(
    `browsercc/${BROWSERCC_VERSION}`,
    "browsercc",
  );
  const wasiRoot = await ensurePackage(
    `@bjorn3/browser_wasi_shim/${WASI_SHIM_VERSION}`,
    "wasi",
  );
  const bcc = await import(
    pathToFileURL(join(bccRoot, "dist", "index.js")).href
  );
  const shim = await import(
    pathToFileURL(join(wasiRoot, "dist", "index.js")).href
  );

  const isCpp = adapter === "cpp";
  // The ~19 MB precompiled standard library header, read once and reused
  // across every compile.
  const PCH_VFS_PATH = "/include/bits/stdc++.h.pch";
  let pch = null;
  if (isCpp) {
    try {
      pch = await bcc.getPrecompiledHeader([
        "-O2",
        "-std=c++20",
        "-fno-exceptions",
      ]);
    } catch {
      // Without it C++ still compiles, just more slowly.
    }
  }

  /** Instantiate and run a compiled WASI module, mirroring `runWasiModule` in
   *  runtime/browsercc.ts: empty stdin, captured stdout/stderr, and a
   *  `WASIProcExit`-shaped throw treated as an exit code, not a crash. */
  async function runWasi(module) {
    const decoder = new TextDecoder("utf-8");
    let stdout = "";
    let stderr = "";
    const wasi = new shim.WASI(
      [],
      [],
      [
        new shim.OpenFile(new shim.File(new Uint8Array(0))),
        new shim.ConsoleStdout((d) => {
          stdout += decoder.decode(d, { stream: true });
        }),
        new shim.ConsoleStdout((d) => {
          stderr += decoder.decode(d, { stream: true });
        }),
      ],
    );
    const instance = await WebAssembly.instantiate(module, {
      wasi_snapshot_preview1: wasi.wasiImport,
    });
    let exitCode = 0;
    try {
      const r = wasi.start(instance);
      if (typeof r === "number") exitCode = r;
    } catch (err) {
      const code = err?.code;
      if (typeof code === "number") exitCode = code;
      else
        return {
          stdout,
          stderr,
          exitCode: null,
          crash: String(err?.message ?? err),
        };
    }
    return { stdout, stderr, exitCode, crash: null };
  }

  return {
    async run(block) {
      // Mirrors `browsercc-worker.ts`: browsercc's `compile()` takes one
      // source, so sibling sources are concatenated ahead of the entry (a
      // unity build) and headers go to `extraFiles` so `#include` resolves.
      const flags = isCpp
        ? ["-O2", "-std=c++20", "-fno-exceptions"]
        : ["--driver-mode=gcc", "-O2", "-Wall", "-std=gnu17"];
      const fileName = isCpp ? "main.cpp" : "main.c";
      const extraFiles = {};
      let extraSource = "";
      const SRC = isCpp ? [".cpp", ".cc", ".cxx"] : [".c"];
      const HDR = isCpp ? [".h", ".hpp"] : [".h"];
      for (const f of block.files ?? []) {
        if (f.filename === block.entry) continue;
        const content = fileBody(f);
        if (SRC.some((e) => f.filename.endsWith(e)))
          extraSource += content + "\n";
        else if (HDR.some((e) => f.filename.endsWith(e)))
          extraFiles[f.filename] = content;
      }
      if (isCpp && pch) {
        flags.push("-include-pch", PCH_VFS_PATH);
        extraFiles[PCH_VFS_PATH] = pch;
      }

      // Cell order matches `browsercc-worker.ts`: compile diagnostics,
      // stdout, stderr, exit line.
      const cells = [];
      try {
        const { compileOutput, module } = await bcc.compile({
          source: extraSource + block.code,
          fileName,
          flags,
          extraFiles:
            Object.keys(extraFiles).length > 0 ? extraFiles : undefined,
        });
        const trimmedDiag = String(compileOutput ?? "").replace(/\n+$/, "");
        if (trimmedDiag) cells.push({ type: "stderr", content: trimmedDiag });
        if (!module) return cells;
        const { stdout, stderr, exitCode, crash } = await runWasi(module);
        if (crash) {
          cells.push({ type: "stderr", content: crash });
          return cells;
        }
        if (stdout)
          cells.push({ type: "stdout", content: stdout.replace(/\n+$/, "") });
        if (stderr)
          cells.push({ type: "stderr", content: stderr.replace(/\n+$/, "") });
        if (exitCode !== 0) {
          cells.push({
            type: "stderr",
            content: `Program exited with code ${exitCode}.`,
          });
        }
        return cells;
      } catch (err) {
        cells.push({ type: "stderr", content: String(err?.message ?? err) });
        return cells;
      }
    },
    dispose() {
      globalThis.fetch = realFetch;
    },
  };
}

/** A runner for one adapter, booted on first use. */
export async function createRunner(adapter) {
  if (adapter === "javascript" || adapter === "typescript")
    return createJsRunner(adapter);
  if (adapter === "c" || adapter === "cpp") return createCppRunner(adapter);
  throw new Error(`no headless runner for adapter "${adapter}"`);
}
