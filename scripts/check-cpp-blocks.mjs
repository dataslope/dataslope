/**
 * Compiles and runs every C and C++ `<CodeBlock>` and `<ChallengeCard>`.
 *
 * Not in CI: these blocks are self-contained deterministic programs against a
 * pinned toolchain, so they only break when edited — run this when the C/C++
 * content changes rather than paying 114 MB and minutes per pull request.
 * The toolchain is fetched once into `.browsercc-cache/` at the versions the
 * site names, not installed as a devDependency, so nobody pays unless they
 * run this.
 *
 * Usage:
 *   node scripts/check-cpp-blocks.mjs [--filter <substr>[,<substr>…]]
 *                                     [--adapter c|cpp] [--list] [--json <path>]
 */
import { existsSync, mkdirSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { normalizeStdin } from "../app/_components/runtime/stdinFile.ts";
import {
  extractBlocks,
  extractChallengeCards,
  matchesFilter,
  parseFilter,
} from "./lib/mdx-blocks.mjs";

/** Kept in step with `BROWSERCC_VERSION` / `WASI_SHIM_VERSION` in
 *  `app/_components/runtime/browsercc.ts`. */
const BROWSERCC_VERSION = "0.1.1";
const WASI_SHIM_VERSION = "0.4.2";
const CACHE = ".browsercc-cache";

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? null : (args[i + 1] ?? "");
};

/** Download and unpack one npm tarball into the cache, once. */
async function ensurePackage(spec, dir) {
  const root = join(CACHE, dir, "package");
  if (existsSync(root)) return root;
  mkdirSync(join(CACHE, dir), { recursive: true });
  const meta = await (await fetch(`https://registry.npmjs.org/${spec}`)).json();
  const res = await fetch(meta.dist.tarball);
  if (!res.ok) throw new Error(`${meta.dist.tarball} → ${res.status}`);
  await writeFile(join(CACHE, dir, "pkg.tgz"), Buffer.from(await res.arrayBuffer()));
  const { execFileSync } = await import("node:child_process");
  execFileSync("tar", ["xzf", "pkg.tgz"], { cwd: join(CACHE, dir) });
  return root;
}

const filter = parseFilter(flag("--filter"));
const onlyAdapter = flag("--adapter");
const adapters = onlyAdapter ? [onlyAdapter] : ["c", "cpp"];
const keep = (x) => (filter ? matchesFilter(filter, x.file, x.title) : true);

const items = [];
for (const adapter of adapters) {
  for (const b of extractBlocks(undefined, adapter)) {
    if (!b.unparsable && keep(b)) items.push({ ...b, adapter, kind: "block", source: b.code });
  }
  for (const c of extractChallengeCards(undefined, adapter)) {
    if (!c.unparsable && keep(c)) items.push({ ...c, adapter, kind: "card", source: c.solution });
  }
}

if (args.includes("--list")) {
  for (const x of items) console.log(`${x.kind}  ${x.file}:${x.line}  [${x.adapter}]`);
  console.log(`\n${items.length} c/c++ item(s)`);
  process.exit(0);
}

const unsolved = items.filter((x) => x.kind === "card" && !x.source);
const runnable = items.filter((x) => x.source);

console.log("check-cpp-blocks: fetching toolchain (once, into .browsercc-cache)…");
const bccRoot = await ensurePackage(`browsercc/${BROWSERCC_VERSION}`, "browsercc");
const wasiRoot = await ensurePackage(
  `@bjorn3/browser_wasi_shim/${WASI_SHIM_VERSION}`,
  "wasi",
);

// browsercc fetches `sysroot.tar` / `stdc++.h.pch` relative to
// import.meta.url; under Node those are `file://` URLs, which undici refuses,
// so widen `fetch` rather than patch the library.
const realFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const url = typeof input === "string" ? input : (input?.url ?? String(input));
  if (url.startsWith("file://")) return new Response(await readFile(fileURLToPath(url)));
  return realFetch(input, init);
};

const bcc = await import(pathToFileURL(join(bccRoot, "dist", "index.js")).href);
const shim = await import(pathToFileURL(join(wasiRoot, "dist", "index.js")).href);

/** Instantiate and run a compiled WASI module, mirroring `runWasiModule` in
 *  runtime/browsercc.ts: the item's stdin on fd 0, captured stdout/stderr, and
 *  a `WASIProcExit`-shaped throw treated as an exit code rather than a crash.
 *
 *  Without the stdin a block that reads input compiles here, runs here on an
 *  empty stream, and "passes" by taking whatever branch a program takes when
 *  it is given nothing — which is the one path the lesson is not about. */
async function runWasi(module, stdin = "") {
  const decoder = new TextDecoder("utf-8");
  let stdout = "";
  let stderr = "";
  const wasi = new shim.WASI(
    [],
    [],
    [
      new shim.OpenFile(new shim.File(new TextEncoder().encode(stdin))),
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
    else return { stdout, stderr, exitCode: null, crash: String(err?.message ?? err) };
  }
  return { stdout, stderr, exitCode, crash: null };
}

// The ~19 MB precompiled standard library header, read once and reused
// across every C++ compile.
const PCH_VFS_PATH = "/include/bits/stdc++.h.pch";
let pch = null;
if (adapters.includes("cpp")) {
  try {
    pch = await bcc.getPrecompiledHeader(["-O2", "-std=c++20", "-fno-exceptions"]);
  } catch {
    // Without it C++ still compiles, just more slowly.
  }
}

console.log(`check-cpp-blocks: ${runnable.length} item(s) across ${adapters.join(", ")}`);

const failures = [];
let slowest = { ms: 0 };

for (const [i, item] of runnable.entries()) {
  const startedAt = Date.now();
  const isCpp = item.adapter === "cpp";

  // Mirrors `browsercc-worker.ts`: browsercc's `compile()` takes one source,
  // so sibling sources are concatenated ahead of the entry (a unity build —
  // passing sibling paths fails to link) and headers go to `extraFiles` so
  // `#include` resolves.
  const flags = isCpp
    ? ["-O2", "-std=c++20", "-fno-exceptions"]
    : ["--driver-mode=gcc", "-O2", "-Wall", "-std=gnu17"];
  const fileName = isCpp ? "main.cpp" : "main.c";
  const extraFiles = {};
  let extraSource = "";
  const SRC = isCpp ? [".cpp", ".cc", ".cxx"] : [".c"];
  const HDR = isCpp ? [".h", ".hpp"] : [".h"];
  for (const f of item.files ?? []) {
    if (f.filename === item.entry) continue;
    const body = f.solutionSource ?? f.starterCode;
    const content = f.initCode ? `${f.initCode}\n${body}` : body;
    if (SRC.some((e) => f.filename.endsWith(e))) extraSource += content + "\n";
    else if (HDR.some((e) => f.filename.endsWith(e))) extraFiles[f.filename] = content;
  }
  if (isCpp && pch) {
    flags.push("-include-pch", PCH_VFS_PATH);
    extraFiles[PCH_VFS_PATH] = pch;
  }

  try {
    const { compileOutput, module } = await bcc.compile({
      source: extraSource + item.source,
      fileName,
      flags,
      extraFiles: Object.keys(extraFiles).length > 0 ? extraFiles : undefined,
    });
    if (!module) {
      failures.push({ ...describe(item), phase: "compile", error: firstLine(compileOutput) });
    } else {
      const { stderr, exitCode, crash } = await runWasi(
        module,
        normalizeStdin(item.stdin ?? ""),
      );
      if (crash) failures.push({ ...describe(item), phase: "run", error: crash });
      else if (exitCode !== 0) {
        failures.push({
          ...describe(item),
          phase: "run",
          error: `exited ${exitCode}${stderr ? `: ${firstLine(stderr)}` : ""}`,
        });
      }
    }
  } catch (err) {
    failures.push({ ...describe(item), phase: "compile", error: String(err?.message ?? err) });
  }

  const ms = Date.now() - startedAt;
  if (ms > slowest.ms) slowest = { ms, file: item.file, line: item.line };
  if ((i + 1) % 25 === 0) {
    console.log(`  …${i + 1}/${runnable.length}  (${item.file}:${item.line})`);
  }
}

function describe(x) {
  return { file: x.file, line: x.line, adapter: x.adapter, kind: x.kind, title: x.title ?? null };
}
function firstLine(s) {
  return String(s ?? "").split("\n").filter(Boolean)[0] ?? "(no output)";
}

const jsonPath = flag("--json");
if (jsonPath) await writeFile(jsonPath, JSON.stringify({ failures, unsolved }, null, 2));

if (slowest.file) {
  console.log(
    `check-cpp-blocks: slowest item was ${(slowest.ms / 1000).toFixed(1)}s ` +
      `(${slowest.file}:${slowest.line})`,
  );
}
if (unsolved.length > 0) {
  console.log(`check-cpp-blocks: ${unsolved.length} card(s) have no solution to verify`);
}

if (failures.length === 0) {
  console.log(`✓ all ${runnable.length} c/c++ item(s) compile and run`);
  process.exit(0);
}

console.error(`\n✗ ${failures.length} of ${runnable.length} c/c++ item(s) failed:\n`);
for (const f of failures) {
  console.error(`  ${f.phase}  ${f.kind}  ${f.file}:${f.line}  [${f.adapter}]\n      ${f.error}`);
}
process.exit(1);
