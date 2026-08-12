/**
 * Headless runtimes for the `<CodeBlock>` languages whose output is text.
 *
 * `build-block-outputs.mjs` was Python-only, because Pyodide was the only
 * runtime it knew how to boot. Every other runnable block therefore showed an
 * empty panel until the reader pressed Run: 1,685 of the site's 3,374, which
 * is not one course but every language that is not Python.
 *
 * This supplies the missing half for the ones a Node process can execute.
 * Each runner is the *same* runtime the browser uses, for the same reason the
 * sweeps use it: a prepopulated panel that disagrees with what Run produces
 * is worse than an empty one, because nothing tells the reader which to
 * believe.
 *
 *   - **javascript, typescript** — `AlmostNodeRunner`, the browser shim
 *     itself, imported from `app/_components/runtime/`. Real Node is strictly
 *     more capable, so running these under plain Node would record output no
 *     reader can reproduce.
 *   - **c, cpp** — browsercc, the same clang-in-wasm toolchain at the same
 *     pinned version, compiled with the same flags as `browsercc-worker.ts`
 *     and run through the same WASI harness as `runWasiModule`.
 *
 * ── What is deliberately not here ───────────────────────────────────────
 *
 * **Python** stays in the generator. Its outputs are not text — a DataFrame,
 * a matplotlib figure and a Plotly chart come back as structured cells — and
 * that conversion is shared with the browser through `pythonDisplayOutputs.ts`.
 *
 * **R** is the same shape of problem and has no such shared module yet.
 * `runtime/r.tsx` decides visibility with `withVisible()`, renders a data
 * frame as an HTML table, and turns captured graphics into images; a runner
 * that only collected stdout would record a panel missing every table and
 * every plot, and would double-print the visible result besides. Rather than
 * lift that conversion out of `r.tsx`, R is captured from a real page by
 * `scripts/capture-browser-outputs.mjs`, which gets the conversion for free —
 * along with java, csharp and php, which have no Node runtime at all.
 *
 * ── The contract ────────────────────────────────────────────────────────
 *
 * `createRunner(adapter)` resolves to `{ run(block), dispose() }`, where
 * `run` returns the `{ type, content }` cells for one block, in the order and
 * at the granularity its browser worker posts them, and never throws.
 *
 * The granularity is the part worth being careful about. `javascript-worker`
 * posts one message per `console.*` call, and the runtime emits one cell per
 * message, so joining the chunks into a single blob would record something
 * the reader never sees: every line of output run together, because almostnode
 * hands over each line without its newline. `browsercc-worker` is the other
 * shape, one cell for the whole program's stdout with its trailing newlines
 * trimmed, plus separate cells for diagnostics and a non-zero exit.
 *
 * Runners boot lazily and are reused across every block of their language,
 * which keeps 530 JavaScript blocks to one almostnode instance and 389 C
 * blocks to one toolchain fetch.
 */
import { existsSync, mkdirSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/** Adapters this module can run. Everything else is browser-only or Python. */
export const TEXT_ADAPTERS = ["javascript", "typescript", "c", "cpp"];

/**
 * Adapters no Node process can run, recorded by
 * `scripts/capture-browser-outputs.mjs` from a real page.
 *
 * Both generators write the same manifest, so both need to agree on which
 * entries belong to which — `build-block-outputs.mjs` carries these forward
 * rather than regenerating them, and deleting one it cannot re-record is a
 * loss nothing recovers from automatically. Kept beside `TEXT_ADAPTERS` so
 * the two lists cannot drift into overlapping or leaving a gap between them.
 */
export const BROWSER_ADAPTERS = ["r", "java", "csharp", "web", "react", "php"];

/** The bytes a file contributes: the hidden setup, then the visible buffer.
 *  Matches what Run executes, and what the output key is hashed from. */
export function fileBody(f) {
  return f.initCode ? `${f.initCode}\n${f.starterCode}` : f.starterCode;
}

// ─── javascript / typescript ────────────────────────────────────────────

/**
 * Everything this module needs from the real `process`, taken at module load.
 *
 * That is the only moment it is safe to take it. almostnode reaches into the
 * host process the first time it runs anything and never puts it back:
 *
 *   - `process.exit` becomes one that throws on any code, including 0, so
 *     nothing after a JavaScript block can exit normally.
 *   - `process.cwd()` starts answering `/`, the root of its VFS, which
 *     silently re-bases every path resolved afterwards — `eachTag` then files
 *     lessons under `home/user/dataslope/content/…` and every entry is keyed
 *     to a path the site never looks up.
 *   - `getActiveResourcesInfo` is simply gone, because the shim does not
 *     carry Node's whole surface.
 *
 * Reading any of them off the global later is a bug that only shows up on the
 * *second* runner, or inside a block. The last one did both: it was recorded
 * as one block's stderr output, and it took all 333 TypeScript blocks out of
 * a pass by throwing while their runner was being constructed.
 */
const exitProcess = process.exit.bind(process);
const realCwd = process.cwd();
const getActiveResources = process.getActiveResourcesInfo.bind(process);

/** Timers and immediates the process is currently holding open. */

function pendingTimers() {
  return getActiveResources().filter(
    (r) => r === "Timeout" || r === "Immediate",
  ).length;
}

/** How long a block may keep talking after its top level returns, and how
 *  much silence ends the wait. Ten seconds sits under the generator's 20s
 *  per-block ceiling, so a runaway interval is stopped here rather than
 *  there, where it would discard the block's output too. */
const DRAIN_LIMIT_MS = 10_000;
const DRAIN_IDLE_MS = 600;

/** Source that could still speak after its top level returns. Anything
 *  without one of these has nothing pending by construction, and 502 of the
 *  site's 530 JavaScript and TypeScript blocks are in that group — which is
 *  what keeps the wait below off the critical path entirely. */
const ASYNC_SOURCE =
  /\bawait\b|\basync\b|\bsetTimeout\b|\bsetInterval\b|\bsetImmediate\b|\bPromise\b|\.then\s*\(|queueMicrotask|nextTick/;

/**
 * Wait for the output that arrives after the entry module returns.
 *
 * `runner.run()` resolves when the top level of the entry finishes, which for
 * an async lesson is long before it has said anything: a block awaiting a
 * timer resolved with an empty array and recorded a blank panel, while its
 * real output turned up milliseconds later and printed into the build log
 * instead. Seven of the ten blocks in `promises-and-async-await` were blank
 * for exactly this reason. The browser has no equivalent problem, because its
 * worker stays alive and posts each message as it comes.
 *
 * Two conditions end the wait, and both are needed. Output still arriving
 * means more may follow, so the idle window restarts on every new cell — that
 * is what catches a chain of awaits. A timer still pending means output *may*
 * yet arrive, so a block that has said nothing keeps waiting — that is what
 * catches `setTimeout(() => console.log(…), 300)`, which produces nothing at
 * all until it fires. But a timer alone cannot hold the wait open forever:
 * once `DRAIN_IDLE_MS` passes with no new cell, an interval that only ticks
 * is indistinguishable from one that will never print, and waiting on it is
 * the difference between a two-minute pass and a three-hour one.
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

  /**
   * Run `fn` with the host console silenced.
   *
   * almostnode routes `console.*` to the sink, and some of it reaches the
   * host console as well: the sink sees almostnode's own formatting
   * (`[\n  "a"\n]`) while the terminal gets Node's (`[ 'a' ]`), so the two are
   * the same output twice rather than two different outputs. The sink is the
   * authority, because it is what the browser reads. Without this, 1,200
   * blocks print themselves into the build log, and a generator whose stdout
   * is a pipe blocks the moment the reader stops draining it.
   */
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

      // One cell per console call, which is what `javascript-worker.ts`
      // posts and what the runtime turns into output rows.
      const cells = [];
      const diagnostics = [];
      // Once the drain gives up, this block has said everything it is going
      // to say. A `setInterval` the lesson never clears would otherwise keep
      // pushing into an array that is already on its way to the manifest.
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
        // Timers the *harness* is holding — `runBounded`'s deadline, say —
        // are outstanding before the block starts and must not be mistaken
        // for the block's own. Everything after this line is the block's.
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
      // Transpiler diagnostics come first, as they do in the worker: they are
      // produced before the program runs.
      return diagnostics
        .map((d) => ({ type: "stderr", content: d }))
        .concat(cells);
    },
    // almostnode's replacement throws on any exit code, including 0, so the
    // generator could not exit normally once a JS block had run.
    dispose() {
      process.exit = exitProcess;
    },
  };
}

// ─── c / cpp ────────────────────────────────────────────────────────────

/** Kept in step with `check-cpp-blocks.mjs`, which is kept in step with
 *  `runtime/browsercc.ts`. Three copies of two version strings is one more
 *  than anybody wants; the cache directory is shared so at least the 114 MB
 *  download is not. */
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
  // browsercc resolves `sysroot.tar` and `stdc++.h.pch` with
  // `fetch(new URL(..., import.meta.url))`. Under Node that is a `file://`
  // URL, which undici refuses outright, so `fetch` is widened rather than the
  // library patched — the library then behaves exactly as it does in a
  // browser.
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
  // The ~19 MB precompiled standard library header. The site fetches it in
  // the background at boot; here it is one read that pays for itself across
  // hundreds of compiles.
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
      // Mirrors `browsercc-worker.ts`. Extra *source* files are concatenated
      // ahead of the entry (a unity build) rather than passed as translation
      // units: browsercc's `compile()` takes one source, and handing it
      // sibling paths fails to link. Headers go to `extraFiles`, so
      // `#include "mathx.h"` still resolves.
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

      // The cell sequence below is `browsercc-worker.ts`'s, in its order:
      // compile diagnostics, then stdout, then stderr, then the exit line.
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
