# Intellisense for all runtime languages in CodeMirror — feasibility research

**Date:** 2026-07-02
**Scope:** Can we offer intellisense (context-aware autocomplete, and eventually hover/diagnostics) in the CodeMirror 6 editors for every language the site runs — Python, R, JavaScript, TypeScript, PHP, C, C++, Java, C#, and the three SQL engines — given that the runtimes are WASM-backed and everything must stay client-side? This report also accounts for **PR #550** (AI inline ghost-text autocomplete, pro-only), which is in flight on the same editor surfaces.
**Method:** static inspection of `app/_components/**` (editor mounts, runtime adapters, worker protocols), `script-runner-src/`, and PR #550's branch (`app/_components/ai/inlineCompletion.ts`); live web verification of every external package/project claim on 2026-07-02 (npm registry metadata, GitHub sources, Pyodide/webR CDN artifacts, live demos).

---

## 1. Executive summary

**Yes — intellisense is feasible for most of the stack, and the architecture is already half-built for it.** The `LanguageRuntime` interface declares an optional `complete?(line, column)` hook (`app/_components/types.ts:123`), the Playground already bridges it into `@codemirror/autocomplete` (`Playground.tsx:1348–1367`), and Python already implements it (stdlib `rlcompleter` against live worker globals). SQL already has best-in-class schema-aware completion in the three full SQL playgrounds. What's missing is: implementations for the other 8 imperative runtimes, richer completion metadata, and any completion at all on the inline learn surfaces (`CodeBlock`, `ChallengeCard`, `SqlCodeBlock`, `SqlChallengeCard`).

Feasibility is **not uniform** across languages. Two viable architectures emerged, plus a static-list floor:

- **Runtime introspection** — ask the live WASM interpreter what names exist (Python/jedi, R/`utils` completions, C#/Roslyn). Completions reflect what the user actually ran (real DataFrame columns, real variables). Fits the existing `complete?()` hook and worker protocol.
- **Editor-side static analysis** — a language service running in its own worker, independent of the run-loop (TypeScript language service; clangd for C/C++).
- **Static lists** — keyword/builtin/local-identifier completion with no semantic understanding. The ceiling for Java and PHP; the pragmatic interim for C/C++.

| Language | Verdict | Best path | Added download |
| --- | --- | --- | --- |
| SQL (SQLite/Postgres/DuckDB) | ✅ Done in playgrounds; **plumb into inline learn blocks** | Reuse existing `sqlCompletion.ts` engine + schema | ~0 |
| Python | ✅ Practical — upgrade in place | jedi inside the Pyodide worker (JupyterLite/marimo pattern) | ~1.7 MB wheels |
| R | ✅ Practical — nearly free | webR's own `utils:::.completeToken` (official webR REPL pattern, CM6) | ~0 |
| TypeScript / JavaScript | ✅ Practical | TS language service in a dedicated worker (`@typescript/vfs`) | ~2 MB gz worker + libs |
| C# | ⚠️ Heavy-but-possible | Roslyn `CompletionService` on the existing .NET WASM bundle (DotNetLab pattern) | Features/Workspaces DLLs (tens of MB, cached) |
| C / C++ | ⚠️ Heavy — defer semantic | clangd-in-browser exists but needs 25.7 MB WASM + 2 GB memory + **COOP/COEP** (site-wide conflict). Interim: static keywords/libc | n/a interim |
| Java | ❌ Not practical (semantic) | Static keywords + curated JDK API list + local identifiers | n/a |
| PHP | ❌ Not practical (semantic) | Static builtin-function list (phpstorm-stubs) + `$var` completion | n/a |

**PR #550 coexistence: designed-for, with one policy decision.** The ghost-text extension already stands down while the classic completion popup is open (`completionStatus(state) !== null` guard) and its Tab/Escape bindings fall through when no suggestion is showing. The two features are complementary (popup = precise symbol-level, local, free, instant; ghost text = multi-line generative, pro-gated, network). The one real decision: whether imperative-language popups stay on explicit triggers (`.` / Ctrl-Space, today's behavior — leaves typing-pauses free for ghost text) or move to `activateOnTyping` (richer popup UX, but starves ghost text for pro users). Recommendation: keep explicit triggers. See §5.

---

## 2. What exists today (codebase inventory)

### 2.1 The completion bridge that already works

- `LanguageRuntime.complete?(line: string, column: number): Promise<CompletionResult>` — `app/_components/types.ts:123`. `CompletionResult = { list: string[]; replaceLength: number }` (types.ts:111–117). **Flat strings only — no kind/detail/docs.**
- `Playground.tsx:1348–1367` maps it to a CM6 `CompletionSource` (everything becomes `type: "variable"`), registered via `autocompletion({ override: [...], activateOnTyping: false })` (1429–1433), auto-triggered on typing `.` (1389–1398) and Ctrl-Space (1450–1455).
- **Only Python implements it**: `runtime/python.tsx:742–755` posts `{kind:"complete", id, line, column}`; `runtime/pyodide-worker.ts:298–336` answers with Python stdlib `rlcompleter.Completer(globals())` — live-object introspection, so user-defined names and imported modules complete, but with no signatures/docs/types.

### 2.2 SQL: a bespoke engine, playgrounds only

- `app/_components/sql/sqlCompletion.ts` (2,467 lines): dialect profiles (sqlite/postgres/duckdb), tokenizer with comment/string masking, per-cursor keyword-context resolution, FK-derived join suggestions, CREATE TABLE column slots, CTE extraction.
- Wired with a **live schema** (rebuilt on DDL change, swapped via compartments) in the three full playgrounds: `sql/SqlPlayground.tsx:1417–1484`, `postgres/PostgresPlayground.tsx:1994–2042`, `duckdb/DuckDbPlayground.tsx:2113–2165`. Also feeds `@codemirror/lang-sql`'s `sql({ schema, dialect })`.
- **Inline learn SQL blocks get none of it**: `SqlCodeBlock.tsx:230` and `SqlChallengeCard.tsx:1218,1285` call bare `sql()` — keywords only, no schema, no custom engine.

### 2.3 Editor surfaces and threading (constraints)

- ~11 independent `new EditorView` mount sites; imperative surfaces share `cmExtensions.ts`, SQL surfaces share `sql/shared/editorSetup.ts`. Inline `CodeBlock.tsx` and `ChallengeCard.tsx` wire **no** completion today.
- Threading: Python, JS, TS, PHP, C, C++, SQLite, DuckDB, PGlite run in **Web Workers** with id-correlated postMessage protocols (the Python `complete` request already rides this). R runs in WebR's own internal worker. **Java (CheerpJ) and C# (.NET/Mono) run on the main thread.**
- **No SharedArrayBuffer / COOP / COEP anywhere** (`browsercc.ts:17` explicitly avoids SAB). No interrupts — a long-running `run()` blocks a `complete()` on the same worker until it finishes.
- 775 learn `.mdx` files across 27 courses — the inline surfaces are the biggest audience for this feature, and currently have the least.

---

## 3. Per-language feasibility (external landscape, verified 2026-07-02)

### 3.1 Python — practical; upgrade rlcompleter → jedi in place

- `jedi` 0.19.2 + `parso` 0.8.6 are **built-in Pyodide packages** (pinned in `pyodide-lock.json` of current Pyodide releases). Measured wheel weight: **~1.7 MB** total, loaded on demand via `pyodide.loadPackage("jedi")` — trivial next to the Pyodide runtime we already ship.
- This is the production path of **JupyterLite** (`pyodide-kernel` runs IPython's completer with `use_jedi = True`) and **marimo**'s WASM mode (`jedi.Script` in the kernel). Completions are runtime-aware: `jedi.Interpreter(code, [globals()])` completes against live objects (actual DataFrame columns), *and* returns kind/signature/docstring — everything needed to upgrade the UI beyond flat strings.
- Alternative considered and deprioritized: `browser-basedpyright` (real, actively published, ~20.5 MB unpacked, LSP-over-worker; maintainer warns it's only guaranteed in their own playground; Monaco-oriented). Worth revisiting later for static *diagnostics*, not needed for completion.
- **Integration**: swap/augment `_python_completions()` in `pyodide-worker.ts`; the message protocol, the `complete()` bridge, and the Playground wiring all stay. This is the lowest-risk, highest-visibility upgrade in the whole plan.

### 3.2 R — practical; the completion engine is already inside webR

- webR exposes R's own completion machinery: the **official webR REPL** (CodeMirror 6, `r-wasm/webr` → `src/repl/components/Editor.tsx`) calls `rc.settings(func=TRUE, fuzzy=TRUE)` then `utils:::.assignLinebuffer/.assignToken/.completeToken/.retrieveCompletions` from an async CM6 `CompletionSource`. Same pattern in `r-wasm/quarto-live`. It completes globals, package exports (`::`), and function arguments (`arg=`).
- **Zero added download** — it uses the R runtime we already boot. No npm wrapper exists; it's ~50 lines to copy into `runtime/r.tsx` behind the existing `complete?()` hook (note: R is 1-based indexing; the current `complete(line, column)` signature fits).

### 3.3 TypeScript / JavaScript — practical; run tsserver-in-a-worker

- The proven stack: `typescript` + `@typescript/vfs` (Microsoft-maintained, 1.6.4, Feb 2026) in a dedicated worker — `createVirtualTypeScriptEnvironment` over an in-memory FS; completions, hover, signature help, diagnostics all come from the real TS language service. What ships to the browser is `lib/typescript.js` (~9.1 MB raw, **~2 MB gz**) plus only the `lib.*.d.ts` files for our target (hundreds of KB–2 MB).
- `@valtown/codemirror-ts` is the turnkey CM6 bridge (autocomplete/hover/lints, worker variants via Comlink) — but it was **archived Sept 2025**. Use it as a reference implementation (MIT) or bridge via the official `@codemirror/lsp-client` / `codemirror-languageservice` instead.
- JavaScript benefits from the same service (`allowJs`/`checkJs` gives inference-based completion), and `@codemirror/lang-javascript` additionally ships `localCompletionSource` + snippet completions we currently don't enable.
- Note: the TS *runtime* worker (almostnode) is unrelated — the language service should be its own worker, immune to run-loop head-of-line blocking.

### 3.4 C# — heavy-but-possible, with an unusual head start

- Roslyn's `CompletionService` **does run on .NET WASM in the browser** — reference implementation **DotNetLab** (lab.razor.fyi; active, v1.23.4 June 2026) advertises completions/diagnostics/code-fixes fully client-side.
- Our head start: `script-runner-src/` already ships Roslyn (`Microsoft.CodeAnalysis.CSharp.Scripting` 4.14.0, `PublishTrimmed=false` — which sidesteps the MEF-trimming footgun) and **already fetches real metadata references for every BCL assembly** (`Runner.cs:130–173`, cached). The missing pieces are the `Microsoft.CodeAnalysis.CSharp.Features` + `Workspaces` assemblies (required or `CompletionService.GetService()` returns null — dotnet/roslyn#70404) and a `[JSExport] Complete(code, position)` that builds an `AdhocWorkspace` document over the same cached references.
- Costs/risks: Features+Workspaces add substantial IL to the boot bundle (measure; likely tens of MB uncompressed, mitigated by CDN/browser caching); Roslyn-on-WASM "happens to work" with no official support commitment; and **the .NET runtime is on the main thread**, so completion computation janks the UI — debounce hard, or move the whole runner into a worker (dotnet-wasm supports it; a bigger lift worth doing eventually anyway).

### 3.5 C / C++ — semantic intellisense possible but expensive; ship static now

- The only working artifact is **`guyutongxue/clangd-in-browser`** (clangd/LLVM 21 via Emscripten, LSP over postMessage, live demo verified): `clangd.wasm` **25.7 MB** as served, **`INITIAL_MEMORY=2GB`**, multithreaded → **requires SharedArrayBuffer → COOP/COEP (cross-origin isolation)**.
- That last requirement is a **site-wide constraint we currently don't meet and shouldn't adopt casually**: cross-origin isolation would force CORP/CORS auditing of every third-party asset (cdn-assets via jsDelivr, CheerpJ's CDN, remote datasets) and complicates OAuth popup flows (Google/GitHub sign-in). `browsercc.ts` deliberately avoids SAB today. Isolating just the C/C++ playground pages with per-route COOP/COEP headers is conceivable but fragile.
- Single-maintainer project, Monaco-oriented (CM6 wiring would be DIY via an LSP-over-worker client). **Verdict: defer clangd; ship a static tier** — C/C++ keywords, libc/STL common-symbol lists, plus lezer-based local-identifier completion. `@codemirror/lang-cpp` itself contains zero completion code.

### 3.6 Java — no semantic option exists

- No browser/WASM port of Eclipse JDT-LS exists. **JavaFiddle** — CheerpJ's own playground, by the company that makes our Java runtime — uses CodeMirror 6 with `@codemirror/lang-java` and ships **no completion at all**. That's the state of the art.
- Realistic ceiling: keywords + a curated static JDK API list (`java.util.*`, `String`/`Math`/`Scanner` members, etc. — hand-generated; no npm package exists) + local identifier completion. CheerpJ *could* run javac for on-demand error diagnostics (JavaFiddle proves compilation works), but that's diagnostics, not completion, and CheerpJ runs on the main thread.

### 3.7 PHP — closed doors; static lists only

- **Intelephense** is closed-source; the request to support browser/vscode-web has been open since 2021 with no movement. **phpactor** under php-wasm: zero prior art. WordPress Playground offers no PHP intellisense. `@codemirror/lang-php` is highlighting-only.
- Ceiling: a static `CompletionSource` over PHP builtins generated from **phpstorm-stubs** (Apache-2.0) with signatures in `detail`, plus `$variable`/local-identifier completion. Honest, cheap, useful for learners.

### 3.8 SQL — the cheapest win is plumbing, not research

- `@codemirror/lang-sql` 6.10.0's `schemaCompletionSource` is verified solid (nested schema→table→column, dot-context, quoting, `defaultTable`); no DuckDB dialect exists — Postgres dialect remains the standard stand-in (what the playgrounds already do).
- The gap is entirely internal: inline `SqlCodeBlock`/`SqlChallengeCard` don't receive a schema. The blocks already *have* the engine post-init — introspect after init SQL runs (same helpers the playgrounds use) and reconfigure the completion compartment. This reuses `sqlCompletion.ts` as-is.

### 3.9 Glue: LSP-over-worker for CM6 is a solved problem (when needed)

- **`@codemirror/lsp-client`** (official, 6.2.5 June 2026): minimal `Transport` interface; a worker postMessage transport is ~20 lines. Recommended default if/when we adopt LSP-shaped servers (TS service, later pyright/clangd).
- Maintained alternatives: `@marimo-team/codemirror-languageserver` (richest UX: hover, diagnostics, code actions), `codemirror-languageserver` (FurqanSoftware), `codemirror-languageservice` (transport-free adapter). All active in 2026.
- Note: **jedi/R/Roslyn paths need none of this** — they extend the existing bespoke `complete()` postMessage protocol, which is simpler and already proven by Python.

---

## 4. Cross-cutting design implications

1. **Widen `CompletionResult`.** The flat `{list: string[], replaceLength}` shape discards kind/signature/docs that jedi, R, Roslyn, and the TS service all provide. Extend to optionally carry CM6 `Completion` fields (`label`, `type`, `detail`, `info`, `apply`, `boost`) — additive, so the current Python/rlcompleter path keeps working during migration.
2. **`override:` suppresses free completions.** `autocompletion({override})` (Playground today) disables the languageData-registered sources that `@codemirror/lang-python` (keywords/builtins/locals) and `@codemirror/lang-javascript` (snippets/locals) already ship. Combining runtime completions *with* those sources means registering the runtime source via languageData (or merging sources) instead of `override` — also the natural "Tier 0" for surfaces with no runtime booted yet (see §6).
3. **Head-of-line blocking.** Completion shares each runtime worker's message loop; during a long `run()`, completions stall (no interrupt infra exists — no SAB/COOP/COEP). Acceptable for jedi/R (JupyterLite lives with it); the TS service should be a separate worker regardless; a "don't await completions while running" guard in the bridge avoids UX confusion.
4. **Completion before first run.** Runtimes boot lazily (registry + warmup). Until the runtime is up, runtime-introspection completion can't answer — static/languageData sources (point 2) are the graceful fallback tier on every surface.
5. **Main-thread runtimes (C#, Java).** Completion compute on the main thread janks typing. For C#: debounce + explicit-trigger-only initially; longer-term move the .NET runner to a worker. For Java it's moot (static lists are editor-side anyway).

---

## 5. Interplay with PR #550 (AI inline ghost text)

PR #550 adds `aiInlineCompletion()` (ghost text after a 600 ms pause, pro-gated via `/api/ai/complete`, Tab accepts / Escape dismisses / type-through) to **CodeBlock, ChallengeCard, and Playground** — exactly the surfaces runtime intellisense targets. SQL surfaces are untouched by it.

**It was built to coexist with popup completion:**
- The fetcher skips while the classic popup is open or pending: `if (completionStatus(state) !== null) return;`
- Its Tab/Escape keymap is `Prec.highest` but returns `false` when no ghost text is showing, falling through to `acceptCompletion`/indent/close bindings.

**Division of labor (mirrors VS Code IntelliSense + Copilot):** popup = symbol-precise, local/WASM, instant, free for everyone; ghost text = multi-token generative, network, pro-only. They strengthen each other — intellisense gives every user a baseline; ghost text stays the pro differentiator.

**The one policy decision — popup trigger mode.** Today's imperative-language config (`activateOnTyping: false`; popup only on `.` and Ctrl-Space) leaves typing pauses free for ghost text. If intellisense switched to `activateOnTyping: true` (as SQL playgrounds use), the popup would be open during most pauses and — via the `completionStatus` guard — largely starve ghost text for pro users. **Recommendation: keep explicit triggers on the imperative surfaces** (extend trigger characters per language: `.` `::` `->` for C/C++, `$` for PHP, `::`/`$` for R), and let ghost text own the pause. SQL surfaces keep `activateOnTyping` (no ghost text there; consistent with #550 leaving them out).

**Two minor sharp edges to handle in implementation:**
- A popup can open *over* visible ghost text (typing `.` that matches the ghost head keeps the ghost and triggers the popup). Cleanest fix: clear the ghost suggestion when `completionStatus` becomes non-null (one small transaction extender in `inlineCompletion.ts`, or in the intellisense wiring).
- Tab ordering must stay: ghost-accept (`Prec.highest`, falls through) → `acceptCompletion` (if we bind Tab for popups, as SQL does) → indent. Adding intellisense keymaps at default precedence preserves this.

**Sequencing:** #550 touches `Playground.tsx`, `CodeBlock.tsx`, `ChallengeCard.tsx` — the same files intellisense wiring edits. Land #550 first and build intellisense on top of it; both features appending extensions at every mount site is also a good forcing function to extract one shared "editor extension assembly" helper instead of an 11th copy of the list.

---

## 6. Recommended phasing

| Phase | Work | Languages | Effort / risk |
| --- | --- | --- | --- |
| **0 — free wins** | Enable `autocompletion()` + languageData sources (keywords/builtins/locals/snippets) on **all** surfaces incl. inline blocks; plumb live schema into `SqlCodeBlock`/`SqlChallengeCard` (reuse `sqlCompletion.ts`); widen `CompletionResult` type | All (baseline); SQL (full) | Small; pure plumbing |
| **1 — runtime introspection** | jedi in the Pyodide worker (replace rlcompleter, rich metadata); webR `.completeToken` in `runtime/r.tsx` | Python, R | Small–medium; proven patterns |
| **2 — TS language service** | `typescript` + `@typescript/vfs` in a dedicated worker; bridge via lsp-client or a thin custom source; `allowJs` for the JS surface | TypeScript, JavaScript | Medium |
| **3 — static tiers** | Generated builtin lists: PHP (phpstorm-stubs), Java (curated JDK API), C/C++ (keywords + libc/STL) + local-identifier completion | PHP, Java, C, C++ | Small each; content-generation work |
| **4 — Roslyn completions** | Add `Microsoft.CodeAnalysis.CSharp.Features`/Workspaces to ScriptRunner, `[JSExport]` completion API over the cached metadata references; measure bundle delta | C# | Medium–large; bundle size + main-thread jank to manage |
| **Deferred** | clangd-in-browser (blocked on COOP/COEP site-wide conflict); basedpyright (only if static type diagnostics become a goal); JDT-under-CheerpJ (no prior art) | C/C++, Python, Java | — |

Phases 0–1 cover the two languages that dominate the learn content (Python, SQL) plus R essentially for free, and they slot into the existing `complete?()` architecture without new infrastructure.

---

## 7. Key sources

Internal: `app/_components/types.ts`, `Playground.tsx`, `runtime/python.tsx`, `runtime/pyodide-worker.ts`, `sql/sqlCompletion.ts`, `sql/shared/editorSetup.ts`, `cmExtensions.ts`, `script-runner-src/Runner.cs`, PR #550 branch (`app/_components/ai/inlineCompletion.ts`, PR body).
External (verified 2026-07-02): Pyodide `pyodide-lock.json` (jedi/parso wheels); `jupyterlite/pyodide-kernel` and `marimo` completion sources; `r-wasm/webr` REPL `Editor.tsx` and `r-wasm/quarto-live`; npm `@typescript/vfs`, `@typescript/ata`, `typescript`, `@valtown/codemirror-ts` (archived 2025-09); `codemirror/lang-sql` `src/sql.ts`; `guyutongxue/clangd-in-browser` (build flags + live demo headers); `jjonescz/DotNetLab`; dotnet/roslyn#70404, #74555; bmewburn/vscode-intelephense#2022; `leaningtech` JavaFiddle `package.json`; npm `@codemirror/lsp-client`, `@marimo-team/codemirror-languageserver`, `codemirror-languageserver`, `codemirror-languageservice`.
