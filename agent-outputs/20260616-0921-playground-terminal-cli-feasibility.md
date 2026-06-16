# Adding a Terminal / CLI to Each Playground — Feasibility Research

**Date:** 2026-06-16
**Author:** Research pass (Claude Code)
**Question:** *Is it possible to add a terminal (command-line interface) to each playground — either an emulated environment or a CLI provided by the runtime (e.g. CheerpJ, Roslyn)?*
**Method:** Read the runtime adapters under `app/_components/runtime/**` and the shared adapter contract (`app/_components/types.ts`); verified the I/O model, threading model, dependency list (`package.json`) and cross-origin-isolation headers (`next.config.ts`) directly against the code; then researched each underlying engine's interactive-console / REPL / stdin capabilities against upstream docs and prior art. Code claims below carry `file:line` references; engine claims carry sources in §10.

---

## 1. TL;DR / Verdict

**Yes — a terminal is possible for every playground, but "terminal" means three different things, and each has a very different cost.** The honest summary:

- **A runtime REPL / interactive shell ("CLI provided by the runtime")** is the natural fit and is **achievable for all 12 runtimes**. Several engines ship a purpose-built console primitive we currently don't use (Pyodide `PyodideConsole`, WebR `Console`, Roslyn `ScriptState.ContinueWithAsync`, the SQLite/DuckDB/`psql` dot-/meta-command shells). This is **Tier 1 work** and needs **no infrastructure changes**.
- **Interactive *program* I/O** (a normal program that blocks on `input()` / `Scanner` / `scanf` mid-run) is harder. It needs a *blocking* stdin channel, which in a browser means **`SharedArrayBuffer` + `Atomics.wait` inside a Web Worker**, which in turn requires **cross-origin isolation (COOP/COEP) — currently NOT enabled** (`next.config.ts:19-57` sets no such headers) and which has knock-on effects on every CDN-loaded WASM runtime. This is the single biggest cross-cutting cost.
- **A full emulated OS shell (real `bash` in an emulated Linux)** is possible via **CheerpX/WebVM** (the sibling product to the CheerpJ you already use), but it is a *separate, heavy* product (hundreds of MB, x86 virtualization) rather than a per-language feature.

The current playground architecture is a **batch "run-once" model** — `run(code, emit)` captures stdout/stderr into notebook-style cells (`types.ts:88-151`) — with **no stdin path anywhere** and **no terminal UI library** (`package.json` has no `xterm`). A terminal is therefore a genuinely new I/O mode, not a tweak to the existing output panel.

**Recommendation:** ship an **xterm.js-based REPL panel** for the runtimes whose engines expose an async interactive console (Tier 1 + Tier 2 below) — no COOP/COEP needed — and treat blocking in-program stdin (C/C++/Java) and a CheerpX OS shell as separate, later, opt-in efforts.

---

## 2. What "terminal" actually means here (three distinct features)

Conflating these is the main source of confusion, so the rest of the report is organized around them.

| Flavor | What the user does | Example | Hardest part |
| --- | --- | --- | --- |
| **(A) Interactive program I/O** | Runs a *normal* program that happens to read stdin while running | C `scanf`, Java `Scanner.nextLine()`, Python `input()` inside a script | **Blocking** stdin from a worker → needs `SharedArrayBuffer`/`Atomics` + COOP/COEP |
| **(B) Runtime REPL / interactive shell** ("CLI provided by the runtime") | Types expressions one line at a time; state persists across lines; sees a prompt (`>>>`, `>`, `csi>`, `sqlite>`) | Python REPL, R console, Node REPL, C# Interactive (`csi`), `sqlite3`/`duckdb`/`psql` shells | Engine must support **stateful incremental eval** (most already do) |
| **(C) Emulated OS shell** | Gets a real `bash`/POSIX shell, runs arbitrary commands, pipes, a filesystem | `ls`, `gcc foo.c && ./a.out`, `pip install`, `vim` | Running a **whole OS** in the browser (CheerpX/WebVM, v86) |

The user's phrasing — *"emulated environment, or a CLI provided by the runtime (e.g. CheerpJ or Roslyn)"* — maps to **(C)** and **(B)** respectively. **(B) is the high-value, low-cost option** and is where this report concentrates.

---

## 3. The current architecture (the baseline we'd be extending)

### 3.1 Batch "run-once", notebook-style output — no streaming session

Every runtime implements one contract (`types.ts:119-151`):

```ts
interface LanguageRuntime {
  run(code: string, emit: EmitOutput, options?: RunOptions): Promise<void>;
  complete?(line, column): Promise<CompletionResult>;
  prepareFileSystem?(files): Promise<void>;
  collectCreatedFiles?(): Promise<Map<string, Uint8Array>>;
}
```

`run()` takes a whole program, executes it once, and `emit`s discrete `OutputCell`s of type `stdout | stderr | html | image | plot` (`types.ts:3-19`). There is **no notion of a persistent session, a prompt, or input** — the only data flow is *code in → cells out*. A terminal needs the opposite shape: a long-lived session with bidirectional, line-by-line streaming.

### 3.2 stdin is absent everywhere — and where it exists, it's a closed/empty stream

There is **no interactive-input path in any adapter**. The clearest evidence is the C/C++ runtime, which wires WASI's stdin file descriptor to a **zero-byte file**, so any `scanf`/`fgets` hits EOF immediately:

```ts
// browsercc-worker.ts:162
const stdinFd = new shim.OpenFile(new shim.File(new Uint8Array(0)));
...
const wasi = new shim.WASI([], [], [stdinFd, stdoutFd, stderrFd]); // :170
```

stdout/stderr are captured by appending decoded chunks to strings and delivering them after the run (`browsercc-worker.ts:163-168`). The same "capture into a buffer, emit at the end" pattern holds across runtimes (Pyodide `setStdout({batched})`, PHP `php.output` events, Java intercepting `console.log`, C#'s `Console.SetOut(new StringWriter())`).

### 3.3 Threading model is split — and it matters a lot for stdin

| In a **Web Worker** (off main thread) | On the **main thread** |
| --- | --- |
| Python (Pyodide), JavaScript, TypeScript, PHP, C, C++, SQLite, PostgreSQL/PGlite | R (WebR\*), Java (CheerpJ), C# (.NET/Mono) |

\* WebR runs R inside *its own* internal worker; the adapter drives it via WebR's async JS API from the main thread.

This split is decisive: **blocking stdin (`Atomics.wait`) is only legal off the main thread.** Browsers throw on `Atomics.wait` on the main thread. So the main-thread runtimes (R, Java, C#) cannot support *synchronous in-program* stdin without first being moved into a worker — whereas an *async* REPL works fine on any thread (§4.2).

### 3.4 No terminal UI, and no cross-origin isolation

- **No terminal emulator dependency.** `package.json:20-83` has CodeMirror (editor), Plotly, Arrow, etc. — but **no `xterm`, no `@xterm/xterm`, no react-terminal**. Output today is plain monospace cells.
- **No COOP/COEP headers.** `next.config.ts:19-57` defines `redirects`/`rewrites` but **no `headers()` and no `Cross-Origin-Opener-Policy` / `Cross-Origin-Embedder-Policy`**. The app is therefore **not cross-origin isolated**, so `SharedArrayBuffer` is unavailable today. (See §4.3 for why this is the crux of flavor (A).)
- **All heavy runtimes load from third-party CDNs** (jsDelivr/unpkg): Pyodide, PGlite (`postgres.ts:1-7`), DuckDB, the .NET bundle (`dotnet.ts:31-35`), CheerpJ + `tools.jar` (`cheerpj.ts:34-43`). This is what makes turning on COEP non-trivial (§8.1).

> **Correction to the README.** `README.md` lists PostgreSQL as *"Remote connection shell."* The code disagrees: PostgreSQL is **embedded PGlite WASM** running in a worker — `postgres-worker.ts:17-28` instantiates `new PGlite(options)` and `package.json:42` pins `@electric-sql/pglite@^0.4.5`. There is no wire-protocol connection. Worth fixing the README; it also means a Postgres "terminal" would be a local `psql`-style meta-command shell, not a remote session.

---

## 4. The two building blocks any terminal needs

### 4.1 Front end: xterm.js is the de-facto choice

[xterm.js](https://xtermjs.org/) is the standard browser terminal emulator (VS Code's integrated terminal, and — notably — **DuckDB's own WASM shell** at `shell.duckdb.org` is xterm.js; see §5.11). It gives us ANSI handling, history, resize, and a clean `onData`/`write` API. Pyodide's stock REPL uses jQuery-terminal but the project is itself migrating toward xterm.js. **Plan: add `@xterm/xterm` + `@xterm/addon-fit` and build one shared `<TerminalPanel>`** that all runtimes plug into. (A lighter custom React line-buffer is possible for pure REPLs, but xterm.js is worth it for ANSI/colour/paste/mobile handling.)

### 4.2 Transport: the stdin problem, and the two ways to solve it

A REPL/terminal must get keystrokes *into* the runtime. There are two fundamentally different mechanisms:

**Approach 1 — Async, non-blocking line protocol (no special headers).**
Extend each worker's `postMessage` protocol with `stdin-request → stdin-response` (or, better, *drive* the session line-by-line from JS). The runtime asks for a line, JS resolves it asynchronously when the user hits Enter. This is the natural model for:
- **REPLs** (flavor B): JS calls `eval(line)` / `runAsync(line)` / `query(sql)` per submission — the engine never has to *block*; it just gets called again. Works on **any thread**, **no COOP/COEP**.
- Engines whose stdin hook is async-friendly (Pyodide `setStdin`, WebR `Console.stdin`).

**Approach 2 — Blocking stdin via `SharedArrayBuffer` + `Atomics.wait` (needs cross-origin isolation).**
For flavor (A), a synchronous in-program read (`scanf`, `Scanner.nextLine()`) must *pause the WASM* mid-execution until input arrives. The canonical browser technique (e.g. `katharosada/wasm-terminal`, `cryptool-org/wasm-webterm`): run the runtime in a worker, and when it reads stdin, `Atomics.wait` on a `SharedArrayBuffer` until the main thread writes the line and `Atomics.notify`s. This **requires `SharedArrayBuffer`**, which **requires COOP/COEP** (§4.3). WebR additionally offers a **Service-Worker channel fallback** that achieves blocking semantics *without* COOP/COEP (at higher latency) — a useful escape hatch, but WebR-specific.

### 4.3 Cross-origin isolation is the gatekeeper for flavor (A)

`SharedArrayBuffer` is only exposed to **cross-origin-isolated** documents, which requires sending:

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp   (or credentialless)
```

We send neither today. Turning them on is **not free**: under `require-corp`, *every* cross-origin subresource (all our CDN-hosted WASM runtimes, fonts, images) must send `Cross-Origin-Resource-Policy: cross-origin` or be loaded `crossorigin` — otherwise it's blocked. jsDelivr/unpkg generally send permissive CORS, but this needs verification per asset, and `credentialless` (Chromium) eases it but isn't universal (Safari). **This is the chief reason to keep flavor (A) out of the first iteration.**

---

## 5. Per-runtime feasibility (the heart of the report)

Tiers reflect *engine support × infrastructure cost*. "REPL" = flavor (B); "stdin" = flavor (A).

### Tier 1 — REPL is native to the engine; ship first (no COOP/COEP)

#### 5.1 Python — Pyodide `^0.29.4` (worker)
- **REPL: excellent.** Pyodide ships **`pyodide.console.PyodideConsole`**, a subclass of the stdlib `code.InteractiveConsole` built exactly for browser REPLs (manages stream redirection, `await`, and `loadPackagesFromImports`). Pyodide even ships a reference REPL HTML. We already run Pyodide in a worker (`pyodide-worker.ts`) — add a `repl-eval` message that feeds one cell into `PyodideConsole.push()`.
- **stdin: well-supported at the engine level.** `pyodide.setStdin({ stdin, raw, isatty, error })` — the browser default is literally `() => prompt()`. A *nice* (non-modal) blocking `input()` inside a worker needs SAB/Atomics (Approach 2); a quick functional version can use `prompt()` with zero infra.
- **Verdict:** 🟢 Easiest, highest-value REPL in the set.

#### 5.2 R — WebR `^0.6.0` (WebR's own worker)
- **REPL: purpose-built.** WebR exposes a **`Console` helper class** designed "to assist in creating an interactive R REPL based on JavaScript callbacks": `stdout(line)`, `stderr(line)`, `prompt(char)` callbacks, a `stdin(line)` method, and `interrupt()`. This is essentially a drop-in REPL backend.
- **stdin: solved by WebR itself.** WebR's worker communication offers a `SharedArrayBuffer` channel *and* a `ServiceWorker` channel fallback — i.e. it can do blocking `readline()`/`scan()` **even without app-level COOP/COEP** (service-worker mode), or faster with it.
- **Verdict:** 🟢 Among the strongest — WebR already solved the hard parts. Today the adapter uses stateless `Shelter.captureR()` (`r.tsx`), so this is additive.

#### 5.3 & 5.4 JavaScript / TypeScript — almostnode `^0.2.14` + TS `5.7.3` (workers)
- **REPL: trivial to build.** A JS REPL is `eval` against a persistent scope; for TS, transpile each line (`ts.transpileModule`, already used in `typescript-worker.ts`) then eval. The existing workers already stream stdout/stderr incrementally via callbacks (good fit for a terminal). Persisting `globalThis`/scope across submissions gives REPL semantics.
- **stdin:** Node-style `process.stdin` would need wiring into almostnode's VirtualFS; async line protocol is sufficient for a REPL.
- **Verdict:** 🟢 (REPL) — low effort. Watch out for top-level `await` and statement-vs-expression result printing (standard REPL papercuts).

#### 5.5 SQLite — `@sqlite.org/sqlite-wasm 3.53.0` (worker)
- **"REPL" = a SQL shell, the natural mode for a DB.** Each submitted statement runs via `exec()`; results stream back as a grid or text table. Adding **`sqlite3` dot-commands** (`.tables`, `.schema`, `.mode`, `.import`) on top is a thin JS parser over the existing query API — it gives a faithful `sqlite3` CLI feel.
- **stdin:** n/a (not a language runtime).
- **Verdict:** 🟢 Mostly a UI/parsing exercise; the engine already does the work.

#### 5.6 DuckDB — `@duckdb/duckdb-wasm` (worker)
- **A production xterm.js shell already exists.** `@duckdb/duckdb-wasm-shell` (the engine behind `shell.duckdb.org`) is an **embeddable xterm.js + Rust shell** for exactly this WASM build. We could embed it or mirror its approach.
- **Verdict:** 🟢 Lowest-risk of all — upstream ships the terminal.

#### 5.7 PostgreSQL — PGlite `^0.4.5` (worker)
- **"REPL" = a local `psql`-style shell.** Statements run via PGlite's `query()`/`exec()` (`postgres.ts`); add `psql` meta-commands (`\dt`, `\d table`, `\l`) as a JS layer over `information_schema`/`pg_catalog` queries. Since PGlite is embedded (not remote — see §3.4), the shell is fully client-side.
- **Verdict:** 🟢 Same shape as SQLite; engine-ready.

### Tier 2 — Engine supports it; modest adapter work

#### 5.8 C# — .NET/Mono WASM + Roslyn scripting (main thread)
- **REPL: this is exactly what Roslyn scripting is for.** The C# playground already calls **`Microsoft.CodeAnalysis.CSharp.Scripting.CSharpScript.RunAsync(code)`** inside a small `ScriptRunner.dll` (`dotnet.ts:44-49`, `script-runner-src/Runner.cs`). A true **C# Interactive (`csi`) REPL** is: keep the returned **`ScriptState`** and call **`scriptState.ContinueWithAsync(nextLine)`** for each submission — state, variables and `using`s persist across lines. Building a "C# interactive shell in the browser with Roslyn" is established prior art.
- **stdin:** `Console.ReadLine()` would need `Console.SetIn(...)` redirection in `Runner.cs`; synchronous blocking would require moving Mono into a worker first (it's on the main thread today).
- **Verdict:** 🟡 REPL is a natural, well-scoped change to `ScriptRunner` (return/keep `ScriptState`, add a `ContinueScript` JSExport). This is the clearest example of the user's "CLI provided by the runtime (Roslyn)."

#### 5.9 PHP — php-wasm `0.1.0` (worker)
- **REPL: feasible but rough.** PHP's native interactive shell is `php -a` (libedit/ncurses). In WASM this is known-finicky in the browser (input buffering issues are documented upstream). A more reliable path is a **pseudo-REPL**: accumulate a session and re-`run` it per submission, or feed statements with output buffering. php-wasm does support **stdin** (`inputString` / `data-stdin`), so stdin-driven scripts (flavor A) are reachable.
- **Verdict:** 🟡 A usable REPL is achievable but needs care; not as clean as Python/R.

### Tier 3 — Compiled languages: interactive program I/O needs the blocking channel

#### 5.10 C / C++ — browsercc (clang+lld → WASI, `@bjorn3/browser_wasi_shim`) (worker)
- **No REPL semantics** (compiled languages). The meaningful "terminal" here is **flavor (A): run the compiled program with a live stdin** so `scanf`/`std::cin`/`fgets` work. Today stdin is the empty file at `browsercc-worker.ts:162`.
- **What it needs:** replace the empty stdin FD with a **blocking WASI stdin backed by `SharedArrayBuffer` + `Atomics.wait`** (the worker is already off-thread, which is the prerequisite) → **requires COOP/COEP (§4.3).** `cryptool-org/wasm-webterm` is direct prior art for "xterm.js + WASI/Emscripten binary with blocking stdin."
- **(Optional) a C++ REPL** via Cling/`clang-repl` in WASM exists in research form but is heavy and not recommended.
- **Verdict:** 🟠 High-value for teaching `scanf`/`cin`, but gated on cross-origin isolation. Best as a Phase-2 item.

### Tier 4 — Java, and the full-OS option

#### 5.11 Java — CheerpJ `4.3` (full OpenJDK 8/11/17 JIT, main thread)
- The adapter compiles with `javac` and runs `cheerpjRunMain(mainClass, classPath, ...args)` (`cheerpj.ts:47-53`), capturing `System.out` via `console.log` interception.
- **REPL (JShell):** CheerpJ 4.x ships a *full* OpenJDK (incl. Java 11/17), so **JShell exists in principle**. But it's heavy (another tool to load, like the `tools.jar`/`javac` setup) and there's no documented, first-class CheerpJ JShell integration — **treat as unproven/experimental.**
- **stdin (flavor A):** a `Scanner(System.in)` program needs a real `System.in`. CheerpJ runs on the **main thread**, so blocking reads are problematic; feeding stdin would require either CheerpJ's display/console input path or a custom `InputStream`, and likely a move off the main thread. **Needs hands-on investigation** — I could not confirm a clean CheerpJ stdin API from the docs.
- **Verdict:** 🟠/🔴 The riskiest of the language runtimes; defer.

#### 5.12 Full emulated OS shell — CheerpX / WebVM (flavor C)
- **CheerpX** (Leaning Technologies, same vendor as your CheerpJ) is an x86-virtualization engine in WASM; **WebVM** is a full **Debian + `bash` + native toolchains** running client-side on it. This is the literal "emulated environment" the user mentioned — a *real* terminal where `gcc`, `python3`, `ls`, pipes all work.
- **Cost:** it's a different, much larger beast (x86 JIT, large disk images streamed on demand, COOP/COEP required). It wouldn't be "a terminal per playground" so much as **one new "Linux playground."** Lighter emulators (v86/JSLinux) exist but are slower/less capable; **WebContainers** (StackBlitz) are Node-only and licensed.
- **Verdict:** 🔵 Compelling as a *separate* future product; not the way to add a CLI to the 12 existing language playgrounds.

---

## 6. Capability matrix

| Playground | Engine (thread) | Native REPL primitive? | REPL effort (flavor B) | Interactive stdin (flavor A) | Needs COOP/COEP? |
| --- | --- | --- | --- | --- | --- |
| Python | Pyodide (worker) | **`PyodideConsole`** | 🟢 Low | `setStdin` (modal now; SAB for inline) | Only for *inline* blocking input |
| R | WebR (worker) | **`Console` class** | 🟢 Low | Built-in SAB **or** SW-fallback | No (SW fallback) / optional |
| JavaScript | almostnode (worker) | eval scope | 🟢 Low | async `process.stdin` | No |
| TypeScript | TS→almostnode (worker) | transpile+eval | 🟢 Low | async | No |
| SQLite | sqlite-wasm (worker) | SQL shell + dot-cmds | 🟢 Low | n/a | No |
| DuckDB | duckdb-wasm (worker) | **upstream xterm shell** | 🟢 Lowest | n/a | No |
| PostgreSQL | PGlite (worker) | SQL shell + `psql` meta | 🟢 Low | n/a | No |
| C# | Roslyn/Mono (main) | **`ScriptState.ContinueWith`** | 🟡 Medium | `Console.SetIn` (+ workerize) | For blocking stdin |
| PHP | php-wasm (worker) | `php -a` / pseudo-REPL | 🟡 Medium | `inputString`/`data-stdin` | For blocking stdin |
| C / C++ | clang→WASI (worker) | — (compiled) | n/a | **WASI blocking stdin** | **Yes** |
| Java | CheerpJ (main) | JShell (experimental) | 🔴 High | custom `System.in` (+ workerize) | Likely |
| *Linux shell* | CheerpX/WebVM | real `bash` | 🔵 Separate product | real | **Yes** |

---

## 7. Recommended approach (phased)

**Phase 0 — Foundations (shared, ~1–2 weeks)**
1. Add `@xterm/xterm` + `@xterm/addon-fit`; build a shared **`<TerminalPanel>`** (xterm wrapper: `write`, `onData`, history, theming to match the app).
2. Extend the adapter contract with an **optional REPL surface**, e.g. `startRepl(): ReplSession` where `ReplSession` has `eval(line) → AsyncIterable<OutputChunk>`, `interrupt()`, `reset()`. Optionality preserves the existing batch `run()` for non-REPL contexts (and for the SQL grid UI).
3. Define a **non-blocking stdin message** in the worker protocol for the engines that want it.

**Phase 1 — Ship REPLs that need no infra change (the bulk of the value)**
Python (`PyodideConsole`), R (WebR `Console`), JavaScript/TypeScript (eval), SQLite + DuckDB + PostgreSQL (SQL shells; embed/borrow DuckDB's xterm shell), and **C# (Roslyn `ContinueWithAsync`)**. All async; **no COOP/COEP.** This delivers a "CLI provided by the runtime" for 8 of 12 playgrounds.

**Phase 2 — Decide on cross-origin isolation, then do flavor (A)**
If interactive `scanf`/`cin`/`Scanner` is wanted: audit every CDN asset for CORP/CORS, enable `COOP: same-origin` + `COEP: credentialless` (with `require-corp` fallback), and implement blocking WASI stdin for C/C++ (and PHP scripts). Re-evaluate Java/CheerpJ stdin with a spike.

**Phase 3 — Optional "Linux Playground" via CheerpX/WebVM** as a separate offering, not a retrofit.

---

## 8. Risks, costs, and open questions

1. **COOP/COEP is the dominant risk for flavor (A).** Enabling it can break CDN-loaded runtimes (Pyodide, PGlite, DuckDB, .NET, CheerpJ) unless every asset is CORP/CORS-clean. Mitigation: `credentialless` (Chromium) and per-asset verification; keep Phase 1 entirely off this path.
2. **Main-thread runtimes (R\*, Java, C#) can't block.** REPLs (async) are fine, but *synchronous in-program* stdin needs them in a worker — non-trivial for CheerpJ and Mono. (\*WebR already isolates R in its own worker, so R is exempt.)
3. **Per-runtime maintenance & UX divergence.** Twelve REPLs = twelve sets of papercuts (multiline continuation, `await`, value-printing, ANSI). Centralize as much as possible in `<TerminalPanel>` + the `ReplSession` contract.
4. **Mobile.** On-screen-keyboard + terminal UX is notoriously rough; the existing editor-based flow may remain the better default on small screens.
5. **CheerpJ stdin is unverified.** The docs didn't yield a clean `System.in` story; budget a spike before promising Java interactivity.
6. **Security/abuse.** REPLs are still fully client-side (same sandbox as today), so no new server attack surface — but a CheerpX shell with networking (Phase 3) would warrant its own review.

---

## 9. Bottom line

- **"CLI provided by the runtime" (flavor B):** **Yes, do it.** It's feasible for all 12 playgrounds, *easy* for ~8 of them (Python, R, JS, TS, SQLite, DuckDB, PostgreSQL, C#), and needs **no infrastructure changes**. The engines you already ship (`PyodideConsole`, WebR `Console`, Roslyn `ScriptState`, the SQL shells) were *built* for this.
- **Interactive program stdin (flavor A):** Possible, but gated on enabling cross-origin isolation and (for C/C++/Java) worker plumbing — a deliberate Phase-2 decision.
- **Emulated OS shell (flavor C):** Possible via CheerpX/WebVM, but it's a separate heavyweight product, not a per-playground feature.

Start with an xterm.js REPL panel for the async-capable runtimes; that captures most of the value at the lowest cost.

---

## 10. Sources

Engine / technique references (accessed 2026-06-16):

- Pyodide — interactive console: <https://pyodide.org/en/stable/usage/api/python-api/console.html>; stdin/streams (`setStdin`): <https://pyodide.org/en/stable/usage/streams.html>; xterm.js exploration: <https://github.com/pyodide/pyodide/issues/5760>
- WebR — `Console` class: <https://docs.r-wasm.org/webr/latest/api/js/classes/WebR.Console.html>; worker communication channels (SAB / ServiceWorker / PostMessage): <https://docs.r-wasm.org/webr/latest/communication.html>
- Roslyn C# scripting REPL (`ScriptState.ContinueWithAsync`): <https://github.com/dotnet/roslyn/blob/main/src/Scripting/CSharp/CSharpScript.cs>; C# Interactive shell in Blazor WASM + Roslyn: <https://www.strathweb.com/2019/06/building-a-c-interactive-shell-in-a-browser-with-blazor-webassembly-and-roslyn/>
- CheerpJ (Java 8/11/17 in browser): <https://labs.leaningtech.com/blog/cheerpj-4.3>, <https://cheerpj.com/docs/reference/cheerpjInit.html>
- CheerpX / WebVM (full Linux + bash in browser): <https://labs.leaningtech.com/blog/cx-10>, <https://labs.leaningtech.com/blog/webvm-20>, <https://github.com/leaningtech/webvm>
- php-wasm (stdin support, `php -a` caveats): <https://github.com/seanmorris/php-wasm>, <https://github.com/WordPress/wordpress-playground/issues/118>
- DuckDB-Wasm shell (xterm.js): <https://www.npmjs.com/package/@duckdb/duckdb-wasm-shell>, <https://shell.duckdb.org>
- SQLite CLI dot-commands: <https://sqlite.org/cli.html>; sqlite-wasm docs: <https://sqlite.org/wasm>
- Blocking WASM stdin via SharedArrayBuffer/Atomics + xterm.js: <https://github.com/katharosada/wasm-terminal>, <https://github.com/cryptool-org/wasm-webterm>, Wasmer xterm.js tutorial: <https://docs.wasmer.io/sdk/wasmer-js/tutorials/xterm-js/>
- COOP/COEP & cross-origin isolation for `SharedArrayBuffer`: <https://web.dev/articles/webassembly-threads>
- xterm.js: <https://xtermjs.org/>

Code references are to this repo at branch `claude/eloquent-rubin-bgaqes` (notably `app/_components/types.ts`, `app/_components/runtime/{browsercc-worker,cheerpj,dotnet,postgres,postgres-worker}.ts`, `next.config.ts`, `package.json`).
